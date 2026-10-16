const Vessel = require('../models/Vessel');
const Catch = require('../models/Catch');
const FuelLog = require('../models/FuelLog');
const Net = require('../models/Net');

// GET /api/vessels
exports.getAll = async (req, res) => {
  try {
    const vessels = await Vessel.find().sort({ name: 1 });
    res.json(vessels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/vessels/:id
exports.getOne = async (req, res) => {
  try {
    const vessel = await Vessel.findById(req.params.id);
    if (!vessel) return res.status(404).json({ error: 'Navire non trouvé' });
    res.json(vessel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/vessels
exports.create = async (req, res) => {
  try {
    const vessel = await Vessel.create(req.body);
    res.status(201).json(vessel);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PATCH /api/vessels/:id
exports.update = async (req, res) => {
  try {
    const vessel = await Vessel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!vessel) return res.status(404).json({ error: 'Navire non trouvé' });
    res.json(vessel);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/vessels/:id/dashboard
exports.dashboard = async (req, res) => {
  try {
    const vesselId = req.params.id;
    const vessel = await Vessel.findById(vesselId);
    if (!vessel) return res.status(404).json({ error: 'Navire non trouvé' });

    const [catches, fuelLogs, nets, speciesAgg] = await Promise.all([
      Catch.find({ vessel: vesselId }).sort({ catchDate: -1 }).limit(50),
      FuelLog.find({ vessel: vesselId }).sort({ timestamp: -1 }).limit(30),
      Net.find({ vessel: vesselId }),
      Catch.aggregate([
        { $match: { vessel: vessel._id } },
        { $group: { _id: '$species', kg: { $sum: '$quantityKg' }, count: { $sum: 1 } } },
        { $sort: { kg: -1 } },
      ]),
    ]);

    const totalCatchKg = speciesAgg.reduce((sum, s) => sum + s.kg, 0);
    const totalCatchCount = speciesAgg.reduce((sum, s) => sum + s.count, 0);
    const bySpecies = speciesAgg.reduce((acc, s) => {
      acc[s._id] = s.kg;
      return acc;
    }, {});

    const netsToInspect = nets.filter((n) => n.status === 'a_inspecter' || n.status === 'a_remplacer');

    res.json({
      vessel,
      kpis: {
        totalCatchKg,
        totalCatchCount,
        bySpecies,
        currentFuelLiters: vessel.currentFuel,
        fuelCapacity: vessel.capacity?.fuel,
        fuelPercent: vessel.capacity?.fuel
          ? Math.round((vessel.currentFuel / vessel.capacity.fuel) * 100)
          : null,
        activeNets: nets.filter((n) => n.status === 'operationnel').length,
        netsAlert: netsToInspect.length,
        lastSync: vessel.lastSyncAt,
        isOnline: vessel.isOnline,
      },
      recentCatches: catches.slice(0, 10),
      recentFuel: fuelLogs.slice(0, 10),
      nets,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── VesselAPI ──────────────────────────────────────────────
const vesselApi = require('../services/vesselApiService');

exports.externalStatus = async (_req, res) => {
  res.json({
    configured: vesselApi.isConfigured(),
    provider: 'vesselapi.com',
    baseUrl: process.env.VESSELAPI_BASE_URL || 'https://api.vesselapi.com/v1',
  });
};

exports.externalSearch = async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'Paramètre name requis' });

    const data = await vesselApi.searchVessels({
      name,
      limit: Math.min(Number(req.query.limit) || 20, 50),
    });
    const list = data?.vessels || data?.data || (Array.isArray(data) ? data : []);
    res.json({
      count: list.length,
      vessels: list.map(vesselApi.mapExternalVessel).filter(Boolean),
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.message,
      code: err.code || 'VESSELAPI_ERROR',
    });
  }
};

exports.externalLive = async (req, res) => {
  try {
    const bbox = {
      latBottom: req.query.latBottom != null ? Number(req.query.latBottom) : 47.6,
      latTop: req.query.latTop != null ? Number(req.query.latTop) : 48.2,
      lonLeft: req.query.lonLeft != null ? Number(req.query.lonLeft) : -4.8,
      lonRight: req.query.lonRight != null ? Number(req.query.lonRight) : -3.6,
    };
    const span = Math.abs(bbox.latTop - bbox.latBottom) + Math.abs(bbox.lonRight - bbox.lonLeft);
    if (span > 4) {
      return res.status(400).json({
        error: `Bounding box trop grande (|dLat|+|dLon|=${span.toFixed(2)} > 4). Réduis la zone.`,
        code: 'BBOX_TOO_LARGE',
      });
    }
    const data = await vesselApi.getVesselsInBBoxAll(bbox, 5);
    const list = (data.vessels || []).map(vesselApi.mapExternalVessel).filter((v) => v && v.position);
    res.json({ count: list.length, vessels: list, bbox });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.message,
      code: err.code || 'VESSELAPI_ERROR',
      details: err.details || undefined,
    });
  }
};

exports.syncAis = async (req, res) => {
  try {
    const vessel = await Vessel.findById(req.params.id);
    if (!vessel) return res.status(404).json({ error: 'Navire non trouvé' });

    const idType = vessel.mmsi ? 'mmsi' : vessel.imo ? 'imo' : null;
    const id = vessel.mmsi || vessel.imo;
    if (!idType || !id) {
      return res.status(400).json({
        error: 'Ce navire n’a ni MMSI ni IMO – impossible de synchroniser AIS',
      });
    }

    const data = await vesselApi.getPosition(id, idType);
    const mapped = vesselApi.mapExternalVessel(data?.vesselPosition || data?.position || data?.vessel || data);
    if (!mapped?.position) {
      return res.status(404).json({ error: 'Position AIS introuvable pour ce navire' });
    }

    vessel.position = {
      lat: mapped.position.lat,
      lng: mapped.position.lng,
      speed: mapped.position.speed,
      heading: mapped.position.heading,
      updatedAt: new Date(mapped.position.updatedAt || Date.now()),
    };
    vessel.lastSyncAt = new Date();
    vessel.isOnline = true;
    if (mapped.mmsi && !vessel.mmsi) vessel.mmsi = mapped.mmsi;
    if (mapped.imo && !vessel.imo) vessel.imo = mapped.imo;
    if (mapped.callSign && !vessel.callSign) vessel.callSign = mapped.callSign;

    await vessel.save();
    res.json({ vessel, source: 'vesselapi' });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.message,
      code: err.code || 'VESSELAPI_ERROR',
    });
  }
};

exports.syncAisAll = async (_req, res) => {
  try {
    if (!vesselApi.isConfigured()) {
      return res.status(503).json({
        error: 'VESSELAPI_API_KEY non configurée',
        code: 'VESSELAPI_NOT_CONFIGURED',
      });
    }

    const vessels = await Vessel.find({
      $or: [{ mmsi: { $exists: true, $nin: [null, ''] } }, { imo: { $exists: true, $nin: [null, ''] } }],
    });

    const results = [];
    for (const vessel of vessels) {
      const idType = vessel.mmsi ? 'mmsi' : 'imo';
      const id = vessel.mmsi || vessel.imo;
      try {
        const data = await vesselApi.getPosition(id, idType);
        const mapped = vesselApi.mapExternalVessel(
          data?.vesselPosition || data?.position || data?.vessel || data
        );
        if (mapped?.position) {
          vessel.position = {
            lat: mapped.position.lat,
            lng: mapped.position.lng,
            speed: mapped.position.speed,
            heading: mapped.position.heading,
            updatedAt: new Date(mapped.position.updatedAt || Date.now()),
          };
          vessel.lastSyncAt = new Date();
          vessel.isOnline = true;
          await vessel.save();
          results.push({ id: vessel._id, name: vessel.name, ok: true });
        } else {
          results.push({ id: vessel._id, name: vessel.name, ok: false, error: 'no position' });
        }
      } catch (e) {
        results.push({ id: vessel._id, name: vessel.name, ok: false, error: e.message });
      }
    }

    res.json({
      total: vessels.length,
      updated: results.filter((r) => r.ok).length,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.importExternal = async (req, res) => {
  try {
    const { name, mmsi, imo, callSign, position, type } = req.body;
    if (!name && !mmsi && !imo) {
      return res.status(400).json({ error: 'name, mmsi ou imo requis' });
    }

    const existing = await Vessel.findOne({
      $or: [
        ...(mmsi ? [{ mmsi: String(mmsi) }] : []),
        ...(imo ? [{ imo: String(imo) }] : []),
        ...(name ? [{ name }] : []),
      ],
    });
    if (existing) {
      if (position?.lat != null && position?.lng != null) {
        existing.position = {
          lat: Number(position.lat),
          lng: Number(position.lng),
          speed: position.speed ?? existing.position?.speed,
          heading: position.heading ?? existing.position?.heading,
          updatedAt: new Date(position.updatedAt || Date.now()),
        };
        existing.lastSyncAt = new Date();
        existing.isOnline = true;
        if (mmsi && !existing.mmsi) existing.mmsi = String(mmsi);
        if (imo && !existing.imo) existing.imo = String(imo);
        await existing.save();
      }
      return res.json({ vessel: existing, created: false });
    }

    const vessel = await Vessel.create({
      name: name || `Vessel ${mmsi || imo}`,
      mmsi: mmsi ? String(mmsi) : undefined,
      imo: imo ? String(imo) : undefined,
      callSign: callSign || undefined,
      type: ['chalutier', 'senneur', 'autre'].includes(type) ? type : 'autre',
      status: 'en_mer',
      isOnline: true,
      lastSyncAt: new Date(),
      position:
        position?.lat != null && position?.lng != null
          ? {
              lat: Number(position.lat),
              lng: Number(position.lng),
              speed: position.speed ?? null,
              heading: position.heading ?? null,
              updatedAt: new Date(position.updatedAt || Date.now()),
            }
          : undefined,
    });

    res.status(201).json({ vessel, created: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};