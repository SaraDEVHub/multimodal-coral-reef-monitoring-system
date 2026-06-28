"""
Point d'entrée du backend FastAPI.

Système d'IA multimodal pour l'alerte précoce de la dégradation des récifs
coralliens — Backend d'inférence connecté aux modèles entraînés du projet
académique original (aucun réentraînement, aucune prédiction simulée).
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .routers import fusion, module1, module2, module3
from .schemas import HealthResponse

app = FastAPI(
    title="Coral Reef Early Warning System API",
    description=(
        "API d'inférence multimodale (FTIR, stress environnemental HAB, "
        "imagerie sous-marine, fusion décisionnelle) pour l'alerte précoce "
        "de la dégradation des récifs coralliens."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(module1.router)
app.include_router(module2.router)
app.include_router(module3.router)
app.include_router(fusion.router)


@app.get("/api/health", response_model=HealthResponse, tags=["Système"])
async def health() -> HealthResponse:
    modules = {
        "module1_ftir": any(p.exists() for p in config.MODULE1_XGBOOST_CANDIDATES),
        "module2_hab": any(p.exists() for p in config.MODULE2_XGBOOST_CANDIDATES)
        or config.MODULE2_MLP_PATH.exists(),
        "module3_image": config.MODULE3_MODEL_PATH.exists(),
        "fusion": config.FUSION_METADATA_PATH.exists(),
    }
    status = "ok" if all(modules.values()) else "degraded"
    return HealthResponse(status=status, modules=modules)


@app.get("/", tags=["Système"])
async def root():
    return {
        "service": "Coral Reef Early Warning System API",
        "docs": "/docs",
        "health": "/api/health",
    }
