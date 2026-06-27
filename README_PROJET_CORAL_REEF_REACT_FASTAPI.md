# Coral Reef Early Warning System

> **Système d’IA multimodal pour l’alerte précoce de la dégradation des récifs coralliens**

Ce dépôt présente une preuve de concept académique combinant données spectrales TGA-FTIR, paramètres environnementaux liés aux HAB et images sous-marines. Les trois modèles sont entraînés séparément, puis leurs sorties sont combinées par une fusion multimodale tardive.

> **Avertissement scientifique :** ce système ne remplace ni une expertise écologique, ni une analyse de laboratoire, ni une validation sur le terrain.

## Sommaire

- [Présentation du projet](#1-présentation-du-projet)
- [Objectif général](#2-objectif-général)
- [Sources des données](#3-sources-des-données)
- [Architecture générale](#4-architecture-générale)
- [Description des modules](#5-description-des-modules)
- [Fusion multimodale tardive](#6-fusion-multimodale-tardive)
- [Application web React + FastAPI](#8-application-web-react--fastapi)
- [Installation](#10-installation)
- [Limites et perspectives](#15-limites-du-projet)
- [Références et attribution](#17-références-et-attribution-des-données)

---

## 1. Présentation du projet

Ce projet propose un système expérimental d’aide à la surveillance des récifs coralliens à partir de trois sources de données différentes :

1. des signatures spectrales TGA-FTIR pour détecter des matériaux polymères associés aux microplastiques ;
2. des paramètres environnementaux tabulaires pour estimer la probabilité de présence d’une efflorescence algale nuisible, appelée HAB ;
3. des images sous-marines pour reconnaître les composantes visibles du récif et estimer un risque visuel de dégradation.

Les trois modèles sont entraînés séparément. Leurs sorties probabilistes sont ensuite combinées par une fusion multimodale tardive afin de produire un indice global expérimental de risque.

> Important : ce système est une preuve de concept académique. Il ne remplace pas une expertise écologique, une analyse de laboratoire ou une validation sur le terrain.

---

## 2. Objectif général

L’objectif est de construire une application complète capable de :

- analyser une signature spectrale et estimer la probabilité qu’elle corresponde à un polymère ;
- analyser des paramètres physico-chimiques et estimer la probabilité de présence d’une HAB ;
- analyser une ou plusieurs images sous-marines ;
- produire les probabilités de quatre classes visuelles ;
- générer une carte Grad-CAM pour expliquer la décision du modèle d’images ;
- calculer un risque visuel expérimental ;
- fusionner les trois scores ;
- afficher un état global : `Healthy`, `At risk` ou `Degraded`.

---

## 3. Sources des données

Les trois modules reposent sur des sources de données distinctes. Les liens, licences et conditions d’utilisation doivent être conservés lors de toute réutilisation du projet.

| Module | Dataset / source | Utilisation | Accès | Licence / remarque |
|---|---|---|---|---|
| Module 1 — TGA-FTIR | `TGA-FTIR library datasets.zip` | Signatures spectrales de polymères et de cellulose | Archive fournie avec le projet, datée du **11 février 2025** | Source locale ; aucun lien public supplémentaire n’a été fourni |
| Module 2 — HAB | **Generative Adversial Network (GAN) Synthesized Dataset on Harmful Algal Bloom (HAB)** | Variables environnementales et cible `HAB_Present` | https://data.mendeley.com/datasets/c3792mm5f6/1 | Version 1, DOI `10.17632/c3792mm5f6.1`, licence **CC BY 4.0** |
| Module 3 — Imagerie | **ReefNet-1.0** | Images et annotations pour la classification visuelle | https://huggingface.co/datasets/ReefNet/ReefNet-1.0 | Licence **CC BY-NC-SA 4.0** |

### 3.1 Dataset TGA-FTIR

```text
Nom de l’archive : TGA-FTIR library datasets.zip
Date indiquée dans les fichiers du projet : 2025-02-11
```

Les fichiers CSV contiennent notamment `Temp`, `Gram-Schmidt`, `TG`, `DTG` et les variables spectrales FTIR. Le projet applique une sélection spectrale, une normalisation SNV et une séparation par fichier expérimental afin de limiter la fuite de données.

### 3.2 Dataset HAB

```text
Mohan, D., Dayalani, A. & Gupta, L. (2025).
Generative Adversial Network (GAN) Synthesized Dataset on Harmful Algal Bloom (HAB).
Mendeley Data, Version 1.
DOI: 10.17632/c3792mm5f6.1
```

Le dataset source contient neuf paramètres marins. Dans ce projet, `Bloom_Index` est exclu des variables d’entrée, car il est trop directement lié à la cible et pourrait provoquer une fuite d’information.

### 3.3 Dataset ReefNet-1.0

```text
ReefNet / ReefNet-1.0
Hugging Face Datasets
Licence : CC BY-NC-SA 4.0
```

Les annotations détaillées sont regroupées dans quatre classes finales : `Live_coral`, `Algae`, `Substrate_degraded` et `Other_background`.

> **Remarque :** les datasets ne correspondent pas nécessairement au même site, à la même date ou au même prélèvement. La fusion finale doit donc être interprétée comme une expérimentation académique.

---

## 4. Architecture générale

L’application actuelle repose sur une architecture web séparant clairement l’interface utilisateur, l’API et les services d’inférence.

```text
Utilisateur
   │
   ▼
Frontend React + Vite
   │
   │  Requêtes HTTP avec Axios
   ▼
Backend FastAPI
   │
   ├── POST /api/predict-ftir
   ├── POST /api/predict-hab
   ├── POST /api/predict-image
   └── POST /api/fusion
          │
   ┌──────┼──────────────┐
   ▼      ▼              ▼
Module 1  Module 2       Module 3
XGBoost   XGBoost        MobileNetV2
   │      │              │
   ▼      ▼              ▼
P_micro   P_HAB          Probabilités visuelles
                         + Grad-CAM réel
   └──────┼──────────────┘
          ▼
Fusion multimodale tardive
          ▼
Risque global expérimental
          ▼
Healthy / At risk / Degraded
          ▼
Dashboard React + rapport exportable
```

### Technologies principales

| Couche | Technologies |
|---|---|
| Frontend | React, Vite, Tailwind CSS, Axios, Framer Motion, Recharts |
| Backend | FastAPI, Uvicorn, Pydantic, CORS |
| Machine Learning | XGBoost, Joblib, Scikit-learn, NumPy |
| Deep Learning | TensorFlow, Keras, MobileNetV2 |
| Traitement d’images | OpenCV, Pillow, Grad-CAM |
| Export | Rapport consolidé depuis l’interface React |

> Le dossier `legacy_streamlit/` contient uniquement l’ancien prototype conservé pour la traçabilité. L’application actuelle utilisée pour la démonstration repose sur **React pour le frontend** et **FastAPI pour le backend**.

---

# 5. Description des modules

## 5.1 Module 1 — Détection de signatures polymères

### Entrée

Un fichier CSV contenant une signature TGA-FTIR.

### Prétraitement

Le système :

- détecte les colonnes spectrales ;
- conserve les nombres d’onde utilisés pendant l’entraînement ;
- applique une normalisation SNV ;
- analyse les lignes spectrales du fichier ;
- calcule une probabilité moyenne pour le fichier complet.

### Modèle final

```text
XGBoost
```

Fichiers principaux :

```text
models/module1/module1_xgboost_final.joblib
models/module1/module1_xgboost_metadata.json
```

### Sortie

```text
Probabilité que la signature corresponde à un polymère
```

Exemple :

```text
Probabilité de polymère : 99,94 %
Décision : Polymère / microplastique détecté
```

### Interprétation correcte

Le module ne mesure pas :

- la quantité de microplastiques ;
- la concentration dans l’eau ;
- le nombre de particules ;
- la taille des particules.

Il indique seulement si la signature analysée ressemble à une signature polymère présente dans le jeu d’apprentissage.

La formulation scientifique recommandée est :

> Détection de signatures polymères associées aux microplastiques.

### Résultats

| Métrique | Résultat |
|---|---:|
| Accuracy moyenne | 96,88 % |
| Balanced accuracy | 86,27 % |
| Précision | 98,07 % |
| Rappel | 98,59 % |
| F1-score | 98,33 % |
| ROC-AUC | 93,14 % |

### Comparaison avec le 1D-CNN

Un réseau 1D-CNN a également été testé. Ses performances étaient très instables entre les deux plis d’évaluation :

```text
Pli 1 : 97,64 % d’accuracy
Pli 2 : 30,38 % d’accuracy
```

XGBoost a donc été retenu comme modèle final, car il généralise mieux avec le nombre limité de fichiers expérimentaux indépendants.

### Limite importante

La classe non plastique repose principalement sur deux fichiers de cellulose. Le modèle doit donc être considéré comme une preuve de concept et non comme un détecteur universel de tous les matériaux non plastiques.

---

## 5.2 Module 2 — Prédiction du risque HAB

### Entrée

Le modèle utilise huit variables environnementales :

- anomalie roulante de chlorophylle ;
- anomalie roulante de température ;
- chlorophylle de surface ;
- température de surface de la mer ;
- oxygène dissous ;
- pH ;
- azote total ;
- phosphore total.

### Modèle final

```text
XGBoost
```

Fichiers principaux :

```text
models/module2/module2_xgboost_final.joblib
models/module2/module2_metadata.json
```

Le modèle MLP est conservé comme expérience comparative :

```text
models/module2/module2_mlp_final.keras
models/module2/module2_scaler.joblib
```

### Sortie

```text
Probabilité de présence d’une efflorescence algale nuisible
```

Exemple :

```text
Probabilité de HAB : 4,56 %
Décision : Absence probable de HAB
```

### Interprétation correcte

Le module ne donne pas un pourcentage général de pollution.

Une sortie de 80 % signifie :

> Le modèle estime une probabilité de 80 % que la classe HAB soit présente pour les paramètres saisis.

Cela ne signifie pas :

> L’eau est polluée à 80 %.

### Résultats

| Modèle | Accuracy | Balanced Accuracy | Précision | Rappel | F1-score | ROC-AUC |
|---|---:|---:|---:|---:|---:|---:|
| MLP | 98,97 % | 98,35 % | 95,12 % | 97,50 % | 96,30 % | 99,98 % |
| XGBoost | 99,66 % | 99,80 % | 97,56 % | 100 % | 98,77 % | 100 % |

### Limite importante

Le dataset HAB utilisé est synthétique et généré artificiellement. Les résultats très élevés ne doivent donc pas être interprétés comme une validation définitive sur des données environnementales réelles.

---

## 5.3 Module 3 — Analyse visuelle du récif

### Entrée

Une ou plusieurs images sous-marines.

### Modèle final

```text
MobileNetV2 avec transfert d’apprentissage
```

Fichiers principaux :

```text
models/module3/module3_mobilenetv2_final.keras
models/module3/module3_metadata.json
```

### Classes prédites

Le modèle produit quatre probabilités :

```text
Live_coral
Algae
Substrate_degraded
Other_background
```

Signification :

- `Live_coral` : corail vivant ;
- `Algae` : algues ;
- `Substrate_degraded` : substrat dégradé, mort, blanchi, sédiment ou rubble ;
- `Other_background` : ombre, poisson, objet humain ou autre fond.

### Sortie de classification

Exemple :

```text
Other_background : 67,45 %
Substrate_degraded : 17,55 %
Algae : 10,60 %
Live_coral : 4,40 %
```

La classe dominante est celle ayant la probabilité la plus élevée.

### Résultats du modèle

| Métrique | Résultat |
|---|---:|
| Accuracy | 70,87 % |
| Balanced accuracy | 70,69 % |
| Macro précision | 69,00 % |
| Macro rappel | 70,69 % |
| Macro F1-score | 69,65 % |
| Test loss | 0,7226 |

Résultats par classe :

| Classe | Précision | Rappel | F1-score |
|---|---:|---:|---:|
| Live coral | 78,57 % | 75,00 % | 76,74 % |
| Algae | 71,93 % | 66,71 % | 69,22 % |
| Substrate degraded | 68,39 % | 71,64 % | 69,97 % |
| Other background | 57,10 % | 69,42 % | 62,66 % |

La confusion principale se situe entre les algues et le substrat dégradé.

---

## 5.4 Grad-CAM

Grad-CAM génère une carte de chaleur indiquant les zones ayant influencé la prédiction de MobileNetV2.

Interprétation :

- rouge et jaune : zones importantes ;
- vert : importance moyenne ;
- bleu : zones moins utilisées.

Grad-CAM permet d’expliquer visuellement la décision du modèle. Il ne garantit cependant pas qu’une prédiction est biologiquement correcte.

Fichiers générés :

```text
results/module3/explainability/gradcam_examples_grid.png
results/module3/explainability/gradcam_examples.csv
```

---

## 5.5 Calcul du risque visuel

La classe `Other_background` est exclue du calcul écologique, car elle ne décrit pas directement l’état du récif.

Le risque visuel est calculé par :

```text
Risque visuel =
(0,5 × P(Algae) + 1,0 × P(Substrate_degraded))
/
(P(Live_coral) + P(Algae) + P(Substrate_degraded))
```

Exemple :

```text
P(Live_coral) = 0,044
P(Algae) = 0,106
P(Substrate_degraded) = 0,1755
```

Le risque visuel obtenu est d’environ :

```text
70,2 %
```

État visuel :

```text
Degraded
```

Seuils :

```text
Healthy  : risque < 33 %
At risk  : 33 % ≤ risque < 66 %
Degraded : risque ≥ 66 %
```

Cet indice est expérimental et n’est pas directement fourni par le dataset.

---

# 6. Fusion multimodale tardive

## 6.1 Type de fusion

Le projet utilise une :

> Fusion multimodale tardive au niveau des scores.

Les trois modalités sont :

- spectrale ;
- environnementale tabulaire ;
- visuelle.

Les modèles restent indépendants. Aucun modèle n’est réentraîné pour la fusion.

La fusion utilise uniquement leurs sorties :

```text
Probabilité polymère
Probabilité HAB
Risque visuel
```

## 6.2 Formule

```text
Risque global =
0,35 × Risque microplastique
+
0,30 × Risque HAB
+
0,35 × Risque visuel
```

Poids :

| Module | Poids |
|---|---:|
| Microplastiques | 35 % |
| HAB | 30 % |
| État visuel | 35 % |

## 6.3 Justification des poids

Ces poids sont heuristiques. Ils ne sont ni appris automatiquement ni calculés à partir des métriques.

Ils ont été choisis pour :

- donner une importance comparable aux trois modalités ;
- accorder une légère priorité aux indicateurs spectraux et visuels ;
- garder une formule simple et compréhensible pour un PFE.

Ils ne doivent pas être présentés comme des poids optimaux.

Une calibration scientifique nécessiterait un dataset multimodal aligné contenant, pour un même récif et une même date :

- une mesure FTIR ;
- les paramètres environnementaux ;
- une image ;
- une évaluation écologique réelle.

## 6.4 Exemple de fusion

Scores :

```text
Microplastiques : 0,9994
HAB : 0,0456
État visuel : 0,702
```

Contributions :

```text
Microplastiques : 0,9994 × 0,35 = 0,3498
HAB : 0,0456 × 0,30 = 0,0137
État visuel : 0,702 × 0,35 = 0,2457
```

Somme :

```text
0,3498 + 0,0137 + 0,2457 = 0,6092
```

Résultat :

```text
Risque global = 60,9 %
État global expérimental = At risk
```

## 6.5 Sortie finale

```text
Healthy  : score < 33 %
At risk  : 33 % ≤ score < 66 %
Degraded : score ≥ 66 %
```

Le score global est un indice expérimental. Il ne représente pas un pourcentage réel de pollution mesuré sur le terrain.

---

# 7. Métriques et prédictions : différence importante

Les métriques suivantes :

```text
Accuracy
Balanced accuracy
Precision
Recall
F1-score
ROC-AUC
```

servent à évaluer les modèles sur leurs jeux de test.

Elles ne sont pas utilisées dans la fusion.

La fusion utilise uniquement les résultats du cas actuellement analysé :

```text
probabilité du fichier FTIR chargé
probabilité HAB des valeurs saisies
risque visuel de l’image importée
```

---

# 8. Application web React + FastAPI

L’application finale est composée d’un frontend React et d’un backend FastAPI connectés aux modèles entraînés.

## 8.1 Pages principales du frontend

### Vue d’ensemble

- présentation scientifique du système ;
- état des trois modules ;
- accès rapide aux analyses ;
- résumé du pipeline multimodal.

### Module FTIR

- import d’un fichier CSV spectral ;
- appel réel à l’API FastAPI ;
- affichage de la probabilité de signature polymère ;
- affichage de la décision et des informations du fichier analysé.

### Module HAB

- saisie dynamique des huit paramètres environnementaux ;
- appel du modèle XGBoost via l’API ;
- affichage de la probabilité HAB ;
- interprétation du niveau de risque.

### Module d’imagerie sous-marine

- import d’une image ;
- prédiction réelle avec MobileNetV2 ;
- affichage de l’image originale ;
- génération et affichage d’un Grad-CAM réel ;
- affichage des quatre probabilités de classes ;
- calcul du risque visuel expérimental.

### Fusion multimodale

- récupération des trois scores disponibles ;
- affichage des contributions pondérées ;
- calcul du score global ;
- affichage du statut `Healthy`, `At risk` ou `Degraded`.

### Rapport final

- synthèse des trois analyses ;
- interprétation des prédictions ;
- présentation de l’explicabilité ;
- export du rapport consolidé.

## 8.2 API FastAPI

| Méthode | Endpoint | Fonction |
|---|---|---|
| `GET` | `/health` | Vérifier que le backend fonctionne |
| `GET` | `/docs` | Documentation interactive Swagger |
| `POST` | `/api/predict-ftir` | Analyser un fichier TGA-FTIR |
| `POST` | `/api/predict-hab` | Prédire la probabilité de HAB |
| `POST` | `/api/predict-image` | Classifier une image et produire Grad-CAM |
| `POST` | `/api/fusion` | Calculer le risque global multimodal |

## 8.3 Communication frontend-backend

Le frontend utilise Axios pour communiquer avec FastAPI. En environnement local, l’URL de l’API peut être définie dans :

```text
frontend/.env
```

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

Le backend active CORS afin d’autoriser les requêtes provenant du frontend React.


---

# 9. Structure du projet

```text
coral_reef_ai_platform/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── routes/
│   │   ├── health.py
│   │   ├── ftir.py
│   │   ├── hab.py
│   │   ├── image.py
│   │   └── fusion.py
│   ├── services/
│   │   ├── model_registry.py
│   │   ├── ftir_service.py
│   │   ├── hab_service.py
│   │   ├── image_service.py
│   │   └── fusion_service.py
│   ├── models/
│   │   └── schemas.py
│   ├── utils/
│   ├── tests/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   │   ├── Overview.jsx
│   │   │   ├── FTIRPage.jsx
│   │   │   ├── HABPage.jsx
│   │   │   ├── ImagePage.jsx
│   │   │   ├── FusionPage.jsx
│   │   │   └── ReportPage.jsx
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
├── artifacts/
│   ├── models/
│   │   ├── module1/
│   │   ├── module2/
│   │   ├── module3/
│   │   └── fusion/
│   ├── evaluation/
│   └── results/
│
├── source_notebooks/
├── docs/
├── legacy_streamlit/      # Ancien prototype conservé uniquement comme archive
├── Dockerfile
├── render.yaml
├── docker-compose.yml
└── README.md
```


---

# 10. Installation

## 10.1 Prérequis

- Python 3 ;
- Node.js et npm ;
- Windows, Linux ou macOS ;
- espace disque suffisant pour TensorFlow et les modèles ;
- connexion Internet pour l’installation initiale des dépendances.

## 10.2 Installation du backend FastAPI

Ouvrir un terminal dans le dossier `backend` :

```powershell
cd backend
python -m venv .venv
```

Activation sous PowerShell :

```powershell
.\.venv\Scripts\Activate.ps1
```

Installation des dépendances :

```powershell
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt
```

## 10.3 Installation du frontend React

Ouvrir un second terminal dans le dossier `frontend` :

```powershell
cd frontend
npm install
```

Créer éventuellement un fichier `.env` :

```env
VITE_API_URL=http://127.0.0.1:8000/api
```


---

# 11. Lancement de l’application

Le backend et le frontend doivent fonctionner simultanément dans deux terminaux distincts.

## 11.1 Démarrer le backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Backend :

```text
http://127.0.0.1:8000
```

Documentation Swagger :

```text
http://127.0.0.1:8000/docs
```

## 11.2 Démarrer le frontend

Dans un second terminal :

```powershell
cd frontend
npm run dev
```

Interface React :

```text
http://127.0.0.1:5173
```

Ne pas fermer les deux terminaux pendant l’utilisation de l’application.


---

# 12. Ordre de test recommandé

1. tester le module microplastiques ;
2. tester le module HAB ;
3. tester le module d’images ;
4. ouvrir l’onglet de fusion ;
5. vérifier que les trois modules indiquent `Disponible : Oui` ;
6. cliquer sur `Calculer le risque global`.

---

# 13. Exemples de test

## Module 1

Tester :

- un fichier PE, PP, PET ou PVC ;
- un fichier de cellulose.

Résultat attendu :

```text
Polymère → probabilité élevée
Cellulose → probabilité faible
```

## Module 2

Prendre une ligne du dataset et recopier les huit variables dans l’application.

Comparer la décision avec :

```text
HAB_Present
```

## Module 3

Importer une image de test ReefNet.

Vérifier :

- la classe dominante ;
- les quatre probabilités ;
- la confiance ;
- le risque visuel ;
- Grad-CAM.

## Fusion

Après les trois analyses, calculer le risque global.

---

# 14. Fichiers nécessaires à l’application

## Modèles et métadonnées

```text
artifacts/models/module1/module1_xgboost_final.joblib
artifacts/models/module1/module1_xgboost_metadata.json
artifacts/models/module2/module2_xgboost_final.joblib
artifacts/models/module2/module2_metadata.json
artifacts/models/module3/module3_mobilenetv2_final.keras
artifacts/models/module3/module3_metadata.json
artifacts/models/fusion/fusion_metadata.json
```

## Backend

```text
backend/main.py
backend/routes/
backend/services/
backend/models/
backend/utils/
backend/requirements.txt
```

## Frontend

```text
frontend/src/
frontend/package.json
frontend/vite.config.js
frontend/.env
```

Le backend charge les modèles existants depuis `artifacts/models/`. Aucun réentraînement n’est effectué au démarrage de l’application.


---

# 15. Limites du projet

## Module 1

- nombre limité de fichiers expérimentaux ;
- classe non plastique peu diversifiée ;
- pas de mesure de concentration.

## Module 2

- dataset synthétique ;
- absence de validation sur plusieurs sites réels ;
- résultat HAB, et non pollution générale.

## Module 3

- images difficiles et parfois floues ;
- confusion entre algues et substrat dégradé ;
- classe `Other_background` très hétérogène ;
- état écologique dérivé par une règle.

## Fusion

- datasets non alignés ;
- poids heuristiques ;
- absence de vérité terrain commune ;
- score global non validé sur le terrain.

---

# 16. Perspectives

Les améliorations possibles sont :

- collecter un dataset multimodal aligné ;
- obtenir davantage d’échantillons non plastiques ;
- utiliser des données HAB réelles ;
- enrichir les images avec plusieurs récifs et plusieurs saisons ;
- calibrer les probabilités ;
- apprendre automatiquement les poids de fusion ;
- ajouter une localisation géographique ;
- développer une API REST ;
- déployer l’application en ligne ;
- intégrer l’avis de biologistes marins.

---

# 17. Références et attribution des données

## ReefNet-1.0

```text
ReefNet. ReefNet-1.0 [Dataset]. Hugging Face Datasets.
https://huggingface.co/datasets/ReefNet/ReefNet-1.0
Licence : CC BY-NC-SA 4.0
```

## Dataset HAB

```text
Mohan, D., Dayalani, A. & Gupta, L. (2025).
Generative Adversial Network (GAN) Synthesized Dataset on Harmful Algal Bloom (HAB).
Mendeley Data, Version 1.
https://doi.org/10.17632/c3792mm5f6.1
Licence : CC BY 4.0
```

## Dataset TGA-FTIR

```text
TGA-FTIR library datasets.zip
Archive de données spectrales fournie avec le projet.
Date indiquée : 2025-02-11.
```

> Toute réutilisation ou redistribution des données doit respecter les licences et les conditions d’utilisation propres à chaque source.

---

# 18. Conclusion

Le projet met en œuvre un système multimodal composé de trois modèles indépendants :

- XGBoost pour les signatures polymères ;
- XGBoost pour le risque HAB ;
- MobileNetV2 pour l’analyse visuelle.

Les probabilités sont combinées par une fusion multimodale tardive pondérée. L’architecture React + FastAPI fournit une interface web moderne pour exécuter les trois analyses, visualiser Grad-CAM et calculer un indice global expérimental.

Le système est fonctionnel pour une démonstration de PFE. Les résultats doivent néanmoins être interprétés avec prudence en raison des limites des datasets et de l’absence d’une validation multimodale de terrain.
