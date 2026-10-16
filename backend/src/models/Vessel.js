const mongoose = require('mongoose');

const vesselSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    imo: { type: String, unique: true, sparse: true },
    mmsi: { type: String, unique: true, sparse: true },
    callSign: String,
    type: { type: String, enum: ['chalutier', 'senneur', 'autre'], default: 'chalutier' },
    status: {
      type: String,
      enum: ['en_mer', 'au_port', 'maintenance', 'hors_service'],
      default: 'au_port',
    },
    position: {
      lat: Number,
      lng: Number,
      heading: Number,
      speed: Number,
      updatedAt: Date,
    },
    capacity: {
      holds: Number,
      fuel: Number,
    },
    currentFuel: { type: Number, default: 0 },
    lastSyncAt: Date,
    isOnline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vessel', vesselSchema);