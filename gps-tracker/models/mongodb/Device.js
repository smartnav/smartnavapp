const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  imei: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^\d{15}$/, 'IMEI must be 15 digits']
  },
  deviceName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  vehicleNumber: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 20
  },
  vehicleType: {
    type: String,
    enum: ['car', 'truck', 'bus', 'van', 'bike', 'other'],
    default: 'other'
  },
  driverName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  driverPhone: {
    type: String,
    trim: true,
    maxlength: 15
  },
  simNumber: {
    type: String,
    trim: true,
    maxlength: 15
  },
  protocolVersion: {
    type: String,
    default: 'V5'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastConnection: {
    type: Date
  },
  lastLocation: {
    latitude: Number,
    longitude: Number,
    timestamp: Date,
    speed: Number,
    heading: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
DeviceSchema.index({ imei: 1 });
DeviceSchema.index({ vehicleNumber: 1 });
DeviceSchema.index({ isActive: 1 });

module.exports = mongoose.model('Device', DeviceSchema);