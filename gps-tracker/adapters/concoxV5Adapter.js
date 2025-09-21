class ConcoxV5Adapter {
  static parseLoginPacket(data) {
    const protocolNumber = data[2];
    const informationContent = data.slice(3, data.length - 4);
    
    if (protocolNumber === 0x01) {
      const imei = informationContent.slice(0, 8).toString('hex');
      return {
        type: 'login',
        imei: imei,
        protocolVersion: informationContent[8],
        timezone: informationContent[9]
      };
    }
    
    return null;
  }

  static parseLocationPacket(data) {
    const protocolNumber = data[2];
    const informationContent = data.slice(3, data.length - 4);
    
    if (protocolNumber === 0x22) {
      const date = new Date(
        2000 + informationContent[0],
        informationContent[1] - 1,
        informationContent[2],
        informationContent[3],
        informationContent[4],
        informationContent[5]
      );

      const satellites = informationContent[6] & 0x0F;
      const latitude = this.parseCoordinate(informationContent.slice(7, 11));
      const longitude = this.parseCoordinate(informationContent.slice(11, 15));
      const speed = informationContent[15];
      const course = informationContent[16] * 2;
      
      const ioStatus = informationContent[17];
      const ignition = (ioStatus & 0x01) === 0x01;
      
      const mileage = informationContent.readUInt16BE(24);
      
      return {
        type: 'location',
        timestamp: date,
        latitude: latitude,
        longitude: longitude,
        speed: speed,
        heading: course,
        satellites: satellites,
        ignition: ignition,
        mileage: mileage
      };
    }
    
    return null;
  }

  static parseCoordinate(data) {
    let degrees = data.readUInt32BE(0) / 30000.0 / 60.0;
    return degrees;
  }

  static calculateChecksum(data) {
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum += data[i];
    }
    return checksum & 0xFFFF;
  }

  static createResponse(protocolNumber, serialNumber, informationContent) {
    const startBit = Buffer.from([0x78, 0x78]);
    const protocolBuffer = Buffer.from([protocolNumber]);
    const serialBuffer = Buffer.from(serialNumber, 'hex');
    const infoBuffer = Buffer.from(informationContent);
    
    const length = infoBuffer.length;
    const lengthBuffer = Buffer.from([length]);
    
    const dataForChecksum = Buffer.concat([protocolBuffer, lengthBuffer, serialBuffer, infoBuffer]);
    const checksum = this.calculateChecksum(dataForChecksum);
    const checksumBuffer = Buffer.alloc(2);
    checksumBuffer.writeUInt16BE(checksum, 0);
    
    const endBit = Buffer.from([0x0D, 0x0A]);
    
    return Buffer.concat([startBit, protocolBuffer, lengthBuffer, serialBuffer, infoBuffer, checksumBuffer, endBit]);
  }
}

module.exports = ConcoxV5Adapter;