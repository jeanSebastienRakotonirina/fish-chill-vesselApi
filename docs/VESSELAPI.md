# Intégration VesselAPI (AIS)

Provider : **https://api.vesselapi.com** (dashboard : https://dashboard.vesselapi.com)

## Configuration

Dans `backend/.env` :

```env
VESSELAPI_API_KEY=votre_cle_ici
# optionnel :
# VESSELAPI_BASE_URL=https://api.vesselapi.com/v1
```

Redémarrer le backend après modification.

## Endpoints backend (authentifiés)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/vessels/external/status` | Clé configurée ? |
| GET | `/api/vessels/external/search?name=...` | Recherche navires AIS |
| GET | `/api/vessels/external/live?latBottom=&latTop=&lonLeft=&lonRight=` | Navires dans une zone |
| POST | `/api/vessels/:id/sync-ais` | Met à jour 1 navire (MMSI/IMO requis) |
| POST | `/api/vessels/sync-ais-all` | Sync tous les navires avec MMSI ou IMO |

## Modèle Vessel

Champ ajouté : `mmsi` (string, unique, sparse).

Pour qu’un navire se synchronise, renseigner **mmsi** ou **imo** en base.

## Frontend

Sur la page Carte :
- bouton **📡 AIS** → sync tous les navires
- bouton **📡** sur chaque ligne (si MMSI/IMO) → sync un navire

## Sécurité

La clé API reste **uniquement côté backend**. Le frontend appelle uniquement les routes `/api/vessels/...` protégées JWT.
