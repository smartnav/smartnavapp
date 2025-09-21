const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    default: 'present'
  },
  timeIn: {
    type: Date,
    default: Date.now
  },
  timeOut: {
    type: Date,
    default: null
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 200
  },
  deviceType: {
    type: String,
    enum: ['rfid', 'manual', 'mobile'],
    default: 'rfid'
  },
  location: {
    latitude: Number,
    longitude: Number,
    accuracy: Number
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

// Compound index for unique attendance per student per day
AttendanceSchema.index({ student: 1, date: 1 }, { unique: true });

// Index for querying attendance by date
AttendanceSchema.index({ date: 1 });
AttendanceSchema.index({ student: 1, date: -1 });

module.exports = mongoose.model('Attendance', AttendanceSchema);