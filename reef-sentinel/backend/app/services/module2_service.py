"""
Module 2 — Stress environnemental / efflorescence algale nuisible (HAB).

Reproduit la logique du prototype original :

    Entrées -> (Transform : standardisation si MLP) -> Modèle -> P_HAB

Le modèle XGBoost final est préféré (aucune mise à l'échelle nécessaire,
conformément au prototype d'origine) ; le MLP Keras + scaler sert de
solution de repli si le XGBoost est absent.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np

from .. import config

DEFAULT_FEATURES = [
    "Rolling_Chlorophyll_Anomaly",
    "Rolling_SST_Anomaly",
    "Surface_Chlorophyll",
    "Sea_Surface_Temperature",
    "Dissolved_Oxygen",
    "pH",
    "Total_Nitrogen",
    "Total_Phosphorus",
]

# Bornes / pas d'incrémentation indicatifs pour générer les champs du
# formulaire frontend dynamiquement (valeurs par défaut issues du prototype
# Streamlit original).
FEATURE_UI_HINTS = {
    "Rolling_Chlorophyll_Anomaly": {"label": "Anomalie roulante de chlorophylle", "unit": "mg/m³", "default": 0.0, "min": -10.0, "max": 10.0, "step": 0.01},
    "Rolling_SST_Anomaly": {"label": "Anomalie roulante de température de surface", "unit": "°C", "default": 0.0, "min": -5.0, "max": 5.0, "step": 0.01},
    "Surface_Chlorophyll": {"label": "Chlorophylle de surface", "unit": "mg/m³", "default": 3.0, "min": 0.0, "max": 50.0, "step": 0.01},
    "Sea_Surface_Temperature": {"label": "Température de surface de la mer", "unit": "°C", "default": 27.0, "min": 0.0, "max": 40.0, "step": 0.01},
    "Dissolved_Oxygen": {"label": "Oxygène dissous", "unit": "mg/L", "default": 6.0, "min": 0.0, "max": 20.0, "step": 0.01},
    "pH": {"label": "pH de l'eau", "unit": None, "default": 8.1, "min": 0.0, "max": 14.0, "step": 0.01},
    "Total_Nitrogen": {"label": "Azote total", "unit": "mg/L", "default": 1.0, "min": 0.0, "max": 20.0, "step": 0.01},
    "Total_Phosphorus": {"label": "Phosphore total", "unit": "mg/L", "default": 0.1, "min": 0.0, "max": 5.0, "step": 0.001},
}


class Module2Error(Exception):
    """Erreur de validation ou de traitement spécifique au module 2."""


def _read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_resources():
    metadata = _read_json(config.MODULE2_METADATA_PATH)

    xgb_path = next((p for p in config.MODULE2_XGBOOST_CANDIDATES if p.exists()), None)
    if xgb_path is not None:
        return {
            "type": "xgboost",
            "model": joblib.load(xgb_path),
            "scaler": None,
            "metadata": metadata,
            "model_path": xgb_path,
        }

    if config.MODULE2_MLP_PATH.exists() and config.MODULE2_SCALER_PATH.exists():
        import tensorflow as tf  # imported lazily to keep module1-only requests fast

        return {
            "type": "mlp",
            "model": tf.keras.models.load_model(config.MODULE2_MLP_PATH, compile=False),
            "scaler": joblib.load(config.MODULE2_SCALER_PATH),
            "metadata": metadata,
            "model_path": config.MODULE2_MLP_PATH,
        }

    raise Module2Error("Aucun modèle du module 2 trouvé dans models/module2.")


def get_feature_schema() -> dict:
    resources = load_resources()
    metadata = resources["metadata"]
    features = metadata.get("features", DEFAULT_FEATURES)

    schema = []
    for name in features:
        hint = FEATURE_UI_HINTS.get(name, {"label": name.replace("_", " "), "unit": None, "default": 0.0, "min": None, "max": None, "step": 0.1})
        schema.append({
            "name": name,
            "label": hint["label"],
            "unit": hint.get("unit"),
            "default": hint["default"],
            "min": hint.get("min"),
            "max": hint.get("max"),
            "step": hint.get("step"),
        })

    return {
        "features": schema,
        "model_used": resources["model_path"].name,
        "task": metadata.get("task", "HAB_binary_prediction"),
    }


def run_prediction(values: dict[str, float]) -> dict:
    resources = load_resources()
    metadata = resources["metadata"]
    features = metadata.get("features", DEFAULT_FEATURES)

    missing = [name for name in features if name not in values]
    if missing:
        raise Module2Error(f"Variables manquantes : {', '.join(missing)}")

    row = np.asarray([[float(values[name]) for name in features]], dtype=np.float32)

    if resources["type"] == "xgboost":
        probability = float(resources["model"].predict_proba(row)[0, 1])
    else:
        scaled = resources["scaler"].transform(row)
        probability = float(resources["model"].predict(scaled, verbose=0).ravel()[0])

    threshold = float(metadata.get("threshold", 0.5))
    status = "Présence probable" if probability >= threshold else "Absence probable"

    if probability >= threshold:
        interpretation = (
            f"Les paramètres environnementaux indiquent une probabilité de {probability:.1%} "
            "de présence d'une efflorescence algale nuisible (HAB). Les anomalies de "
            "température et/ou de chlorophylle sont compatibles avec un épisode de stress "
            "environnemental actif."
        )
    else:
        interpretation = (
            f"Les paramètres environnementaux indiquent une probabilité de {probability:.1%} "
            "de présence d'une HAB, ce qui reste sous le seuil d'alerte. Les conditions "
            "physico-chimiques observées sont globalement stables."
        )

    return {
        "probability": probability,
        "status": status,
        "interpretation": interpretation,
        "model_used": resources["model_path"].name,
    }
