const mongoose = require('mongoose');

const fuelLogSchema = new mongoose.Schema(
  {
    vessel: { type: mongoose.Schema.Types.ObjectId, ref: 'Vessel', required: true },
    type: { type: String, enum: ['consommation', 'ravitaillement'], required: true },
    quantityLiters: { type: Number, required: true },
    remainingLiters: Number,
    position: {
      lat: Number,
      lng: Number,
    },
    timestamp: { type: Date, default: Date.now },
    notes: String,
  },
  { timestamps: true }
);

fuelLogSchema.index({ vessel: 1, timestamp: -1 });

module.exports = mongoose.model('FuelLog', fuelLogSchema);
