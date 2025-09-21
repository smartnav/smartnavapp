const Device = require('../models/mongodb/Device');
const logger = require('../../shared/utils/logger');

// Store active device connections
const activeDevices = new Map();

class DeviceManager {
  static async updateDeviceConnection(imei, socket) {
    try {
      // Update device connection status
      const device = await Device.findOne({ imei });
      if (device) {
        device.lastConnection = new Date();
        await device.save();
        
        // Store socket reference for this device
        activeDevices.set(imei, {
          socket,
          lastUpdate: new Date(),
          remoteAddress: socket.remoteAddress,
          remotePort: socket.remotePort
        });
        
        logger.debug('Device connection updated', { imei });
      }
    } catch (error) {
      logger.error('Error updating device connection', { error: error.message, imei });
    }
  }

  static getActiveDevices() {
    return Array.from(activeDevices.entries()).map(([imei, data]) => ({
      imei,
      lastUpdate: data.lastUpdate,
      remoteAddress: data.remoteAddress,
      remotePort: data.remotePort
    }));
  }

  static getActiveDevicesCount() {
    return activeDevices.size;
  }

  static removeDeviceConnection(imei) {
    if (activeDevices.has(imei)) {
      activeDevices.delete(imei);
      logger.debug('Device connection removed', { imei });
    }
  }

  static async sendCommandToDevice(imei, command) {
    try {
      const deviceData = activeDevices.get(imei);
      if (deviceData && deviceData.socket) {
        deviceData.socket.write(command);
        logger.info('Command sent to device', { imei, command: command.toString('hex') });
        return true;
      } else {
        logger.warn('Device not connected', { imei });
        return false;
      }
    } catch (error) {
      logger.error('Error sending command to device', { error: error.message, imei });
      return false;
    }
  }

  // Clean up inactive devices (run this periodically)
  static cleanupInactiveDevices(timeoutMinutes = 30) {
    const now = new Date();
    const timeoutMs = timeoutMinutes * 60 * 1000;
    
    for (const [imei, data] of activeDevices.entries()) {
      if (now - data.lastUpdate > timeoutMs) {
        activeDevices.delete(imei);
        logger.info('Removed inactive device', { imei, lastUpdate: data.lastUpdate });
      }
    }
  }
}

// Set up periodic cleanup
setInterval(() => {
  DeviceManager.cleanupInactiveDevices();
}, 5 * 60 * 1000); // Clean up every 5 minutes

module.exports = DeviceManager;