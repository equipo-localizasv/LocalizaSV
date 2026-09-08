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
app.use('/api/detecciones', detectionRoutes);
app.use('/api/alertas', alertRoutes);
app.use('/api/notifications', notificationRoutes);

// Base route for API status check
app.get('/', (req, res) => {
  res.json({ message: 'LocalizaSV API running with WebSocket support' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err.message || err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

<<<<<<< HEAD
// Server Initialization
const { initWebSocketServer } = require('./wsServer');

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
=======
// Server & WebSocket Initialization
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {
  console.log('🔌 [WebSocket] Cliente conectado al servidor principal LocalizaSV.');
  ws.on('close', () => {
    console.log('🔌 [WebSocket] Cliente desconectado.');
  });
});

/**
 * Transmite un evento a todos los clientes WebSocket conectados
 */
const broadcast = (event, data) => {
  const message = JSON.stringify({ event, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT} with WebSocket support.`);
>>>>>>> 703923d02561cfc9719a4f587f9292a65555b69b
  });
  initWebSocketServer(server);
}

module.exports = app;
module.exports.server = server;
module.exports.broadcast = broadcast;

