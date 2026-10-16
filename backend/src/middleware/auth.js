const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'fishchill-dev-secret-change-me';

/** Vérifie le token JWT et attache req.user */
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Compte inactif ou introuvable' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

/**
 * Autorise uniquement certains rôles.
 * Usage: authorize('admin', 'terre')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès refusé pour ce rôle' });
  }
  next();
};

/** Génère un token JWT (7 jours) */
const signToken = (userId) =>
  jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });

module.exports = { protect, authorize, signToken, JWT_SECRET };
