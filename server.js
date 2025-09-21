require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Database connections
const connectDB = require('./shared/config/db');
const astraClient = require('./shared/config/astra');

// Route imports
const authRoutes = require('./attendance-system/routes/authRoutes');
const studentRoutes = require('./attendance-system/routes/studentRoutes');
const attendanceRoutes = require('./attendance-system/routes/attendanceRoutes');
const deviceRoutes = require('./gps-tracker/routes/deviceRoutes');
const trackingRoutes = require('./gps-tracker/routes/trackingRoutes');

// Service imports
//const RFIDService = require('./attendance-system/services/rfidService');
const TCPServer = require('./gps-tracker/services/tcpServer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.API_RATE_LIMIT || 100
});
app.use(limiter);

// Serve static files
app.use(express.static('public'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/tracking', trackingRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      database: 'MongoDB',
      realtime: 'Cassandra',
      rfid: 'Active',
      gps: 'Active'
    }
  });
});

// Main endpoint
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('rfid-subscribe', (data) => {
    socket.join('rfid-updates');
  });
  
  socket.on('gps-subscribe', (data) => {
    socket.join('gps-updates');
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to other modules
app.set('io', io);

// Initialize servers
const initializeServers = async () => {
  try {
    // Connect to databases
    await connectDB();
    await astraClient.connect(); // Connect to Astra DB

    // Initialize RFID service
    console.log('Initializing RFID Service...');
    // const rfidService = require('./attendance-system/services/rfidService');
    
    // Initialize TCP server for GPS devices
    console.log('Starting GPS TCP Server...');
    const tcpServer = new TCPServer(process.env.TCP_PORT || 5020);
    tcpServer.start();

    // Start HTTP server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Combined server running on port ${PORT}`);
      console.log(`Attendance API: http://localhost:${PORT}/api/attendance`);
      console.log(`Tracking API: http://localhost:${PORT}/api/tracking`);
      console.log(`RFID Service: Active on ${process.env.RFID_SERIAL_PORT}`);
      console.log(`GPS TCP Server: Active on port ${process.env.TCP_PORT}`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down servers...');
      tcpServer.stop();
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start servers:', error);
    process.exit(1);
  }
};

initializeServers();