const express = require('express');
const Location = require('../models/mongodb/Location');
const Device = require('../models/mongodb/Device');
const astraClient = require('../../shared/config/astra');
const { protect, authorize } = require('../../attendance-system/middleware/auth');

const router = express.Router();

// All routes protected
router.use(protect);

// @desc    Get real-time location data
// @route   GET /api/tracking/realtime/:imei
router.get('/realtime/:imei', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { imei } = req.params;

    const result = await astraClient.findOne('realtime_data', {
      device_imei: imei
    }, {
      sort: { timestamp: -1 }
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'No real-time data found for this device'
      });
    }

    // Get device info
    const device = await Device.findOne({ imei });

    res.status(200).json({
      success: true,
      location: result,
      device: device ? {
        deviceName: device.deviceName,
        vehicleNumber: device.vehicleNumber,
        driverName: device.driverName
      } : null
    });
  } catch (error) {
    console.error('Get real-time location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get travel path for a device
// @route   GET /api/tracking/path/:imei
router.get('/path/:imei', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { imei } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    const result = await astraClient.findLocations('location_history', {
      device_imei: imei,
      date: date
    }, {
      sort: { timestamp: 1 }
    });

    const locations = await result.toArray();

    res.status(200).json({
      success: true,
      count: locations.length,
      path: locations.map(row => ({
        timestamp: row.timestamp,
        latitude: row.latitude,
        longitude: row.longitude,
        speed: row.speed,
        heading: row.heading
      }))
    });
  } catch (error) {
    console.error('Get travel path error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get location history (using MongoDB as Astra DB doesn't support complex queries as well)
// @route   GET /api/tracking/history
router.get('/history', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { imei, startDate, endDate, page = 1, limit = 100 } = req.query;
    
    if (!imei || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'IMEI, startDate, and endDate are required'
      });
    }

    const query = {
      imei,
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { timestamp: -1 }
    };

    const locations = await Location.find(query)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort)
      .populate('device', 'deviceName vehicleNumber');

    const total = await Location.countDocuments(query);

    res.status(200).json({
      success: true,
      count: locations.length,
      total,
      page: options.page,
      pages: Math.ceil(total / options.limit),
      locations
    });
  } catch (error) {
    console.error('Get location history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});



// @desc    Get current locations of all devices
// @route   GET /api/tracking/current
router.get('/current', authorize('admin', 'teacher'), async (req, res) => {
  try {
    // Get all devices with their last known location
    const devices = await Device.find({ 
      isActive: true,
      lastLocation: { $exists: true, $ne: null }
    }).select('imei deviceName vehicleNumber lastLocation');

    res.status(200).json({
      success: true,
      count: devices.length,
      devices: devices.map(device => ({
        imei: device.imei,
        deviceName: device.deviceName,
        vehicleNumber: device.vehicleNumber,
        latitude: device.lastLocation.latitude,
        longitude: device.lastLocation.longitude,
        timestamp: device.lastLocation.timestamp,
        speed: device.lastLocation.speed,
        heading: device.lastLocation.heading
      }))
    });
  } catch (error) {
    console.error('Get current locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


// @desc    Get statistics for a device
// @route   GET /api/tracking/stats/:imei
router.get('/stats/:imei', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { imei } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Get total distance traveled (simplified calculation)
    const locations = await Location.find({
      imei,
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ timestamp: 1 });

    let totalDistance = 0;
    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];
      
      // Simple distance calculation (for demonstration)
      const latDiff = curr.latitude - prev.latitude;
      const lonDiff = curr.longitude - prev.longitude;
      totalDistance += Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111; // Approx km
    }

    // Get other statistics
    const totalLocations = locations.length;
    const avgSpeed = locations.reduce((sum, loc) => sum + (loc.speed || 0), 0) / totalLocations;
    const maxSpeed = Math.max(...locations.map(loc => loc.speed || 0));

    res.status(200).json({
      success: true,
      stats: {
        totalDistance: totalDistance.toFixed(2),
        totalLocations,
        avgSpeed: avgSpeed.toFixed(2),
        maxSpeed: maxSpeed.toFixed(2),
        timeRange: {
          start: locations[0]?.timestamp,
          end: locations[locations.length - 1]?.timestamp
        }
      }
    });
  } catch (error) {
    console.error('Get tracking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;