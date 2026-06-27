from __future__ import annotations

import io
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import streamlit as st
from PIL import Image
import tensorflow as tf
import matplotlib.pyplot as plt

from fusion_engine import (
    compute_global_risk,
    ecological_status,
    visual_risk_from_probabilities,
)


APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parent

MODULE1_MODELS = PROJECT_ROOT / "models" / "module1"
MODULE2_MODELS = PROJECT_ROOT / "models" / "module2"
MODULE3_MODELS = PROJECT_ROOT / "models" / "module3"

CLASS_NAMES = [
    "Live_coral",
    "Algae",
    "Substrate_degraded",
    "Other_background",
]


st.set_page_config(
    page_title="Coral Reef Early Warning System",
    page_icon="🪸",
    layout="wide",
)


def read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


@st.cache_resource
def load_module1_resources():
    model_candidates = [
        MODULE1_MODELS / "module1_xgboost_final.joblib",
        MODULE1_MODELS / "module1_xgboost_comparison.joblib",
    ]
    model_path = next((path for path in model_candidates if path.exists()), None)
    if model_path is None:
        raise FileNotFoundError(
            "Modèle du module 1 introuvable. "
            "Fichier attendu : models/module1/module1_xgboost_final.joblib"
        )

    metadata_candidates = [
        MODULE1_MODELS / "module1_xgboost_metadata.json",
        MODULE1_MODELS / "module1_metadata.json",
    ]
    metadata_path = next((path for path in metadata_candidates if path.exists()), None)
    metadata = read_json(metadata_path) if metadata_path else {}

    return joblib.load(model_path), metadata, model_path


@st.cache_resource
def load_module2_resources():
    xgb_candidates = [
        MODULE2_MODELS / "module2_xgboost_final.joblib",
        MODULE2_MODELS / "module2_xgboost_comparison.joblib",
    ]
    xgb_path = next((path for path in xgb_candidates if path.exists()), None)

    metadata = read_json(MODULE2_MODELS / "module2_metadata.json")

    if xgb_path is not None:
        return {
            "type": "xgboost",
            "model": joblib.load(xgb_path),
            "metadata": metadata,
            "path": xgb_path,
        }

    mlp_path = MODULE2_MODELS / "module2_mlp_final.keras"
    scaler_path = MODULE2_MODELS / "module2_scaler.joblib"

    if mlp_path.exists() and scaler_path.exists():
        return {
            "type": "mlp",
            "model": tf.keras.models.load_model(mlp_path, compile=False),
            "scaler": joblib.load(scaler_path),
            "metadata": metadata,
            "path": mlp_path,
        }

    raise FileNotFoundError(
        "Aucun modèle du module 2 trouvé dans models/module2."
    )


@st.cache_resource
def load_module3_model():
    model_path = MODULE3_MODELS / "module3_mobilenetv2_final.keras"
    if not model_path.exists():
        raise FileNotFoundError(
            "Modèle du module 3 introuvable : "
            "models/module3/module3_mobilenetv2_final.keras"
        )
    model = tf.keras.models.load_model(model_path, compile=False)
    return model, model_path


def snv_transform(values: np.ndarray) -> np.ndarray:
    means = values.mean(axis=1, keepdims=True)
    stds = values.std(axis=1, keepdims=True)
    return ((values - means) / (stds + 1e-8)).astype(np.float32)


def select_spectral_columns(df: pd.DataFrame, target_wavenumbers: list[float]) -> list[str]:
    numeric_columns = []
    numeric_values = []

    for column in df.columns:
        try:
            value = float(str(column).strip())
        except ValueError:
            continue

        if 700 <= value <= 4200:
            numeric_columns.append(column)
            numeric_values.append(value)

    if not numeric_columns:
        raise ValueError("Aucune colonne spectrale numérique n'a été détectée.")

    numeric_values_array = np.asarray(numeric_values, dtype=float)
    selected_columns = []

    for target in target_wavenumbers:
        index = int(np.argmin(np.abs(numeric_values_array - float(target))))
        difference = abs(numeric_values_array[index] - float(target))

        if difference > 0.05:
            raise ValueError(
                f"Colonne spectrale proche de {target:.4f} cm⁻¹ introuvable."
            )

        selected_columns.append(numeric_columns[index])

    return selected_columns


