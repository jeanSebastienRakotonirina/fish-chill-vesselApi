/**
 * Client VesselAPI (https://api.vesselapi.com)
 * Clé : VESSELAPI_API_KEY dans .env (jamais exposée au frontend)
 */
const BASE_URL = process.env.VESSELAPI_BASE_URL || 'https://api.vesselapi.com/v1';

function getApiKey() {
  return process.env.VESSELAPI_API_KEY || '';
}

function isConfigured() {
  return Boolean(getApiKey());
}

async function request(path, params = {}) {
  const key = getApiKey();
  if (!key) {
    const err = new Error('VESSELAPI_API_KEY non configurée');
    err.code = 'VESSELAPI_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }

  const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  });

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(
      body?.error?.message || body?.message || `VesselAPI HTTP ${res.status}`
    );
    err.status = res.status;
    err.code = body?.error?.code || 'VESSELAPI_ERROR';
    err.details = body;
    throw err;
  }

  return body;
}

async function searchVessels({ name, limit = 20 } = {}) {
  return request('/search/vessels', {
    'filter.name': name,
    'pagination.limit': limit,
  });
}

async function getVessel(id, idType = 'mmsi') {
  return request(`/vessel/${encodeURIComponent(id)}`, {
    'filter.idType': idType,
  });
}

async function getPosition(id, idType = 'mmsi') {
  return request(`/vessel/${encodeURIComponent(id)}/position`, {
    'filter.idType': idType,
  });
}

async function getVesselsInBBox({
  latBottom = 47.6,
  latTop = 48.2,
  lonLeft = -4.8,
  lonRight = -3.6,
  nextToken,
  limit = 50,
} = {}) {
  const params = {
    'filter.latBottom': latBottom,
    'filter.latTop': latTop,
    'filter.lonLeft': lonLeft,
    'filter.lonRight': lonRight,
    'pagination.limit': Math.min(Number(limit) || 50, 50),
  };
  // Nom correct selon la doc VesselAPI
  if (nextToken) params['pagination.nextToken'] = nextToken;
  return request('/location/vessels/bounding-box', params);
}


async function getVesselsInBBoxAll(bbox = {}, maxPages = 5) {
  const all = [];
  let nextToken;
  for (let i = 0; i < maxPages; i++) {
    const data = await getVesselsInBBox({ ...bbox, nextToken });
    const page = data?.vessels || [];
    all.push(...page);
    nextToken = data?.nextToken;
    if (!nextToken || page.length === 0) break;
  }
  return { vessels: all, count: all.length };
}

function mapExternalVessel(raw) {
  if (!raw) return null;

  const lat =
    raw.latitude ??
    raw.lat ??
    raw.position?.latitude ??
    raw.position?.lat ??
    raw.vesselPosition?.latitude ??
    raw.location?.coordinates?.[1] ??
    null;

  const lng =
    raw.longitude ??
    raw.lng ??
    raw.lon ??
    raw.position?.longitude ??
    raw.position?.lng ??
    raw.position?.lon ??
    raw.vesselPosition?.longitude ??
    raw.location?.coordinates?.[0] ??
    null;

  const speed = raw.sog ?? raw.speed ?? raw.position?.speed ?? null;
  const heading = raw.heading ?? raw.cog ?? raw.course ?? raw.position?.heading ?? null;

  const name =
    raw.vessel_name ||
    raw.name ||
    raw.shipName ||
    (raw.mmsi ? `MMSI ${raw.mmsi}` : 'Unknown');

  return {
    externalId: String(raw.mmsi || raw.imo || raw.id || name),
    name,
    mmsi: raw.mmsi != null ? String(raw.mmsi) : null,
    imo: raw.imo != null ? String(raw.imo) : null,
    callSign: raw.callSign || raw.callsign || null,
    type: raw.shipType || raw.type || null,
    navStatus: raw.nav_status ?? raw.navStatus ?? null,
    position:
      lat != null && lng != null
        ? {
            lat: Number(lat),
            lng: Number(lng),
            speed: speed != null ? Number(speed) : null,
            heading: heading != null ? Number(heading) : null,
            updatedAt:
              raw.timestamp ||
              raw.processed_timestamp ||
              raw.position?.updatedAt ||
              new Date().toISOString(),
          }
        : null,
    source: 'vesselapi',
  };
}

module.exports = {
  isConfigured,
  searchVessels,
  getVessel,
  getPosition,
  getVesselsInBBox,
  getVesselsInBBoxAll,
  mapExternalVessel,
};