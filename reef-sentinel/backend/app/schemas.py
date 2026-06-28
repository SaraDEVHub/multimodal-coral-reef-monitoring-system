"""Modèles Pydantic décrivant les requêtes et réponses de l'API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Module 1 — FTIR / microplastiques
# ---------------------------------------------------------------------------
class Module1Result(BaseModel):
    probability: float = Field(..., description="P_micro — probabilité moyenne de polymère plastique")
    confidence: float = Field(..., description="Confiance du modèle (distance à 0.5)")
    n_rows_analyzed: int
    n_rows_rejected: int
    predicted_label: Literal["polymer_plastic", "cellulose_non_plastique"]
    interpretation: str
    row_probabilities: list[float] = Field(default_factory=list, description="Probabilités par ligne (pour le graphique de progression)")
    model_used: str
    wavenumbers_matched: int


# ---------------------------------------------------------------------------
# Module 2 — Stress environnemental / HAB
# ---------------------------------------------------------------------------
class Module2Feature(BaseModel):
    name: str
    label: str
    unit: str | None = None
    default: float
    min: float | None = None
    max: float | None = None
    step: float | None = None


class Module2FeaturesResponse(BaseModel):
    features: list[Module2Feature]
    model_used: str
    task: str


class Module2Request(BaseModel):
    values: dict[str, float]


class Module2Result(BaseModel):
    probability: float = Field(..., description="P_HAB — probabilité d'efflorescence algale nuisible")
    status: Literal["Absence probable", "Présence probable"]
    interpretation: str
    model_used: str


# ---------------------------------------------------------------------------
# Module 3 — Analyse d'image sous-marine
# ---------------------------------------------------------------------------
class ClassProbability(BaseModel):
    class_name: str
    probability: float


class Module3Result(BaseModel):
    probability: float = Field(..., description="P_image — risque visuel calculé à partir des classes")
    predicted_class: str
    confidence: float
    class_probabilities: list[ClassProbability]
    ecological_status: str
    gradcam_image_base64: str
    original_image_base64: str
    interpretation: str
    model_used: str


# ---------------------------------------------------------------------------
# Module 4 — Fusion multimodale
# ---------------------------------------------------------------------------
class FusionRequest(BaseModel):
    p_micro: float = Field(..., ge=0.0, le=1.0)
    p_hab: float = Field(..., ge=0.0, le=1.0)
    p_image: float = Field(..., ge=0.0, le=1.0)


class FusionContribution(BaseModel):
    module: str
    risk: float
    weight: float
    contribution: float


class FusionResult(BaseModel):
    global_risk: float
    status: Literal["Stable", "Warning", "Critical"]
    interpretation: str
    contributions: list[FusionContribution]
    weights: dict[str, float]
    thresholds: dict[str, str]


class HealthResponse(BaseModel):
    status: str
    modules: dict[str, bool]
