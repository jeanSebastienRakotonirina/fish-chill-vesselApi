# Suite de tests Fish&Chill

## Backend

```bash
cd backend && npm install && npm test
```

### Unitaires (`tests/unit/`)

| Fichier | Couverture |
|---------|------------|
| `net.model.test.js` | Alertes usure 70%/90%, hook pre-save |
| `vessel.model.test.js` | Defaults, unicité name, GPS, enums |
| `catch.model.test.js` | Création, defaults qualité, validation |
| `fuelLicense.model.test.js` | FuelLog conso/ravitaillement, License quota |
| `auth.middleware.test.js` | JWT sign, toPublicJSON, email unique |
| `auth.protect.test.js` | Token invalide, compte inactif, RBAC 403 |
| `ai.service.test.js` | Insights filets/fuel, chat résumé |
| `ai.intents.test.js` | Intents FR/EN navigation, fuel, filets |
| `mqtt.service.test.js` | Position, catch, fuel, net via modèles |

### Intégration (`tests/integration/`)

| Fichier | Couverture |
|---------|------------|
| `health.test.js` | GET /api/health |
| `auth.test.js` | Register, login, /me, erreurs 400/401/409 |
| `vessels.test.js` | Liste, création, 403 client, dashboard |
| `vessels.crud.test.js` | GET by id, PATCH, dashboard KPIs complets |
| `catches-nets.test.js` | POST catches, stats, nets + ack alerte |
| `catches.filters.test.js` | Filtres vessel/species/dates/limit |
| `ai.test.js` | Insights, chat, validation message |
| `rbac.test.js` | Matrice complète admin/terre/embarque/client |

## Frontend

```bash
cd frontend && npm install && npm test
```

| Fichier | Couverture |
|---------|------------|
| `auth.service.test.js` | setAuth, logout, isAuthenticated |
| `api.test.js` | Exports API (vessels, catches, nets, AI) |
| `i18n.test.js` | Clés FR/EN alignées, traductions |
| `LandingView.test.js` | Boutons connexion/inscription |
| `LoginView.test.js` | Formulaire, succès → /app, erreur |
| `RegisterView.test.js` | Rôles, champ société client, submit |
| `AiAssistant.test.js` | FAB, panneau, chat, suggestions |
| `router.test.js` | Auth state, canWrite par rôle |

## CI locale rapide

```bash
# Backend uniquement
cd backend && npm test

# Frontend uniquement  
cd frontend && npm test
```
