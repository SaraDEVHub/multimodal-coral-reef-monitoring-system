"""
Module 1 — Analyse FTIR / détection de microplastiques.

Logique de prétraitement et d'inférence reprise à l'identique du prototype
Streamlit fourni dans le projet original (``app/app.py``) :

    CSV -> sélection des colonnes spectrales -> SNV (Standard Normal
    Variate) par ligne -> XGBoost -> probabilité moyenne sur le fichier.

Le modèle XGBoost final (``module1_xgboost_final.joblib``) et ses
métadonnées (nombres d'onde cibles) sont chargés depuis le dossier
``models/module1`` sans aucun réentraînement.
"""

from __future__ import annotations

import io
import json
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from .. import config

MIN_WAVENUMBER = 700.0
MAX_WAVENUMBER = 4200.0
MATCH_TOLERANCE = 0.05


class Module1Error(Exception):
    """Erreur de validation ou de traitement spécifique au module 1."""


def _read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_resources():
    model_path = next((p for p in config.MODULE1_XGBOOST_CANDIDATES if p.exists()), None)
    if model_path is None:
        raise Module1Error(
            "Modèle du module 1 introuvable (models/module1/module1_xgboost_final.joblib)."
        )

    metadata_path = next((p for p in config.MODULE1_METADATA_CANDIDATES if p.exists()), None)
    metadata = _read_json(metadata_path) if metadata_path else {}

    model = joblib.load(model_path)
    return {
        "model": model,
        "metadata": metadata,
        "model_path": model_path,
    }


def snv_transform(values: np.ndarray) -> np.ndarray:
    """Standard Normal Variate : centrage-réduction ligne par ligne."""
    means = values.mean(axis=1, keepdims=True)
    stds = values.std(axis=1, keepdims=True)
    return ((values - means) / (stds + 1e-8)).astype(np.float32)


def select_spectral_columns(df: pd.DataFrame, target_wavenumbers: list[float]) -> list[str]:
    """Associe chaque nombre d'onde attendu par le modèle à la colonne du CSV
    importé la plus proche (tolérance de 0.05 cm⁻¹), exactement comme dans
    le prototype original."""
    numeric_columns: list[str] = []
    numeric_values: list[float] = []

    for column in df.columns:
        try:
            value = float(str(column).strip())
        except ValueError:
            continue
        if MIN_WAVENUMBER <= value <= MAX_WAVENUMBER:
            numeric_columns.append(column)
            numeric_values.append(value)

    if not numeric_columns:
        raise Module1Error(
            "Aucune colonne spectrale numérique détectée dans le fichier "
            f"(attendu : en-têtes numériques entre {MIN_WAVENUMBER:.0f} et {MAX_WAVENUMBER:.0f} cm⁻¹)."
        )

    numeric_values_array = np.asarray(numeric_values, dtype=float)
    selected_columns: list[str] = []

    for target in target_wavenumbers:
        index = int(np.argmin(np.abs(numeric_values_array - float(target))))
        difference = abs(numeric_values_array[index] - float(target))
        if difference > MATCH_TOLERANCE:
            raise Module1Error(
                f"Colonne spectrale proche de {target:.4f} cm⁻¹ introuvable dans le fichier importé."
            )
        selected_columns.append(numeric_columns[index])

    return selected_columns


def run_prediction(file_bytes: bytes) -> dict:
    resources = load_resources()
    model = resources["model"]
    metadata = resources["metadata"]

    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as exc:  # noqa: BLE001
        raise Module1Error(f"Impossible de lire le fichier CSV : {exc}") from exc

    if df.empty:
        raise Module1Error("Le fichier CSV importé est vide.")

    target_wavenumbers = metadata.get("wavenumbers")

    if not target_wavenumbers:
        spectral_columns = []
        for column in df.columns:
            try:
                value = float(str(column).strip())
            except ValueError:
                continue
            if MIN_WAVENUMBER <= value <= MAX_WAVENUMBER:
                spectral_columns.append(column)
        target_columns = spectral_columns[:: 4]
        expected = getattr(model, "n_features_in_", len(target_columns))
        if len(target_columns) != expected:
            raise Module1Error(
                "Les métadonnées du module 1 sont absentes et le nombre de "
                "variables spectrales ne correspond pas au modèle entraîné."
            )
    else:
        target_columns = select_spectral_columns(df, target_wavenumbers)

    numeric = df[target_columns].apply(pd.to_numeric, errors="coerce").to_numpy(dtype=np.float32)
    valid_mask = np.isfinite(numeric).all(axis=1)
    spectra = numeric[valid_mask]

    n_rejected = int((~valid_mask).sum())

    if len(spectra) == 0:
        raise Module1Error(
            "Aucune ligne spectrale valide (valeurs manquantes ou non numériques) dans le fichier."
        )

    spectra = snv_transform(spectra)
    row_probabilities = model.predict_proba(spectra)[:, 1]
    mean_probability = float(np.mean(row_probabilities))

    threshold = float(metadata.get("threshold", 0.5))
    positive_class = metadata.get("positive_class", "polymer_plastic")
    negative_class = metadata.get("negative_class", "cellulose_non_plastique")
    predicted_label = positive_class if mean_probability >= threshold else negative_class

    confidence = float(abs(mean_probability - 0.5) * 2)

    if mean_probability >= threshold:
        interpretation = (
            f"L'échantillon est classé comme polymère plastique avec une probabilité "
            f"moyenne de {mean_probability:.1%} sur {len(spectra)} spectre(s) analysé(s). "
            "La signature FTIR détectée est cohérente avec une contamination par microplastiques."
        )
    else:
        interpretation = (
            f"L'échantillon est classé comme non plastique (probabilité de polymère : "
            f"{mean_probability:.1%}) sur {len(spectra)} spectre(s) analysé(s). "
            "Aucune signature de microplastique dominante n'a été détectée."
        )

    if n_rejected:
        interpretation += f" {n_rejected} ligne(s) ont été ignorées (valeurs manquantes ou non numériques)."

    return {
        "probability": mean_probability,
        "confidence": confidence,
        "n_rows_analyzed": int(len(spectra)),
        "n_rows_rejected": n_rejected,
        "predicted_label": predicted_label,
        "interpretation": interpretation,
        "row_probabilities": [float(p) for p in row_probabilities],
        "model_used": resources["model_path"].name,
        "wavenumbers_matched": len(target_columns),
    }
