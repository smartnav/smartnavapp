# Combined Student Attendance & GPS Tracker Application

A comprehensive system that combines student attendance management with RFID technology and GPS tracking for Concox V5 devices.

## Features

### Attendance System
- RFID-based student attendance tracking
- Manual attendance entry
- Real-time attendance updates
- Student management
- Attendance reports and analytics

### GPS Tracker
- Concox V5 device support
- Real-time location tracking
- Location history
- Device management
- Travel path visualization

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- CassandraDB
- RFID Reader (serial port)
- Concox V5 GPS devices

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install



## TREE STRUCTURE

scanntrack
├── .env
├── .gitignore
├── attendance-system
│   ├── controllers
│   │   ├── attendanceController.js
│   │   ├── authController.js
│   │   └── studentController.js
│   ├── middleware
│   │   └── auth.js
│   ├── models
│   │   ├── Attendance.js
│   │   ├── Student.js
│   │   └── User.js
│   ├── routes
│   │   ├── attendanceRoutes.js
│   │   ├── authRoutes.js
│   │   └── studentRoutes.js
│   └── services
│       └── rfidService.js
├── gps-tracker
│   ├── adapters
│   │   └── concoxV5Adapter.js
│   ├── models
│   │   ├── cassandra
│   │   │   └── realtimeData.js
│   │   └── mongodb
│   │       ├── Device.js
│   │       └── Location.js
│   ├── routes
│   │   ├── deviceRoutes.js
│   │   └── trackingRoutes.js
│   ├── services
│   │   ├── dataProcessing.js
│   │   ├── deviceManager.js
│   │   └── tcpServer.js
│   └── utils
│       ├── checksum.js
│       ├── geoUtils.js
│       └── protocolParser.js
├── package-lock.json
├── package.json
├── public
│   ├── css
│   ├── index.html
│   └── js
├── README.md
├── server.js
└── shared
    ├── config
    │   ├── astra.js
    │   └── db.js
    ├── middleware
    │   └── rateLimiter.js
    └── utils
        └── logger.js