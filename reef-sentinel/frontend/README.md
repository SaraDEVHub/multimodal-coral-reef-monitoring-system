# Frontend — Reef Sentinel

Tableau de bord React connecté en direct au backend FastAPI d'inférence
multimodale (FTIR, stress environnemental HAB, imagerie sous-marine,
fusion décisionnelle).

## Stack

- React 19 + Vite
- Tailwind CSS v4 (tokens de design dans `src/index.css`)
- Axios (`src/api/client.js`)
- Recharts (graphiques)
- Framer Motion (animations)
- lucide-react (icônes)

## Installation

```bash
cd frontend
npm install
```

## Lancement en développement

Le backend doit être démarré au préalable sur `http://localhost:8000`
(voir `backend/README.md`). Le serveur de développement Vite proxifie
automatiquement `/api/*` vers `http://localhost:8000` (voir
`vite.config.js`).

```bash
npm run dev
```

L'application est disponible sur `http://localhost:5173`.

## Build de production

```bash
npm run build
npm run preview   # pour tester le build localement
```

En production, si le frontend et le backend ne sont pas servis depuis le
même domaine, définissez la variable d'environnement
`VITE_API_BASE_URL` (fichier `.env`) pour pointer vers l'URL publique du
backend, par exemple :

```
VITE_API_BASE_URL=https://api.mon-domaine.com/api
```

## Structure

```
src/
├── api/client.js              # Appels Axios vers les 4 endpoints du backend
├── context/RiskContext.jsx    # État partagé des 3 scores de risque (pour la fusion)
├── components/
│   ├── layout/                # Sidebar, TopBar (jauge "pouls du récif"), AppShell
│   └── shared/                # Card, ProbabilityGauge, UploadDropzone, RiskBadge, …
├── pages/
│   ├── Dashboard.jsx           # Vue d'ensemble du pipeline
│   ├── Module1Page.jsx         # FTIR — upload CSV, aperçu, graphique de progression
│   ├── Module2Page.jsx         # HAB — formulaire dynamique, visualisation animée
│   ├── Module3Page.jsx         # Imagerie — upload, Grad-CAM, probabilités par classe
│   ├── FusionPage.jsx          # Jauge circulaire, décision finale, contributions
│   └── ReportPage.jsx          # Rapport consolidé + export PDF/JSON
└── utils/                      # Formatage, seuils de risque, aperçu CSV léger
```
