from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FusionResult:
    global_risk: float
    status: str
    microplastic_contribution: float
    hab_contribution: float
    visual_contribution: float


def ecological_status(risk: float) -> str:
    """Convertit un score compris entre 0 et 1 en état écologique expérimental."""
    risk = min(max(float(risk), 0.0), 1.0)

    if risk < 0.33:
        return "Healthy"
    if risk < 0.66:
        return "At risk"
    return "Degraded"


def compute_global_risk(
    microplastic_risk: float,
    hab_risk: float,
    visual_risk: float,
    microplastic_weight: float = 0.35,
    hab_weight: float = 0.30,
    visual_weight: float = 0.35,
) -> FusionResult:
    """
    Fusion expérimentale fondée sur des règles.

    Les trois risques et les poids doivent être positifs. Les poids sont
    automatiquement normalisés afin que leur somme soit égale à 1.
    """
    risks = [
        min(max(float(microplastic_risk), 0.0), 1.0),
        min(max(float(hab_risk), 0.0), 1.0),
        min(max(float(visual_risk), 0.0), 1.0),
    ]
    weights = [
        max(float(microplastic_weight), 0.0),
        max(float(hab_weight), 0.0),
        max(float(visual_weight), 0.0),
    ]

    weight_sum = sum(weights)
    if weight_sum <= 0:
        raise ValueError("La somme des poids doit être strictement positive.")

    weights = [weight / weight_sum for weight in weights]
    contributions = [risk * weight for risk, weight in zip(risks, weights)]
    global_risk = min(max(sum(contributions), 0.0), 1.0)

    return FusionResult(
        global_risk=global_risk,
        status=ecological_status(global_risk),
        microplastic_contribution=contributions[0],
        hab_contribution=contributions[1],
        visual_contribution=contributions[2],
    )


def visual_risk_from_probabilities(
    live_probability: float,
    algae_probability: float,
    degraded_probability: float,
) -> float:
    """
    Calcule le risque visuel en excluant Other_background.

    Risque = (0.5 × algues + 1.0 × substrat dégradé)
             / (corail vivant + algues + substrat dégradé)
    """
    live = max(float(live_probability), 0.0)
    algae = max(float(algae_probability), 0.0)
    degraded = max(float(degraded_probability), 0.0)

    denominator = live + algae + degraded
    if denominator <= 1e-12:
        return 0.5

    return min(max((0.5 * algae + degraded) / denominator, 0.0), 1.0)