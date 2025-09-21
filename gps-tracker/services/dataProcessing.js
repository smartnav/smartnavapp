const ConcoxV5Adapter = require('../adapters/concoxV5Adapter');
const Location = require('../models/mongodb/Location');
const Device = require('../models/mongodb/Device');
const astraClient = require('../../shared/config/astra');
const logger = require('../../shared/utils/logger');

class DataProcessingService {
  static async processConcoxData(data, socket) {
    try {
      // Check if it's a valid Concox packet
      if (data[0] !== 0x78 || data[1] !== 0x78) {
        logger.warn('Invalid packet format received');
        return null;
      }

      const packetType = data[2];
      let result = null;

      switch (packetType) {
        case 0x01: // Login packet
          result = ConcoxV5Adapter.parseLoginPacket(data);
          if (result) {
            await this.handleLogin(result, socket);
          }
          break;

        case 0x22: // Location packet
          result = ConcoxV5Adapter.parseLocationPacket(data);
          if (result) {
            await this.handleLocation(data, result, socket);
          }
          break;

        case 0x13: // Heartbeat packet
          result = { type: 'heartbeat' };
          await this.handleHeartbeat(data, socket);
          break;

        default:
          logger.warn('Unknown packet type received', { packetType });
          break;
      }

      return result;
    } catch (error) {
      logger.error('Error processing Concox data', { error: error.message });
      return null;
    }
  }

  static async handleLogin(loginData, socket) {
    try {
      // Check if device exists in MongoDB
      let device = await Device.findOne({ imei: loginData.imei });
      
      if (!device) {
        // Auto-register new device
        device = new Device({
          imei: loginData.imei,
          deviceName: `Device-${loginData.imei}`,
          vehicleNumber: `VH-${loginData.imei.slice(-6)}`,
          protocolVersion: 'V5'
        });
        await device.save();
        logger.info('New device registered', { imei: loginData.imei });
      }

      // Update last connection
      device.lastConnection = new Date();
      await device.save();

      // Send login response
      const response = ConcoxV5Adapter.createResponse(0x01, '0001', [0x00]);
      socket.write(response);

      logger.info('Login successful', { imei: loginData.imei });
    } catch (error) {
      logger.error('Error handling login', { error: error.message });
    }
  }

  // Update the handleLocation method to use Astra DB
  static async handleLocation(rawData, locationData, socket) {
    try {
      const device = await Device.findOne({ imei: locationData.imei });
      if (!device) {
        logger.warn('Device not found for location data', { imei: locationData.imei });
        return;
      }

      // Save to MongoDB (unchanged)
      const location = new Location({
        device: device._id,
        imei: device.imei,
        timestamp: locationData.timestamp,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        speed: locationData.speed,
        heading: locationData.heading,
        satellites: locationData.satellites,
        ignition: locationData.ignition,
        mileage: locationData.mileage,
        data: rawData.toString('hex')
      });
      await location.save();

      // Update device last location (unchanged)
      device.lastLocation = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        timestamp: locationData.timestamp,
        speed: locationData.speed,
        heading: locationData.heading
      };
      device.lastConnection = new Date();
      await device.save();

      // Save to Astra DB (updated)
      await this.saveToAstraDB(device.imei, locationData);

      // Emit real-time update (unchanged)
      const io = require('../../server').io;
      io.to('gps-updates').emit('gps-update', {
        device_imei: device.imei,
        timestamp: locationData.timestamp,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        speed: locationData.speed,
        heading: locationData.heading,
        vehicleNumber: device.vehicleNumber
      });

      // Send acknowledgment (unchanged)
      const response = ConcoxV5Adapter.createResponse(0x22, '0001', [0x00]);
      socket.write(response);

      logger.info('Location saved', { imei: device.imei });
    } catch (error) {
      logger.error('Error handling location', { error: error.message });
    }
  }

  static async saveToAstraDB(imei, locationData) {
    try {
      // Save to realtime_data collection
      const realtimeDoc = {
        device_imei: imei,
        timestamp: locationData.timestamp,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        speed: locationData.speed,
        heading: locationData.heading,
        altitude: locationData.altitude || 0,
        satellites: locationData.satellites,
        hdop: locationData.hdop || 0,
        battery: locationData.battery || 0,
        ignition: locationData.ignition || false,
        $vector: [0] // Required field for Astra DB
      };

      await astraClient.insertLocation('realtime_data', realtimeDoc);

      // Also save to daily history
      const dateStr = locationData.timestamp.toISOString().split('T')[0];
      const historyDoc = {
        device_imei: imei,
        date: dateStr,
        timestamp: locationData.timestamp,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        speed: locationData.speed,
        heading: locationData.heading,
        $vector: [0]
      };

      await astraClient.insertLocation('location_history', historyDoc);

    } catch (error) {
      logger.error('Error saving to Astra DB:', { error: error.message });
    }
  }

  static async handleHeartbeat(data, socket) {
    try {
      // Send heartbeat response
      const response = ConcoxV5Adapter.createResponse(0x13, '0001', [0x00]);
      socket.write(response);
      logger.debug('Heartbeat received and responded');
    } catch (error) {
      logger.error('Error handling heartbeat', { error: error.message });
    }
  }
}

module.exports = DataProcessingService;