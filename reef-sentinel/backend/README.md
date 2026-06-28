# Backend — Coral Reef Early Warning System API

API FastAPI d'inférence multimodale, connectée directement aux modèles déjà
entraînés du projet académique original (`hind/`). **Aucun modèle n'est
réentraîné** : ce backend charge les artefacts existants (`.joblib`,
`.keras`, `.json`) et reproduit fidèlement la logique de prétraitement et de
fusion du prototype Streamlit fourni (`app/app.py`, `app/fusion_engine.py`).

## Structure

```
backend/
├── app/
│   ├── main.py              # Application FastAPI, CORS, routes
│   ├── config.py             # Résolution des chemins vers les modèles
│   ├── schemas.py             # Modèles Pydantic (requêtes/réponses)
│   ├── routers/
│   │   ├── module1.py        # POST /api/module1/predict
│   │   ├── module2.py        # GET /api/module2/features, POST /api/module2/predict
│   │   ├── module3.py        # POST /api/module3/predict
│   │   └── fusion.py         # POST /api/fusion/compute
│   └── services/
│       ├── module1_service.py   # FTIR : sélection spectrale + SNV + XGBoost
│       ├── module2_service.py   # HAB : XGBoost (ou MLP + scaler)
│       ├── module3_service.py   # Image : MobileNetV2 + Grad-CAM
│       └── fusion_service.py    # Fusion pondérée multimodale
├── models/                  # Modèles entraînés (copiés depuis hind/models)
└── requirements.txt
```

## Installation

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows : .venv\Scripts\activate
pip install -r requirements.txt
```

## Lancement

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

L'API est alors disponible sur `http://localhost:8000`, avec une
documentation interactive auto-générée sur `http://localhost:8000/docs`.

## Endpoints

| Méthode | Route                     | Description                                              |
|---------|---------------------------|------------------------------------------------------------|
| GET     | `/api/health`             | Vérifie que les 4 modules de modèles sont bien chargés    |
| POST    | `/api/module1/predict`    | Upload CSV spectral → probabilité de microplastique (P_micro) |
| GET     | `/api/module2/features`   | Liste dynamique des variables environnementales attendues |
| POST    | `/api/module2/predict`    | Valeurs HAB → probabilité d'efflorescence (P_HAB)          |
| POST    | `/api/module3/predict`    | Upload image → classe corail + Grad-CAM (P_image)          |
| POST    | `/api/fusion/compute`     | P_micro + P_HAB + P_image → score de risque global         |

## Modèles utilisés (détectés automatiquement)

- **Module 1** : `models/module1/module1_xgboost_final.joblib` +
  `module1_xgboost_metadata.json` (415 nombres d'onde cibles, seuil 0.5).
  Prétraitement : sélection des colonnes spectrales par nombre d'onde le
  plus proche, puis normalisation SNV (Standard Normal Variate) par ligne.
- **Module 2** : `models/module2/module2_xgboost_final.joblib` (préféré) ou
  repli sur `module2_mlp_final.keras` + `module2_scaler.joblib` si le
  XGBoost est absent. 8 variables d'entrée définies par
  `module2_metadata.json`.
- **Module 3** : `models/module3/module3_mobilenetv2_final.keras`, 4 classes
  (`Live_coral`, `Algae`, `Substrate_degraded`, `Other_background`),
  explicabilité Grad-CAM calculée sur la dernière couche convolutive du
  sous-modèle MobileNetV2.
- **Fusion** : pondération définie par `models/fusion/fusion_metadata.json`
  (35 % microplastiques, 30 % HAB, 35 % visuel), seuils 33 % / 66 %.

## Avertissement scientifique

Ce système reproduit un pipeline de recherche expérimental et n'est **pas**
un outil de diagnostic écologique validé sur le terrain (voir les champs
`limitation` / `warning` des fichiers de métadonnées de chaque module).
