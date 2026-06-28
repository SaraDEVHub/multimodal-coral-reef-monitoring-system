"""
Module 3 — Analyse d'images sous-marines (MobileNetV2) + explicabilité Grad-CAM.

Reprend la logique du prototype original :

    Image -> redimensionnement 224x224 -> MobileNetV2 (prétraitement intégré
    au graphe du modèle) -> probabilités par classe -> Grad-CAM sur la
    dernière couche convolutive du sous-modèle MobileNetV2.

Classes (ordre fixé par ``module3_metadata.json``) :
    0 Live_coral, 1 Algae, 2 Substrate_degraded, 3 Other_background
"""

from __future__ import annotations

import base64
import io
import json
from functools import lru_cache
from pathlib import Path

import cv2
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

from .. import config

IMAGE_SIZE = (224, 224)


class Module3Error(Exception):
    """Erreur de validation ou de traitement spécifique au module 3."""


def _read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_model_and_metadata():
    import tensorflow as tf

    if not config.MODULE3_MODEL_PATH.exists():
        raise Module3Error(
            "Modèle du module 3 introuvable : models/module3/module3_mobilenetv2_final.keras"
        )

    model = tf.keras.models.load_model(config.MODULE3_MODEL_PATH, compile=False)
    metadata = _read_json(config.MODULE3_METADATA_PATH)
    class_names = metadata.get(
        "class_names", ["Live_coral", "Algae", "Substrate_degraded", "Other_background"]
    )
    return model, metadata, class_names


def _prepare_image(image: Image.Image) -> tuple[np.ndarray, "object"]:
    import tensorflow as tf

    resized = image.convert("RGB").resize(IMAGE_SIZE)
    original_array = np.asarray(resized, dtype=np.uint8)
    tensor = np.expand_dims(original_array.astype(np.float32), axis=0)
    return original_array, tf.convert_to_tensor(tensor)


def _build_gradcam_components(model):
    import tensorflow as tf

    base_model = None
    for layer in model.layers:
        if isinstance(layer, tf.keras.Model) and "mobilenet" in layer.name.lower():
            base_model = layer
            break

    if base_model is None:
        raise Module3Error("Le sous-modèle MobileNetV2 est introuvable dans le graphe.")

    last_conv_layer = None
    for layer in reversed(base_model.layers):
        try:
            if len(layer.output.shape) == 4:
                last_conv_layer = layer
                break
        except Exception:  # noqa: BLE001
            continue

    if last_conv_layer is None:
        raise Module3Error("Dernière couche convolutive introuvable.")

    last_conv_model = tf.keras.Model(
        base_model.inputs,
        [last_conv_layer.output, base_model.output],
    )
    base_index = model.layers.index(base_model)
    head_layers = model.layers[base_index + 1 :]

    return last_conv_model, head_layers


def _make_gradcam_overlay(model, image: Image.Image) -> Image.Image:
    import tensorflow as tf

    original_array, tensor = _prepare_image(image)
    last_conv_model, head_layers = _build_gradcam_components(model)

    preprocessed = tf.keras.applications.mobilenet_v2.preprocess_input(tf.cast(tensor, tf.float32))

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

    heatmap_image = Image.fromarray(np.uint8(255 * heatmap)).resize(IMAGE_SIZE)
    heatmap_array = np.asarray(heatmap_image, dtype=np.float32) / 255.0
    colored_heatmap = plt.get_cmap("jet")(heatmap_array)[..., :3]

    original_float = original_array.astype(np.float32) / 255.0
    overlay = np.clip(0.60 * original_float + 0.40 * colored_heatmap, 0, 1)
    return Image.fromarray(np.uint8(255 * overlay))


def _visual_risk_from_probabilities(live: float, algae: float, degraded: float) -> float:
    """Risque visuel = (0.5*algues + 1.0*substrat dégradé) / (corail vivant + algues + substrat dégradé),
    Other_background étant exclu — formule identique à fusion_engine.py."""
    live = max(float(live), 0.0)
    algae = max(float(algae), 0.0)
    degraded = max(float(degraded), 0.0)

    denominator = live + algae + degraded
    if denominator <= 1e-12:
        return 0.5
    return min(max((0.5 * algae + degraded) / denominator, 0.0), 1.0)


def _ecological_status(risk: float) -> str:
    risk = min(max(float(risk), 0.0), 1.0)
    if risk < 0.33:
        return "Healthy"
    if risk < 0.66:
        return "At risk"
    return "Degraded"


def _image_to_base64(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def run_prediction(file_bytes: bytes) -> dict:
    model, metadata, class_names = load_model_and_metadata()

    try:
        image = Image.open(io.BytesIO(file_bytes))
        image.load()
    except Exception:  # noqa: BLE001
        # Repli OpenCV : certains exports d'images sous-marines (TIFF/JFIF
        # exotiques, EXIF corrompu) sont mal gérés par PIL mais se décodent
        # correctement avec OpenCV. On reconvertit ensuite en image PIL RGB
        # pour réutiliser exactement le même pipeline de prétraitement.
        array = np.frombuffer(file_bytes, dtype=np.uint8)
        decoded = cv2.imdecode(array, cv2.IMREAD_COLOR)
        if decoded is None:
            raise Module3Error("Impossible de décoder le fichier image (formats acceptés : PNG, JPG, JPEG).")
        decoded_rgb = cv2.cvtColor(decoded, cv2.COLOR_BGR2RGB)
        image = Image.fromarray(decoded_rgb)

    original_array, tensor = _prepare_image(image)
    probabilities = model.predict(tensor, verbose=0)[0].astype(float)

    predicted_index = int(np.argmax(probabilities))
    predicted_class = class_names[predicted_index]
    confidence = float(probabilities[predicted_index])

    index_map = {name: i for i, name in enumerate(class_names)}
    live_p = float(probabilities[index_map.get("Live_coral", 0)])
    algae_p = float(probabilities[index_map.get("Algae", 1)])
    degraded_p = float(probabilities[index_map.get("Substrate_degraded", 2)])

    visual_risk = _visual_risk_from_probabilities(live_p, algae_p, degraded_p)
    eco_status = _ecological_status(visual_risk)

    gradcam_overlay = _make_gradcam_overlay(model, image)
    resized_original = Image.fromarray(original_array)

    class_probabilities = [
        {"class_name": name, "probability": float(probabilities[i])}
        for i, name in enumerate(class_names)
    ]
    class_probabilities.sort(key=lambda item: item["probability"], reverse=True)

    interpretation = (
        f"Le patch d'image est classé « {predicted_class} » avec une confiance de "
        f"{confidence:.1%}. Le risque visuel calculé (hors arrière-plan) est de "
        f"{visual_risk:.1%}, correspondant à un état écologique expérimental « {eco_status} »."
    )

    return {
        "probability": visual_risk,
        "predicted_class": predicted_class,
        "confidence": confidence,
        "class_probabilities": class_probabilities,
        "ecological_status": eco_status,
        "gradcam_image_base64": _image_to_base64(gradcam_overlay),
        "original_image_base64": _image_to_base64(resized_original),
        "interpretation": interpretation,
        "model_used": config.MODULE3_MODEL_PATH.name,
    }
