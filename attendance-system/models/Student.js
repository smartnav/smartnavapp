const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  studentId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 20
  },
  rfidTag: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50
  },
  class: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  section: {
    type: String,
    trim: true,
    maxlength: 10
  },
  rollNumber: {
    type: Number,
    required: true
  },
  parentName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  parentPhone: {
    type: String,
    trim: true,
    maxlength: 15
  },
  address: {
    type: String,
    trim: true,
    maxlength: 200
  },
  isActive: {
    type: Boolean,
    default: true
  },
  photo: {
    type: String, // URL to photo
    default: null
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

// Index for better query performance
StudentSchema.index({ class: 1, section: 1, rollNumber: 1 });
StudentSchema.index({ rfidTag: 1 });
StudentSchema.index({ studentId: 1 });

module.exports = mongoose.model('Student', StudentSchema);