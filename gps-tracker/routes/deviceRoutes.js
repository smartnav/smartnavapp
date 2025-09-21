const express = require('express');
const Device = require('../models/mongodb/Device');
const DeviceManager = require('../services/deviceManager');
const { protect, authorize } = require('../../attendance-system/middleware/auth');

const router = express.Router();

// All routes protected
router.use(protect);

// @desc    Get all devices
// @route   GET /api/devices
router.get('/', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { imei: { $regex: search, $options: 'i' } },
        { deviceName: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } }
      ];
    }
    query.isActive = true;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const devices = await Device.find(query)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    const total = await Device.countDocuments(query);

    res.status(200).json({
      success: true,
      count: devices.length,
      total,
      page: options.page,
      pages: Math.ceil(total / options.limit),
      devices
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get device statistics
// @route   GET /api/devices/stats
router.get('/stats', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const totalDevices = await Device.countDocuments({ isActive: true });
    const activeDevices = DeviceManager.getActiveDevicesCount();

    res.status(200).json({
      success: true,
      totalDevices,
      activeDevices
    });
  } catch (error) {
    console.error('Get device stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get active devices
// @route   GET /api/devices/active
router.get('/active', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const activeDevices = DeviceManager.getActiveDevices();

    res.status(200).json({
      success: true,
      count: activeDevices.length,
      devices: activeDevices
    });
  } catch (error) {
    console.error('Get active devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Add new device
// @route   POST /api/devices
router.post('/', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { imei, deviceName, vehicleNumber, vehicleType, driverName, driverPhone, simNumber } = req.body;

    // Check if device already exists
    const existingDevice = await Device.findOne({ 
      $or: [{ imei }, { vehicleNumber }] 
    });

    if (existingDevice) {
      return res.status(400).json({
        success: false,
        message: 'Device with this IMEI or vehicle number already exists'
      });
    }

    const device = await Device.create({
      imei,
      deviceName,
      vehicleNumber,
      vehicleType,
      driverName,
      driverPhone,
      simNumber
    });

    res.status(201).json({
      success: true,
      device
    });
  } catch (error) {
    console.error('Add device error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update device
// @route   PUT /api/devices/:id
router.put('/:id', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const device = await Device.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    res.status(200).json({
      success: true,
      device
    });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete device
// @route   DELETE /api/devices/:id
router.delete('/:id', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const device = await Device.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Device deactivated successfully'
    });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Send command to device
// @route   POST /api/devices/:imei/command
router.post('/:imei/command', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { imei } = req.params;
    const { command } = req.body;

    // Convert command string to buffer if needed
    let commandBuffer;
    if (typeof command === 'string') {
      if (command.startsWith('0x')) {
        // Hex string
        commandBuffer = Buffer.from(command.slice(2), 'hex');
      } else {
        // Regular string
        commandBuffer = Buffer.from(command);
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid command format'
      });
    }

    const success = await DeviceManager.sendCommandToDevice(imei, commandBuffer);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Command sent successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Device not connected'
      });
    }
  } catch (error) {
    console.error('Send command error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;