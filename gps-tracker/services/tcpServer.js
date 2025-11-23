const net = require('net');
const { processConcoxData } = require('./dataProcessing');
const { updateDeviceConnection } = require('./deviceManager');

class TCPServer {
  constructor(port) {
    this.port = port;
    this.server = null;
  }

  start() {
    this.server = net.createServer((socket) => {
      console.log('GPS Device connected:', socket.remoteAddress, socket.remotePort);

      socket.on('data', async (data) => {
        try {
          console.log('Received GPS data:', data.toString('hex'));
          
          // Process Concox V5 protocol data
          const result = await processConcoxData(data, socket);
          console.log("result--------", result)
          if (result && result.imei) {
            // Update device connection status
            await updateDeviceConnection(result.imei, socket);
          }
        } catch (error) {
          console.error('Error processing GPS data:', error);
        }
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      socket.on('close', () => {
        console.log('GPS Device disconnected:', socket.remoteAddress, socket.remotePort);
      });
    });

    this.server.listen(this.port, () => {
      console.log(`GPS TCP Server listening on port ${this.port}`);
    });

    this.server.on('error', (error) => {
      console.error('Server error:', error);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('GPS TCP Server stopped');
    }
  }
}

module.exports = TCPServer;