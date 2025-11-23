// gps-tracker/adapters/concoxV5Adapter.js
const logger = require('../../shared/utils/logger');

class ConcoxV5Adapter {
  /**
   * Parse Concox V5 protocol packet
   */
  static parsePacket(buffer) {
    try {
      // Verify start bits
      if (buffer[0] !== 0x78 || buffer[1] !== 0x78) {
        throw new Error('Invalid start bits');
      }

      const packetLength = buffer[2];
      const protocolNumber = buffer[3];

      // Verify packet length
      if (buffer.length !== packetLength + 5) {
        throw new Error(`Invalid packet length: expected ${packetLength + 5}, got ${buffer.length}`);
      }

      // Verify checksum
      const dataSegment = buffer.slice(2, buffer.length - 3);
      const receivedChecksum = buffer.readUInt16BE(buffer.length - 3);
      const calculatedChecksum = this.calculateChecksum(dataSegment);
      
      if (receivedChecksum !== calculatedChecksum) {
        throw new Error(`Checksum mismatch: received ${receivedChecksum.toString(16)}, calculated ${calculatedChecksum.toString(16)}`);
      }

      // Parse based on protocol number
      switch (protocolNumber) {
        case 0x01: // Login packet
          return this.parseLoginPacket(buffer);
        case 0x11: // Heartbeat packet
          return this.parseHeartbeatPacket(buffer);
        case 0x12: // Location packet
          return this.parseLocationPacket(buffer);
        case 0x13: // Status packet
          return this.parseStatusPacket(buffer);
        case 0x15: // Alarm packet
          return this.parseAlarmPacket(buffer);
        default:
          throw new Error(`Unknown protocol number: 0x${protocolNumber.toString(16)}`);
      }
    } catch (error) {
      logger.error('Error parsing Concox packet', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract IMEI from buffer (bytes 4-11 as decimal string)
   */
  static extractIMEI(buffer) {
  if (buffer.length < 12) return null;
  
  // The IMEI is BCD encoded in 8 bytes = 16 BCD digits
  // But IMEI should be 15 digits, so we need to drop one digit
  let bcdImei = '';
  for (let i = 4; i < 12; i++) {
    // Each byte contains 2 BCD digits
    const byte = buffer[i];
    const digit1 = Math.floor(byte / 16); // First digit (high nibble)
    const digit2 = byte % 16;             // Second digit (low nibble)
    
    bcdImei += digit1.toString(10) + digit2.toString(10);
  }
  
  // BCD gives us 16 digits, but IMEI should be 15 digits
  // Usually the first digit is 0 and should be dropped
  if (bcdImei.length === 16 && bcdImei[0] === '0') {
    return bcdImei.substring(1); // Remove leading zero
  }
  
  return bcdImei.length === 15 ? bcdImei : bcdImei.substring(0, 15);
}

/**
 * Alternative: Direct byte conversion (if BCD doesn't work)
 */
static extractIMEIDirect(buffer) {
  if (buffer.length < 12) return null;
  
  // Try treating bytes as direct decimal values
  const imeiBytes = buffer.slice(4, 12);
  return Array.from(imeiBytes).map(byte => byte.toString(10)).join('');
}

/**
 * Parse login packet with debug information
 */
static parseLoginPacket(buffer) {
  console.log('Raw IMEI bytes:', Array.from(buffer.slice(4, 12)).map(b => b.toString(16).padStart(2, '0')));
  
  // Try BCD method first
  let imei = this.extractIMEI(buffer);
  console.log('BCD IMEI result:', imei);
  
  // If BCD doesn't give 15 digits, try direct method
  if (!imei || imei.length !== 15) {
    imei = this.extractIMEIDirect(buffer);
    console.log('Direct IMEI result:', imei);
  }
  
  // If still wrong, let's manually decode the bytes
  if (imei.length !== 15) {
    console.log('Manual byte analysis:');
    for (let i = 4; i < 12; i++) {
      const byte = buffer[i];
      console.log(`Byte ${i} (0x${byte.toString(16).padStart(2, '0')}): ${byte} = ${Math.floor(byte / 16)}${byte % 16}`);
    }
  }
  
  const serialNumber = buffer.slice(12, 18).toString('hex');
  
  return {
    protocolType: 0x01,
    type: 'login',
    imei: imei,
    serialNumber: serialNumber,
    rawData: buffer.toString('hex'),
    timestamp: new Date()
  };
}

  /**
   * Parse heartbeat packet (Protocol 0x11)
   */
  static parseHeartbeatPacket(buffer) {
    const imei = this.extractIMEI(buffer);
    
    return {
      protocolType: 0x11,
      type: 'heartbeat',
      imei: imei,
      rawData: buffer.toString('hex'),
      timestamp: new Date()
    };
  }

  /**
   * Parse location packet (Protocol 0x12)
   */
  static parseLocationPacket(buffer) {
    const imei = this.extractIMEI(buffer);
    const offset = 12;

    // Parse date and time
    const year = 2000 + buffer[offset];
    const month = buffer[offset + 1] - 1; // JavaScript months are 0-based
    const day = buffer[offset + 2];
    const hour = buffer[offset + 3];
    const minute = buffer[offset + 4];
    const second = buffer[offset + 5];
    
    const timestamp = new Date(year, month, day, hour, minute, second);

    // Parse GPS information
    const satellites = buffer[offset + 6];
    const latitude = buffer.readInt32LE(offset + 7) / 1800000.0;
    const longitude = buffer.readInt32LE(offset + 11) / 1800000.0;
    const speed = buffer[offset + 15];
    const course = buffer.readUInt16LE(offset + 16) & 0x3FF; // 10 bits for course
    const courseStatus = (buffer.readUInt16LE(offset + 16) >> 10) & 0x0F;

    // Parse additional flags (byte 18-19)
    const mcc = buffer.readUInt16BE(offset + 18);
    const mnc = buffer[offset + 20];
    const lac = buffer.readUInt16BE(offset + 21);
    const cellId = buffer.readUInt16BE(offset + 23);

    // Parse status information (byte 25)
    const statusByte = buffer[offset + 25];
    const gpsStatus = (statusByte & 0x40) ? 'A' : 'V'; // GPS fix status
    const ignition = (statusByte & 0x20) ? true : false; // Ignition status
    const chargeStatus = (statusByte & 0x10) ? true : false; // Charging status
    const accStatus = (statusByte & 0x08) ? true : false; // ACC status
    const defenseStatus = (statusByte & 0x04) ? true : false; // Defense status

    // Parse battery level (byte 26)
    const batteryLevel = buffer[offset + 26];

    return {
      protocolType: 0x12,
      type: 'location',
      imei: imei,
      timestamp: timestamp,
      latitude: latitude,
      longitude: longitude,
      speed: speed,
      heading: course,
      satellites: satellites,
      gpsStatus: gpsStatus,
      ignition: ignition,
      batteryLevel: batteryLevel,
      chargeStatus: chargeStatus,
      accStatus: accStatus,
      defenseStatus: defenseStatus,
      mcc: mcc,
      mnc: mnc,
      lac: lac,
      cellId: cellId,
      rawData: buffer.toString('hex')
    };
  }

  /**
   * Parse status packet (Protocol 0x13)
   */
  static parseStatusPacket(buffer) {
    const imei = this.extractIMEI(buffer);
    const offset = 12;

    const statusByte = buffer[offset];
    const ignition = (statusByte & 0x20) ? true : false;
    const chargeStatus = (statusByte & 0x10) ? true : false;
    const accStatus = (statusByte & 0x08) ? true : false;
    const defenseStatus = (statusByte & 0x04) ? true : false;
    const batteryLevel = buffer[offset + 1];
    const gsmSignal = buffer[offset + 2];

    return {
      protocolType: 0x13,
      type: 'status',
      imei: imei,
      ignition: ignition,
      batteryLevel: batteryLevel,
      chargeStatus: chargeStatus,
      accStatus: accStatus,
      defenseStatus: defenseStatus,
      gsmSignal: gsmSignal,
      rawData: buffer.toString('hex'),
      timestamp: new Date()
    };
  }

  /**
   * Parse alarm packet (Protocol 0x15)
   */
  static parseAlarmPacket(buffer) {
    const locationData = this.parseLocationPacket(buffer);
    const alarmType = buffer[27]; // Alarm type byte

    const alarmTypes = {
      0x01: 'SOS',
      0x02: 'PowerCut',
      0x03: 'Vibration',
      0x04: 'EnterFence',
      0x05: 'ExitFence',
      0x06: 'OverSpeed',
      0x09: 'PowerOn',
      0x0A: 'PowerOff',
      0x0B: 'EnterSleep',
      0x0C: 'ExitSleep',
      0x0D: 'Displacement',
      0x0E: 'Collision',
      0x0F: 'LowBattery'
    };

    return {
      ...locationData,
      protocolType: 0x15,
      type: 'alarm',
      alarmType: alarmTypes[alarmType] || `Unknown (0x${alarmType.toString(16)})`,
      alarmCode: alarmType
    };
  }

  /**
   * Calculate checksum for Concox protocol
   */
  static calculateChecksum(buffer) {
    let checksum = 0;
    for (let i = 0; i < buffer.length; i++) {
      checksum += buffer[i] & 0xFF;
    }
    return checksum & 0xFFFF;
  }

  /**
   * Create login response (Protocol 0x01)
   */
  static createLoginResponse(imei) {
    const response = Buffer.alloc(10);
    response[0] = 0x78; // Start bit
    response[1] = 0x78; // Start bit
    response[2] = 0x05; // Length
    response[3] = 0x01; // Protocol number (login)
    response[4] = 0x00; // Success code
    response[5] = 0x01; // Serial number high byte
    response[6] = 0x00; // Serial number low byte (can be any value)
    
    // Calculate checksum for bytes 2-6
    let checksum = 0;
    for (let i = 2; i <= 6; i++) {
      checksum += response[i];
    }
    checksum = checksum & 0xFFFF;
    
    response[7] = (checksum >> 8) & 0xFF; // High byte
    response[8] = checksum & 0xFF;        // Low byte
    response[9] = 0x0D; // Stop bit
    response[10] = 0x0A; // Stop bit
    
    return response;
  }

  /**
   * Create heartbeat response (Protocol 0x11)
   */
  static createHeartbeatResponse() {
    const response = Buffer.alloc(9);
    response[0] = 0x78; // Start bit
    response[1] = 0x78; // Start bit
    response[2] = 0x05; // Length
    response[3] = 0x11; // Protocol number (heartbeat)
    response[4] = 0x01; // Success code
    
    // Calculate checksum for bytes 2-4
    let checksum = 0;
    for (let i = 2; i <= 4; i++) {
      checksum += response[i];
    }
    checksum = checksum & 0xFFFF;
    
    response[5] = (checksum >> 8) & 0xFF; // High byte
    response[6] = checksum & 0xFF;        // Low byte
    response[7] = 0x0D; // Stop bit
    response[8] = 0x0A; // Stop bit
    
    return response;
  }

  /**
   * Create location response (Protocol 0x12)
   */
  static createLocationResponse(imei) {
    const response = Buffer.alloc(9);
    response[0] = 0x78; // Start bit
    response[1] = 0x78; // Start bit
    response[2] = 0x05; // Length
    response[3] = 0x12; // Protocol number (location)
    response[4] = 0x01; // Success code
    
    // Calculate checksum for bytes 2-4
    let checksum = 0;
    for (let i = 2; i <= 4; i++) {
      checksum += response[i];
    }
    checksum = checksum & 0xFFFF;
    
    response[5] = (checksum >> 8) & 0xFF; // High byte
    response[6] = checksum & 0xFF;        // Low byte
    response[7] = 0x0D; // Stop bit
    response[8] = 0x0A; // Stop bit
    
    return response;
  }

  /**
   * Create status response (Protocol 0x13)
   */
  static createStatusResponse() {
    const response = Buffer.alloc(9);
    response[0] = 0x78; // Start bit
    response[1] = 0x78; // Start bit
    response[2] = 0x05; // Length
    response[3] = 0x13; // Protocol number (status)
    response[4] = 0x01; // Success code
    
    // Calculate checksum for bytes 2-4
    let checksum = 0;
    for (let i = 2; i <= 4; i++) {
      checksum += response[i];
    }
    checksum = checksum & 0xFFFF;
    
    response[5] = (checksum >> 8) & 0xFF; // High byte
    response[6] = checksum & 0xFF;        // Low byte
    response[7] = 0x0D; // Stop bit
    response[8] = 0x0A; // Stop bit
    
    return response;
  }

  /**
   * Create alarm response (Protocol 0x15)
   */
  static createAlarmResponse() {
    const response = Buffer.alloc(9);
    response[0] = 0x78; // Start bit
    response[1] = 0x78; // Start bit
    response[2] = 0x05; // Length
    response[3] = 0x15; // Protocol number (alarm)
    response[4] = 0x01; // Success code
    
    // Calculate checksum for bytes 2-4
    let checksum = 0;
    for (let i = 2; i <= 4; i++) {
      checksum += response[i];
    }
    checksum = checksum & 0xFFFF;
    
    response[5] = (checksum >> 8) & 0xFF; // High byte
    response[6] = checksum & 0xFF;        // Low byte
    response[7] = 0x0D; // Stop bit
    response[8] = 0x0A; // Stop bit
    
    return response;
  }

  /**
   * Validate packet structure
   */
  static isValidPacket(buffer) {
    if (buffer.length < 10) return false;
    if (buffer[0] !== 0x78 || buffer[1] !== 0x78) return false;
    
    const packetLength = buffer[2];
    if (buffer.length !== packetLength + 5) return false;
    
    // Basic checksum validation
    const dataSegment = buffer.slice(2, buffer.length - 3);
    const receivedChecksum = buffer.readUInt16BE(buffer.length - 3);
    const calculatedChecksum = this.calculateChecksum(dataSegment);
    
    return receivedChecksum === calculatedChecksum;
  }
}

module.exports = ConcoxV5Adapter;