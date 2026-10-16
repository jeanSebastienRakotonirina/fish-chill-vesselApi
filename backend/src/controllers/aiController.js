const { getFleetInsights, chat } = require('../services/aiService');

// GET /api/ai/insights
exports.insights = async (req, res) => {
  try {
    const data = await getFleetInsights();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/ai/chat  { message, lang? }
exports.chat = async (req, res) => {
  try {
    const { message, lang } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length < 2) {
      return res.status(400).json({ error: 'Message requis' });
    }
    const result = await chat(message.trim(), {
      lang: lang || 'fr',
      userRole: req.user?.role || 'terre',
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
