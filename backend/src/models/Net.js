const mongoose = require('mongoose');

const netSchema = new mongoose.Schema(
  {
    vessel: { type: mongoose.Schema.Types.ObjectId, ref: 'Vessel', required: true },
    identifier: { type: String, required: true }, // ex: FILET-01
    type: { type: String, enum: ['chalut', 'senne', 'filet_maillant', 'autre'], default: 'chalut' },
    lengthM: Number,
    meshSizeMm: Number,
    installDate: Date,
    lastInspection: Date,
    wearLevel: { type: Number, min: 0, max: 100, default: 0 }, // %
    status: {
      type: String,
      enum: ['operationnel', 'a_inspecter', 'a_remplacer', 'hors_service'],
      default: 'operationnel',
    },
    alerts: [
      {
        type: { type: String, enum: ['usure', 'dommage', 'perdu'] },
        message: String,
        createdAt: { type: Date, default: Date.now },
        acknowledged: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

// Alerte automatique si usure > 70%
netSchema.pre('save', function (next) {
  if (this.wearLevel >= 70 && this.status === 'operationnel') {
    this.status = 'a_inspecter';
    const hasAlert = this.alerts.some((a) => a.type === 'usure' && !a.acknowledged);
    if (!hasAlert) {
      this.alerts.push({
        type: 'usure',
        message: `Usure critique (${this.wearLevel}%) – inspection recommandée`,
      });
    }
  }
  if (this.wearLevel >= 90) {
    this.status = 'a_remplacer';
  }
  next();
});

module.exports = mongoose.model('Net', netSchema);
