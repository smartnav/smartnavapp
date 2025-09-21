class ChecksumUtils {
  static calculateChecksum(data) {
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum += data[i];
    }
    return checksum & 0xFFFF;
  }

  static verifyChecksum(data, expectedChecksum) {
    const calculatedChecksum = this.calculateChecksum(data);
    return calculatedChecksum === expectedChecksum;
  }

  static calculateCRC16(data) {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        if (crc & 0x0001) {
          crc = (crc >> 1) ^ 0xA001;
        } else {
          crc = crc >> 1;
        }
      }
    }
    return crc;
  }
}

module.exports = ChecksumUtils;