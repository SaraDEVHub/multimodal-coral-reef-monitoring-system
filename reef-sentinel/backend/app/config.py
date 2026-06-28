"""
Configuration centrale du backend.

Tous les chemins vers les modèles entraînés, scalers et fichiers de
métadonnées sont résolus ici à partir du dossier ``models/`` fourni avec le
projet académique original. Aucun modèle n'est réentraîné : ce module se
contente de localiser les artefacts déjà présents sur le disque.
"""

from __future__ import annotations

from pathlib import Path

# Racine du backend (dossier contenant ce fichier : app/config.py -> backend/)
BACKEND_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BACKEND_DIR / "models"

MODULE1_DIR = MODELS_DIR / "module1"
MODULE2_DIR = MODELS_DIR / "module2"
MODULE3_DIR = MODELS_DIR / "module3"
FUSION_DIR = MODELS_DIR / "fusion"

# --- Module 1 : FTIR / microplastiques -------------------------------------
MODULE1_XGBOOST_CANDIDATES = [
    MODULE1_DIR / "module1_xgboost_final.joblib",
    MODULE1_DIR / "module1_xgboost_comparison.joblib",
]
MODULE1_METADATA_CANDIDATES = [
    MODULE1_DIR / "module1_xgboost_metadata.json",
    MODULE1_DIR / "module1_metadata.json",
]
MODULE1_1DCNN_PATH = MODULE1_DIR / "module1_1dcnn_final.keras"
MODULE1_SCALER_PATH = MODULE1_DIR / "module1_scaler_final.joblib"

# --- Module 2 : stress environnemental / HAB --------------------------------
MODULE2_XGBOOST_CANDIDATES = [
    MODULE2_DIR / "module2_xgboost_final.joblib",
    MODULE2_DIR / "module2_xgboost_comparison.joblib",
]
MODULE2_MLP_PATH = MODULE2_DIR / "module2_mlp_final.keras"
MODULE2_SCALER_PATH = MODULE2_DIR / "module2_scaler.joblib"
MODULE2_METADATA_PATH = MODULE2_DIR / "module2_metadata.json"

# --- Module 3 : analyse d'image / MobileNetV2 -------------------------------
MODULE3_MODEL_PATH = MODULE3_DIR / "module3_mobilenetv2_final.keras"
MODULE3_METADATA_PATH = MODULE3_DIR / "module3_metadata.json"

# --- Fusion multimodale ------------------------------------------------------
FUSION_METADATA_PATH = FUSION_DIR / "fusion_metadata.json"

# CORS : origines autorisées pour le frontend React (Vite dev server + build)
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://localhost:3000",
]
