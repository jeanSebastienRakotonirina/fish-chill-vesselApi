const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, company } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mot de passe : 6 caractères minimum' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    // Seuls admin/terre peuvent s'inscrire librement en dev.
    // En prod, l'inscription client/embarque devrait être validée par un admin.
    const allowedRoles = ['terre', 'embarque', 'client'];
    const finalRole = allowedRoles.includes(role) ? role : 'terre';

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashed,
      firstName,
      lastName,
      role: finalRole,
      company: finalRole === 'client' ? company : undefined,
    });

    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Compte désactivé' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user._id);
    res.json({
      token,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
};
