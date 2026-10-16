const mongoose = require('mongoose');

const catchSchema = new mongoose.Schema(
  {
    vessel: { type: mongoose.Schema.Types.ObjectId, ref: 'Vessel', required: true },
    species: { type: String, required: true }, // ex: merlu, thon, sardine
    quantityKg: { type: Number, required: true },
    quality: { type: String, enum: ['A', 'B', 'C'], default: 'A' },
    catchDate: { type: Date, required: true },
    position: {
      lat: Number,
      lng: Number,
    },
    conservation: {
      method: { type: String, enum: ['saumure', 'glace', 'congelation', 'frais'], default: 'saumure' },
      temperature: Number, // °C
      holdId: String,
    },
    licenseRef: String,
    notes: String,
    syncedFromVessel: { type: Boolean, default: false },
  },
  { timestamps: true }
);

catchSchema.index({ vessel: 1, catchDate: -1 });
catchSchema.index({ species: 1 });

module.exports = mongoose.model('Catch', catchSchema);