def predict_module1(uploaded_file) -> tuple[float, int]:
    model, metadata, _ = load_module1_resources()
    df = pd.read_csv(uploaded_file)

    target_wavenumbers = metadata.get("wavenumbers")
    if not target_wavenumbers:
        spectral_columns = []
        for column in df.columns:
            try:
                value = float(str(column).strip())
            except ValueError:
                continue
            if 700 <= value <= 4200:
                spectral_columns.append(column)

        target_columns = spectral_columns[::4]
        if len(target_columns) != getattr(model, "n_features_in_", len(target_columns)):
            raise ValueError(
                "Les métadonnées du module 1 sont absentes et le nombre "
                "de variables spectrales ne correspond pas au modèle."
            )
    else:
        target_columns = select_spectral_columns(df, target_wavenumbers)

    spectra = (
        df[target_columns]
        .apply(pd.to_numeric, errors="coerce")
        .to_numpy(dtype=np.float32)
    )
    spectra = spectra[np.isfinite(spectra).all(axis=1)]

    if len(spectra) == 0:
        raise ValueError("Aucune ligne spectrale valide dans le fichier.")

    spectra = snv_transform(spectra)
    row_probabilities = model.predict_proba(spectra)[:, 1]
    mean_probability = float(np.mean(row_probabilities))
    return mean_probability, len(row_probabilities)


def predict_module2(values: dict[str, float]) -> float:
    resources = load_module2_resources()
    metadata = resources.get("metadata", {})

    default_features = [
        "Rolling_Chlorophyll_Anomaly",
        "Rolling_SST_Anomaly",
        "Surface_Chlorophyll",
        "Sea_Surface_Temperature",
        "Dissolved_Oxygen",
        "pH",
        "Total_Nitrogen",
        "Total_Phosphorus",
    ]
    features = metadata.get("features", default_features)

    row = np.asarray([[float(values[name]) for name in features]], dtype=np.float32)

    if resources["type"] == "xgboost":
        return float(resources["model"].predict_proba(row)[0, 1])

    scaled = resources["scaler"].transform(row)
    return float(resources["model"].predict(scaled, verbose=0).ravel()[0])


def prepare_image(image: Image.Image) -> tuple[np.ndarray, np.ndarray]:
    resized = image.convert("RGB").resize((224, 224))
    original_array = np.asarray(resized, dtype=np.uint8)
    tensor = np.expand_dims(original_array.astype(np.float32), axis=0)
    return original_array, tensor


def predict_module3_image(image: Image.Image) -> np.ndarray:
    model, _ = load_module3_model()
    _, tensor = prepare_image(image)
    probabilities = model.predict(tensor, verbose=0)[0]
    return probabilities.astype(float)


def build_gradcam_components(model: tf.keras.Model):
    base_model = None
    for layer in model.layers:
        if isinstance(layer, tf.keras.Model) and "mobilenet" in layer.name.lower():
            base_model = layer
            break

    if base_model is None:
        raise RuntimeError("Le sous-modèle MobileNetV2 est introuvable.")

    last_conv_layer = None
    for layer in reversed(base_model.layers):
        try:
            if len(layer.output.shape) == 4:
                last_conv_layer = layer
                break
        except Exception:
            continue

    if last_conv_layer is None:
        raise RuntimeError("Dernière couche convolutive introuvable.")

    last_conv_model = tf.keras.Model(
        base_model.inputs,
        [last_conv_layer.output, base_model.output],
    )
    base_index = model.layers.index(base_model)
    head_layers = model.layers[base_index + 1:]

    return last_conv_model, head_layers


