const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const caseRoutes = require('./routes/caseRoutes');
const detectionRoutes = require('./routes/detectionRoutes');
const alertRoutes = require('./routes/alertRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const cameraRoutes = require('./routes/cameraRoutes');
const sightingRoutes = require('./routes/sightingRoutes');
const biometriaRoutes = require('./routes/biometriaRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Global Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows serving static uploaded images across origins
}));
app.use(cors({
  origin: '*', // Open to local client requests
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files directory for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/casos', caseRoutes); // Soporte bilingüe / según especificación del plan maestro
app.use('/api/detecciones', detectionRoutes);
app.use('/api/alertas', alertRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/camaras', cameraRoutes);
app.use('/api/avistamientos', sightingRoutes);
app.use('/api/biometria', biometriaRoutes);



// Base route for API status check
app.get('/', (req, res) => {
  res.json({ message: 'LocalizaSV API running with WebSocket support' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err.message || err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Server & WebSocket Initialization
const server = http.createServer(app);
const { initWebSocketServer, broadcast } = require('./wsServer');
const surveillanceService = require('./services/surveillanceService');

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT} with WebSocket support.`);
  });
  initWebSocketServer(server);
  surveillanceService.setWebSocketBroadcaster(broadcast);
  surveillanceService.start();
}

module.exports = app;
module.exports.server = server;
module.exports.broadcast = broadcast;


