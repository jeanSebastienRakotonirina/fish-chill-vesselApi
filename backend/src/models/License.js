const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema(
  {
    vessel: { type: mongoose.Schema.Types.ObjectId, ref: 'Vessel' },
    number: { type: String, required: true, unique: true },
    type: String, // quota, zone, espèce...
    species: [String],
    zones: [String],
    validFrom: Date,
    validTo: Date,
    quotaKg: Number,
    usedKg: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'expiree', 'suspendue'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('License', licenseSchema);