def make_gradcam_overlay(image: Image.Image) -> Image.Image:
    model, _ = load_module3_model()
    original_array, tensor = prepare_image(image)
    last_conv_model, head_layers = build_gradcam_components(model)

    preprocessed = tf.keras.applications.mobilenet_v2.preprocess_input(
        tf.cast(tensor, tf.float32)
    )

    with tf.GradientTape() as tape:
        conv_outputs, base_features = last_conv_model(preprocessed, training=False)
        tape.watch(conv_outputs)

        output = base_features
        for layer in head_layers:
            try:
                output = layer(output, training=False)
            except TypeError:
                output = layer(output)

        predicted_index = int(tf.argmax(output[0]))
        class_score = output[:, predicted_index]

    gradients = tape.gradient(class_score, conv_outputs)
    pooled_gradients = tf.reduce_mean(gradients, axis=(0, 1, 2))
    conv_outputs = conv_outputs[0]

    heatmap = tf.reduce_sum(conv_outputs * pooled_gradients, axis=-1)
    heatmap = tf.maximum(heatmap, 0)
    heatmap = heatmap / (tf.reduce_max(heatmap) + tf.keras.backend.epsilon())
    heatmap = heatmap.numpy()

    heatmap_image = Image.fromarray(np.uint8(255 * heatmap)).resize((224, 224))
    heatmap_array = np.asarray(heatmap_image, dtype=np.float32) / 255.0
    colored_heatmap = plt.get_cmap("jet")(heatmap_array)[..., :3]

    original_float = original_array.astype(np.float32) / 255.0
    overlay = np.clip(0.60 * original_float + 0.40 * colored_heatmap, 0, 1)
    return Image.fromarray(np.uint8(255 * overlay))


def show_probability_table(probabilities: np.ndarray):
    table = pd.DataFrame({
        "Classe": CLASS_NAMES,
        "Probabilité": probabilities,
    }).sort_values("Probabilité", ascending=False)
    st.dataframe(table, hide_index=True, use_container_width=True)


for key in ["microplastic_risk", "hab_risk", "visual_risk"]:
    st.session_state.setdefault(key, None)


st.title("🪸 Coral Reef Early Warning System")
st.caption(
    "Système expérimental combinant signatures TGA-FTIR, paramètres HAB "
    "et images sous-marines."
)

tab1, tab2, tab3, tab4 = st.tabs([
    "1. Microplastiques",
    "2. Pollution / HAB",
    "3. État visuel du récif",
    "4. Fusion globale",
])


with tab1:
    st.subheader("Détection d’un polymère par signature TGA-FTIR")
    uploaded_spectrum = st.file_uploader(
        "Importer un fichier CSV spectral",
        type=["csv"],
        key="module1_file",
    )

    if uploaded_spectrum is not None and st.button(
        "Analyser la signature",
        key="module1_button",
    ):
        try:
            probability, n_rows = predict_module1(uploaded_spectrum)
            st.session_state.microplastic_risk = probability

            col1, col2 = st.columns(2)
            col1.metric("Probabilité de polymère", f"{probability:.1%}")
            col2.metric("Lignes analysées", str(n_rows))

            if probability >= 0.5:
                st.error("Polymère / microplastique détecté")
            else:
                st.success("Échantillon classé non plastique")

            st.progress(probability)
        except Exception as exc:
            st.exception(exc)


with tab2:
    st.subheader("Prédiction de la présence d’une efflorescence HAB")

    col1, col2 = st.columns(2)

    with col1:
        rolling_chl = st.number_input(
            "Anomalie roulante de chlorophylle",
            value=0.0,
            format="%.4f",
        )
        rolling_sst = st.number_input(
            "Anomalie roulante de température",
            value=0.0,
            format="%.4f",
        )
        surface_chl = st.number_input(
            "Chlorophylle de surface",
            value=3.0,
            min_value=0.0,
            format="%.4f",
        )
        sea_temp = st.number_input(
            "Température de surface de la mer (°C)",
            value=27.0,
            format="%.3f",
        )

    with col2:
        dissolved_oxygen = st.number_input(
            "Oxygène dissous",
            value=6.0,
            min_value=0.0,
            format="%.4f",
        )
        ph_value = st.number_input(
            "pH",
            value=8.1,
            min_value=0.0,
            format="%.3f",
        )
        total_nitrogen = st.number_input(
            "Azote total",
            value=1.0,
            min_value=0.0,
            format="%.4f",
        )
        total_phosphorus = st.number_input(
            "Phosphore total",
            value=0.1,
            min_value=0.0,
            format="%.4f",
        )

    hab_values = {
        "Rolling_Chlorophyll_Anomaly": rolling_chl,
        "Rolling_SST_Anomaly": rolling_sst,
        "Surface_Chlorophyll": surface_chl,
        "Sea_Surface_Temperature": sea_temp,
        "Dissolved_Oxygen": dissolved_oxygen,
        "pH": ph_value,
        "Total_Nitrogen": total_nitrogen,
        "Total_Phosphorus": total_phosphorus,
    }

    if st.button("Prédire le risque HAB", key="module2_button"):
        try:
            probability = predict_module2(hab_values)
            st.session_state.hab_risk = probability

            st.metric("Probabilité de HAB", f"{probability:.1%}")
            st.progress(probability)

            if probability >= 0.5:
                st.error("Présence probable d’une efflorescence HAB")
            else:
                st.success("Absence probable de HAB")
        except Exception as exc:
            st.exception(exc)


