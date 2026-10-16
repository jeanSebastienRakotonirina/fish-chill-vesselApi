const Net = require('../models/Net');

exports.getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.vessel) filter.vessel = req.query.vessel;
    if (req.query.status) filter.status = req.query.status;

    const nets = await Net.find(filter).populate('vessel', 'name').sort({ wearLevel: -1 });
    res.json(nets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const net = await Net.create(req.body);
    res.status(201).json(net);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const net = await Net.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!net) return res.status(404).json({ error: 'Filet non trouvé' });
    res.json(net);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.acknowledgeAlert = async (req, res) => {
  try {
    const net = await Net.findById(req.params.id);
    if (!net) return res.status(404).json({ error: 'Filet non trouvé' });

    const alert = net.alerts.id(req.params.alertId);
    if (!alert) return res.status(404).json({ error: 'Alerte non trouvée' });

    alert.acknowledged = true;
    await net.save();
    res.json(net);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
