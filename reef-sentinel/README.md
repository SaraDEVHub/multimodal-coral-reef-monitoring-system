# Reef Sentinel — Système d'IA multimodal pour l'alerte précoce de la dégradation des récifs coralliens

Plateforme scientifique complète (backend FastAPI + frontend React)
connectée **directement aux modèles déjà entraînés** du projet académique
original. Aucun modèle n'a été réentraîné et aucune prédiction n'est
simulée : chaque score affiché provient d'une inférence réelle exécutée
sur les artefacts (`.joblib`, `.keras`) et métadonnées (`.json`) fournis.

```
reef-sentinel/
├── backend/     # API FastAPI d'inférence (voir backend/README.md)
└── frontend/    # Tableau de bord React (voir frontend/README.md)
```

## Modèles détectés et reconnectés automatiquement

| Module | Modèle | Artefacts utilisés |
|---|---|---|
| 01 — FTIR / microplastiques | XGBoost | `module1_xgboost_final.joblib`, `module1_xgboost_metadata.json` (415 nombres d'onde, seuil 0.5) |
| 02 — Stress environnemental (HAB) | XGBoost (repli MLP + scaler) | `module2_xgboost_final.joblib`, `module2_metadata.json` (8 variables) |
| 03 — Imagerie sous-marine | MobileNetV2 (Keras) | `module3_mobilenetv2_final.keras`, `module3_metadata.json` (4 classes, accuracy test ≈ 70.9 %) |
| 04 — Fusion multimodale | Règle pondérée | `fusion_metadata.json` (35 % FTIR / 30 % HAB / 35 % imagerie, seuils 33 %/66 %) |

La logique de prétraitement (sélection spectrale, normalisation SNV,
Grad-CAM) reproduit fidèlement le prototype Streamlit fourni dans le
projet original (`app/app.py`, `app/fusion_engine.py`).

## Démarrage rapide

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Vérifiez que les 4 modules sont bien chargés :
`curl http://localhost:8000/api/health`

### 2. Frontend

Dans un second terminal :

```bash
cd frontend
npm install
npm run dev
```

Ouvrez `http://localhost:5173`. Le serveur de développement Vite proxifie
automatiquement les appels `/api/*` vers le backend FastAPI sur le port
8000 — aucune configuration CORS supplémentaire n'est nécessaire en local.

### 3. Parcours applicatif

1. **Module 01** : importez un CSV de spectres FTIR (en-têtes numériques =
   nombres d'onde en cm⁻¹) → probabilité de microplastique (P_micro).
2. **Module 02** : renseignez les 8 paramètres environnementaux →
   probabilité de HAB (P_HAB).
3. **Module 03** : importez une image sous-marine → classe corail,
   confiance, carte Grad-CAM (P_image).
4. **Module 04** : la fusion se calcule automatiquement dès que les trois
   scores sont disponibles → risque écologique global (Stable / Warning /
   Critical).
5. **Rapport final** : synthèse exportable en PDF (impression) ou JSON.

## Build de production

```bash
# Backend (exemple avec gunicorn/uvicorn workers)
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend && npm run build   # génère frontend/dist (à servir via un CDN/nginx)
```

Pensez à définir `VITE_API_BASE_URL` côté frontend et à ajouter l'origine
de production à `ALLOWED_ORIGINS` dans `backend/app/config.py`.

## Avertissement scientifique

Ce système reproduit un pipeline de recherche expérimental fondé sur des
jeux de données limités et reformatés à des fins de preuve de concept
(voir les champs `warning` / `limitation` des fichiers de métadonnées).
Les scores produits sont des indicateurs de recherche et **ne constituent
pas un diagnostic écologique validé sur le terrain**.