with tab3:
    st.subheader("Classification de patches sous-marins avec MobileNetV2")
    uploaded_images = st.file_uploader(
        "Importer une ou plusieurs images",
        type=["png", "jpg", "jpeg"],
        accept_multiple_files=True,
        key="module3_files",
    )

    if uploaded_images and st.button(
        "Analyser les images",
        key="module3_button",
    ):
        try:
            records = []
            probability_rows = []

            for uploaded_image in uploaded_images:
                image = Image.open(uploaded_image)
                probabilities = predict_module3_image(image)
                probability_rows.append(probabilities)

                predicted_index = int(np.argmax(probabilities))
                records.append({
                    "Image": uploaded_image.name,
                    "Classe prédite": CLASS_NAMES[predicted_index],
                    "Confiance": float(probabilities[predicted_index]),
                })

            mean_probabilities = np.mean(np.vstack(probability_rows), axis=0)
            visual_risk = visual_risk_from_probabilities(
                mean_probabilities[0],
                mean_probabilities[1],
                mean_probabilities[2],
            )
            st.session_state.visual_risk = visual_risk

            st.dataframe(
                pd.DataFrame(records),
                hide_index=True,
                use_container_width=True,
            )

            col1, col2 = st.columns(2)
            col1.metric(
                "Classe dominante",
                CLASS_NAMES[int(np.argmax(mean_probabilities))],
            )
            col2.metric("Risque visuel", f"{visual_risk:.1%}")

            show_probability_table(mean_probabilities)

            first_image = Image.open(uploaded_images[0])
            gradcam_image = make_gradcam_overlay(first_image)

            image_col1, image_col2 = st.columns(2)
            image_col1.image(first_image, caption="Image originale")
            image_col2.image(gradcam_image, caption="Explication Grad-CAM")

            st.info(
                f"État visuel expérimental : {ecological_status(visual_risk)}"
            )
        except Exception as exc:
            st.exception(exc)


with tab4:
    st.subheader("Fusion expérimentale des trois risques")

    risk_values = {
        "Microplastiques": st.session_state.microplastic_risk,
        "HAB": st.session_state.hab_risk,
        "État visuel": st.session_state.visual_risk,
    }

    status_table = pd.DataFrame({
        "Module": list(risk_values.keys()),
        "Risque": [
            value if value is not None else np.nan
            for value in risk_values.values()
        ],
        "Disponible": [
            "Oui" if value is not None else "Non"
            for value in risk_values.values()
        ],
    })
    st.dataframe(status_table, hide_index=True, use_container_width=True)

    missing_modules = [
        name for name, value in risk_values.items() if value is None
    ]

    if missing_modules:
        st.warning(
            "Analyse les modules suivants avant la fusion : "
            + ", ".join(missing_modules)
        )
    elif st.button("Calculer le risque global", key="fusion_button"):
        fusion = compute_global_risk(
            st.session_state.microplastic_risk,
            st.session_state.hab_risk,
            st.session_state.visual_risk,
        )

        st.metric("Risque global", f"{fusion.global_risk:.1%}")
        st.progress(fusion.global_risk)

        if fusion.status == "Healthy":
            st.success("État global expérimental : Healthy")
        elif fusion.status == "At risk":
            st.warning("État global expérimental : At risk")
        else:
            st.error("État global expérimental : Degraded")

        contributions = pd.DataFrame({
            "Composante": ["Microplastiques", "HAB", "État visuel"],
            "Contribution": [
                fusion.microplastic_contribution,
                fusion.hab_contribution,
                fusion.visual_contribution,
            ],
        })
        st.dataframe(contributions, hide_index=True, use_container_width=True)


st.divider()
st.caption(
    "Avertissement : cette application est une preuve de concept. "
    "Le score global et l’état écologique sont fondés sur des règles "
    "expérimentales et ne remplacent pas une validation écologique de terrain."
)