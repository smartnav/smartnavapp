const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  imei: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  speed: {
    type: Number,
    default: 0
  },
  heading: {
    type: Number,
    default: 0
  },
  altitude: {
    type: Number,
    default: 0
  },
  satellites: {
    type: Number,
    default: 0
  },
  hdop: {
    type: Number,
    default: 0
  },
  battery: {
    type: Number,
    default: 0
  },
  ignition: {
    type: Boolean,
    default: false
  },
  mileage: {
    type: Number,
    default: 0
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
LocationSchema.index({ device: 1, timestamp: -1 });
LocationSchema.index({ imei: 1, timestamp: -1 });
LocationSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Location', LocationSchema);