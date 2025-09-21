const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

class RFIDService {
  constructor() {
    this.port = null;
    this.parser = null;
    this.tagCallback = null;
    
    this.initializeSerialPort();
  }
  
  initializeSerialPort() {
    try {
      this.port = new SerialPort({
        path: process.env.RFID_SERIAL_PORT || '/dev/ttyUSB0',
        baudRate: parseInt(process.env.RFID_BAUD_RATE) || 9600,
        autoOpen: false
      });

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
      
      this.port.on('open', () => {
        console.log('RFID Reader connected to', process.env.RFID_SERIAL_PORT);
      });
      
      this.port.on('error', (err) => {
        console.error('RFID Reader error:', err.message);
        // Try to reconnect after 5 seconds
        setTimeout(() => this.initializeSerialPort(), 5000);
      });
      
      this.port.on('close', () => {
        console.log('RFID Reader disconnected');
      });
      
      // Open the port
      this.port.open();
      
    } catch (error) {
      console.error('Failed to initialize RFID reader:', error.message);
      // Retry after 5 seconds
      setTimeout(() => this.initializeSerialPort(), 5000);
    }
  }
  
  onTag(callback) {
    this.tagCallback = callback;
    
    if (this.parser) {
      this.parser.on('data', (data) => {
        const tagId = data.trim();
        if (tagId.length > 0 && this.tagCallback) {
          this.tagCallback(tagId);
        }
      });
    }
  }
  
  // Method to manually trigger RFID scan for testing
  simulateRFIDScan(tagId) {
    if (this.tagCallback) {
      this.tagCallback(tagId);
    }
  }
  
  // Check if serial port is open
  isConnected() {
    return this.port && this.port.isOpen;
  }
  
  // Close the serial port
  close() {
    if (this.port && this.port.isOpen) {
      this.port.close();
    }
  }
}

module.exports = new RFIDService();