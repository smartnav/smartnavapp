class ProtocolParser {
  static parseConcoxV5Packet(data) {
    try {
      // Check start bits
      if (data.length < 10 || data[0] !== 0x78 || data[1] !== 0x78) {
        throw new Error('Invalid packet start bits');
      }

      const protocolNumber = data[2];
      const length = data[3];
      const informationContent = data.slice(4, 4 + length);
      const serialNumber = data.slice(4 + length, 6 + length);
      const errorCheck = data.slice(6 + length, 8 + length);
      const stopBit = data.slice(8 + length, 10 + length);

      // Verify stop bits
      if (stopBit[0] !== 0x0D || stopBit[1] !== 0x0A) {
        throw new Error('Invalid packet stop bits');
      }

      return {
        protocolNumber,
        length,
        informationContent,
        serialNumber: serialNumber.toString('hex'),
        errorCheck: errorCheck.toString('hex'),
        rawData: data.toString('hex')
      };
    } catch (error) {
      throw new Error(`Protocol parsing error: ${error.message}`);
    }
  }

  static parseIMEI(data) {
    if (data.length !== 8) {
      throw new Error('Invalid IMEI length');
    }
    return data.toString('hex');
  }

  static parseDate(data) {
    if (data.length !== 6) {
      throw new Error('Invalid date length');
    }

    const year = 2000 + data[0];
    const month = data[1] - 1; // JavaScript months are 0-indexed
    const day = data[2];
    const hour = data[3];
    const minute = data[4];
    const second = data[5];

    return new Date(year, month, day, hour, minute, second);
  }

  static parseGPSData(data) {
    if (data.length < 15) {
      throw new Error('Invalid GPS data length');
    }

    const date = this.parseDate(data.slice(0, 6));
    const satellites = data[6] & 0x0F;
    const latitude = this.parseCoordinate(data.slice(7, 11));
    const longitude = this.parseCoordinate(data.slice(11, 15));
    
    return {
      date,
      satellites,
      latitude,
      longitude
    };
  }

  static parseCoordinate(data) {
    if (data.length !== 4) {
      throw new Error('Invalid coordinate length');
    }
    return data.readUInt32BE(0) / 30000.0 / 60.0;
  }

  static parseIOData(data) {
    if (data.length < 2) {
      throw new Error('Invalid IO data length');
    }

    const digitalInputs = data[0];
    const digitalOutputs = data[1];

    return {
      digitalInputs,
      digitalOutputs,
      ignition: (digitalInputs & 0x01) === 0x01
    };
  }
}

module.exports = ProtocolParser;