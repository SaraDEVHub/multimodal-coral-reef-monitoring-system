"""
Module 4 — Fusion multimodale au niveau des décisions.

Reprend à l'identique la logique de ``app/fusion_engine.py`` du prototype
original, avec les poids et seuils déclarés dans
``models/fusion/fusion_metadata.json`` :

    P_micro, P_HAB, P_image -> moyenne pondérée -> Global Risk Score

Les statuts "Healthy / At risk / Degraded" du prototype original sont
exposés au frontend sous les libellés demandés par le cahier des charges
("Stable / Warning / Critical"), sans modifier les seuils numériques ni la
formule de fusion.
"""

from __future__ import annotations

import json
from functools import lru_cache

from .. import config

STATUS_LABELS = {
    "Healthy": "Stable",
    "At risk": "Warning",
    "Degraded": "Critical",
}


def _read_json(path):
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_metadata() -> dict:
    metadata = _read_json(config.FUSION_METADATA_PATH)
    if not metadata:
        metadata = {
            "weights": {"microplastic": 0.35, "hab": 0.30, "visual": 0.35},
            "thresholds": {
                "Healthy": "[0.00, 0.33)",
                "At risk": "[0.33, 0.66)",
                "Degraded": "[0.66, 1.00]",
            },
        }
    return metadata


def _ecological_status(risk: float) -> str:
    risk = min(max(float(risk), 0.0), 1.0)
    if risk < 0.33:
        return "Healthy"
    if risk < 0.66:
        return "At risk"
    return "Degraded"


def compute_global_risk(p_micro: float, p_hab: float, p_image: float) -> dict:
    metadata = load_metadata()
    weights_cfg = metadata.get("weights", {"microplastic": 0.35, "hab": 0.30, "visual": 0.35})

    risks = {
        "Microplastiques (FTIR)": min(max(float(p_micro), 0.0), 1.0),
        "Stress environnemental (HAB)": min(max(float(p_hab), 0.0), 1.0),
        "État visuel (image)": min(max(float(p_image), 0.0), 1.0),
    }
    raw_weights = {
        "Microplastiques (FTIR)": max(float(weights_cfg.get("microplastic", 0.35)), 0.0),
        "Stress environnemental (HAB)": max(float(weights_cfg.get("hab", 0.30)), 0.0),
        "État visuel (image)": max(float(weights_cfg.get("visual", 0.35)), 0.0),
    }

    weight_sum = sum(raw_weights.values())
    if weight_sum <= 0:
        raise ValueError("La somme des poids de fusion doit être strictement positive.")

    normalized_weights = {k: v / weight_sum for k, v in raw_weights.items()}
    contributions = {k: risks[k] * normalized_weights[k] for k in risks}
    global_risk = min(max(sum(contributions.values()), 0.0), 1.0)

    internal_status = _ecological_status(global_risk)
    status = STATUS_LABELS[internal_status]

    interpretations = {
        "Stable": (
            f"Le score de risque global ({global_risk:.1%}) indique un récif globalement "
            "stable. Les trois indicateurs multimodaux (FTIR, HAB, imagerie) ne signalent "
            "pas de dégradation significative à ce stade."
        ),
        "Warning": (
            f"Le score de risque global ({global_risk:.1%}) place le récif en zone "
            "d'avertissement. Au moins un des trois indicateurs multimodaux suggère un "
            "stress émergent qui justifie une surveillance renforcée."
        ),
        "Critical": (
            f"Le score de risque global ({global_risk:.1%}) indique un état critique. "
            "La combinaison des signaux FTIR, HAB et imagerie est cohérente avec une "
            "dégradation active du récif corallien nécessitant une intervention prioritaire."
        ),
    }

    contributions_list = [
        {
            "module": name,
            "risk": risks[name],
            "weight": normalized_weights[name],
            "contribution": contributions[name],
        }
        for name in risks
    ]

    return {
        "global_risk": global_risk,
        "status": status,
        "interpretation": interpretations[status],
        "contributions": contributions_list,
        "weights": {
            "Microplastiques (FTIR)": normalized_weights["Microplastiques (FTIR)"],
            "Stress environnemental (HAB)": normalized_weights["Stress environnemental (HAB)"],
            "État visuel (image)": normalized_weights["État visuel (image)"],
        },
        "thresholds": {
            "Stable": "[0%, 33%)",
            "Warning": "[33%, 66%)",
            "Critical": "[66%, 100%]",
        },
    }
