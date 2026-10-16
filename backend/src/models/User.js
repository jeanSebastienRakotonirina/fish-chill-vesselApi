const mongoose = require('mongoose');

/**
 * Rôles Fish&Chill :
 * - admin     : équipe IT, accès total
 * - terre     : utilisateurs à terre (siège) – opérations complètes
 * - embarque  : équipage à bord – données de leur(s) navire(s), saisie captures/filets
 * - client    : clients externes – lecture limitée (stats, captures agrégées)
 */
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'terre', 'embarque', 'client'],
      default: 'terre',
      required: true,
    },
    // Pour les embarqués : navire(s) assigné(s)
    vessels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vessel' }],
    // Pour les clients : éventuellement filtrer les données visibles
    company: String,
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    role: this.role,
    vessels: this.vessels,
    company: this.company,
    isActive: this.isActive,
    lastLoginAt: this.lastLoginAt,
  };
};

module.exports = mongoose.model('User', userSchema);
