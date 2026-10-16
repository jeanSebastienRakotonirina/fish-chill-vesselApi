const Catch = require('../models/Catch');

exports.getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.vessel) filter.vessel = req.query.vessel;
    if (req.query.species) filter.species = req.query.species;
    if (req.query.from || req.query.to) {
      filter.catchDate = {};
      if (req.query.from) filter.catchDate.$gte = new Date(req.query.from);
      if (req.query.to) filter.catchDate.$lte = new Date(req.query.to);
    }

    const catches = await Catch.find(filter)
      .populate('vessel', 'name')
      .sort({ catchDate: -1 })
      .limit(parseInt(req.query.limit) || 100);

    res.json(catches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const catchRecord = await Catch.create(req.body);
    res.status(201).json(catchRecord);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.stats = async (req, res) => {
  try {
    const match = {};
    if (req.query.vessel) match.vessel = require('mongoose').Types.ObjectId.createFromHexString(req.query.vessel);
    if (req.query.from || req.query.to) {
      match.catchDate = {};
      if (req.query.from) match.catchDate.$gte = new Date(req.query.from);
      if (req.query.to) match.catchDate.$lte = new Date(req.query.to);
    }

    const bySpecies = await Catch.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$species',
          totalKg: { $sum: '$quantityKg' },
          count: { $sum: 1 },
          avgQuality: { $avg: { $cond: [{ $eq: ['$quality', 'A'] }, 1, 0] } },
        },
      },
      { $sort: { totalKg: -1 } },
    ]);

    const byDay = await Catch.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$catchDate' } },
          totalKg: { $sum: '$quantityKg' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ bySpecies, byDay });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
