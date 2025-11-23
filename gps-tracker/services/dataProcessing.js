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

      const protocolType = data[3]; // CORRECTED: Protocol type is at byte 3
      let result = null;
      console.log("protocolType", protocolType)
      switch (protocolType) {
        case 0x01: // Login packet
          result = ConcoxV5Adapter.parseLoginPacket(data);
          console.log("protocolType restul", result)
          if (result) {
            await DataProcessingService.handleLogin(result, socket);
          }
          break;

        case 0x12: // Location packet - CORRECTED: 0x12 not 0x22
          result = ConcoxV5Adapter.parseLocationPacket(data);
          if (result) {
            await this.handleLocation(data, result, socket);
          }
          break;

        case 0x11: // Heartbeat packet - CORRECTED: 0x11 not 0x13
          result = ConcoxV5Adapter.parseHeartbeatPacket(data); // ADD THIS
          if (result) {
            await this.handleHeartbeat(result, socket);
          }
          break;

        case 0x13: // Status packet - 0x13 is actually status, not heartbeat
          result = ConcoxV5Adapter.parseStatusPacket(data); // You might want to add this
          if (result) {
            await this.handleStatus(result, socket);
          }
          break;

        default:
          logger.warn('Unknown packet type received', { protocolType });
          break;
      }

      return result;
    } catch (error) {
      logger.error('Error processing Concox data', { error: error.message });
      return null;
    }
  }

  // ... keep your existing handleLogin and handleLocation methods ...
  

  static async handleHeartbeat(heartbeatData, socket) { // UPDATED METHOD
    try {
      // Update device last connection time
      if (heartbeatData.imei) {
        await Device.findOneAndUpdate(
          { imei: heartbeatData.imei },
          { 
            lastConnection: new Date(),
            status: 'online'
          }
        );
        logger.debug('Heartbeat received', { imei: heartbeatData.imei });
      }

      // Send heartbeat response
      const response = ConcoxV5Adapter.createHeartbeatResponse(); // UPDATE THIS
      socket.write(response);
      
      logger.debug('Heartbeat response sent');
    } catch (error) {
      logger.error('Error handling heartbeat', { error: error.message });
    }
  }

  // ADD THIS NEW METHOD FOR STATUS PACKETS
  static async handleStatus(statusData, socket) {
    try {
      if (statusData.imei) {
        await Device.findOneAndUpdate(
          { imei: statusData.imei },
          { 
            lastConnection: new Date(),
            status: 'online',
            batteryLevel: statusData.batteryLevel,
            // ... other status fields ...
          }
        );
      }
      
      const response = ConcoxV5Adapter.createStatusResponse();
      socket.write(response);
      
      logger.debug('Status packet handled', { imei: statusData.imei });
    } catch (error) {
      logger.error('Error handling status', { error: error.message });
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
          protocolVersion: 'Concox V5',
          status: 'online',
          firstSeen: new Date(),
          lastConnection: new Date(),
          isActive: true
        });
        await device.save();
        logger.info('New device registered', { imei: loginData.imei });
      } else {
        // Update existing device
        device.lastConnection = new Date();
        device.status = 'online';
        device.isActive = true;
        await device.save();
      }

      // Send login response (78 78 05 01 00 01 D9 DC 0D 0A)
      const response = ConcoxV5Adapter.createLoginResponse(loginData.imei);
      socket.write(response);

      logger.info('Login successful', { 
        imei: loginData.imei,
        deviceId: device._id 
      });

      return device;

    } catch (error) {
      logger.error('Error handling login', { 
        error: error.message,
        imei: loginData.imei 
      });
      throw error;
    }
  }
}

module.exports = DataProcessingService;