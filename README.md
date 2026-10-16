# Fish&Chill – Full Stack + IA

Plateforme de suivi des captures, navires, filets et opérations de pêche (CFTO – Concarneau).

## Stack

| Couche    | Techno                              |
|-----------|-------------------------------------|
| Frontend  | Vue.js 3 + Vite + Leaflet + vue-i18n |
| Backend   | Node.js + Express + JWT             |
| Database  | MongoDB                             |
| Messaging | MQTT (Mosquitto)                    |
| IA        | Locale (gratuite) + Groq optionnel  |
| Docker    | Compose                             |

## IA intégrée (gratuite)

### Ce qui marche sans aucune clé API
- **Assistant conversationnel** (bouton 🤖) : navigation dans l’app, résumé flotte, filets à risque, carburant bas
- **Bandeau Insights** sur la carte : synthèse automatique, alertes usure, fuel, tendance captures 7j

### Mode LLM gratuit (optionnel)
1. Créer un compte sur [console.groq.com](https://console.groq.com) (free tier)
2. Ajouter `GROQ_API_KEY=gsk_...` dans `backend/.env`
3. L’assistant utilise alors **Llama 3.1** pour des réponses plus naturelles, toujours enrichies des données live

## Carte

- Fonds de carte **sans clé API** : OpenStreetMap (plan / sombre), Esri Satellite, + balisage maritime OpenSeaMap.
- Si un fond échoue (clé exigée, quota, réseau), la carte bascule automatiquement sur le suivant.
- Fournisseur personnalisé (optionnel) : `VITE_MAP_TILE_URL` et `VITE_MAP_TILE_ATTRIBUTION` dans l'environnement du frontend.
- Dans Docker, le proxy Vite cible `http://backend:3000` (`VITE_PROXY_TARGET`). En local hors Docker, la valeur par défaut est `http://localhost:3000`.

## Rôles

| Rôle         | Droits                                      |
|--------------|---------------------------------------------|
| **admin**    | Accès total                                 |
| **terre**    | Lecture + écriture opérationnelle           |
| **embarque** | Saisie captures/filets, données de son bord |
| **client**   | Lecture seule                               |

## Démarrage

```bash
cd fish-chill/docker
docker compose up -d --build
docker compose exec backend npm run seed
```

| Service  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:3000/api |

### Comptes démo (mdp: `demo123`)

- `admin@cfto.fr` · `terre@cfto.fr` · `embarque@cfto.fr` · `client@externe.fr`

## Idées IA possibles ensuite

1. **Prédiction usure filets** (régression sur historique)
2. **Zones de pêche suggérées** à partir de l’historique captures + météo
3. **Anomalies carburant** (consommation anormale → alerte)
4. **Rapport journalier auto** (NL résumé par navire, envoyé à terre)
5. **Requêtes en langage naturel** : « combien de merlu cette semaine sur le Ker Ys ? »
6. **Mode embarqué vocal** (Web Speech API) pour saisie mains libres

## Structure

```
backend/src/services/aiService.js   ← insights + chat (local / Groq)
frontend/src/components/AiAssistant.vue
frontend/src/components/AiInsightsBanner.vue
```


## Tests

### Backend (Jest + Supertest + MongoMemoryServer)

```bash
cd backend
npm install
npm test                 # unit + integration
npm run test:unit
npm run test:integration
```

Couverture :
- **Unit** : modèle Net (alertes usure), User, JWT, service IA (insights + chat)
- **Integration** : auth register/login/me, vessels CRUD + droits rôles, AI insights/chat, health

### Frontend (Vitest + Vue Test Utils)

```bash
cd frontend
npm install
npm test
```

Couverture :
- Service auth (token storage)
- i18n FR/EN (clés alignées)
- LandingView (boutons connexion/inscription)

## Lancement Ngrok

docker run --net=host -it -e NGROK_AUTHTOKEN=xyz ngrok/ngrok:latest http 5173
