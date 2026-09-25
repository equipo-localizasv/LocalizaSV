const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
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

// Configuración de Helmet ajustada
app.use(helmet({
    crossOriginResourcePolicy: false
}));

const allowedOrigins = [
    'https://localizasv.dpdns.org',
    'https://www.localizasv.dpdns.org',
    'http://localhost:5173',
    'http://localhost:3000'
];

// Opciones de CORS optimizadas
const corsOptions = {
    origin: function (origin, callback) {
        // Permitir peticiones sin origen (Postman, curl, Server-to-Server)
        if (!origin) return callback(null, true);

        // Verificar orígenes permitidos o subdominios
        const isAllowed = allowedOrigins.includes(origin) || 
                          origin.endsWith('.netlify.app') || 
                          origin.endsWith('.dpdns.org');

        if (isAllowed) {
            return callback(null, true);
        } else {
            console.warn(`⚠️ [CORS] Origen bloqueado: ${origin}`);
            // Regresar false evita que Express lance un error 500 sin cabeceras
            return callback(null, false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Aplicar CORS globalmente y responder a peticiones Preflight (OPTIONS)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/casos', caseRoutes); 
app.use('/api/detecciones', detectionRoutes);
app.use('/api/alertas', alertRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/camaras', cameraRoutes);
app.use('/api/avistamientos', sightingRoutes);
if (biometriaRoutes) {
    app.use('/api/biometria', biometriaRoutes);
}

app.get('/', (req, res) => {
    res.json({ message: 'LocalizaSV API running with WebSocket support' });
});

app.use((req, res, next) => {
    res.status(404).json({ 
        error: 'Ruta no encontrada', 
        path: req.originalUrl 
    });
});

// Manejador de errores global asegurando cabecera CORS
app.use((err, req, res, next) => {
    console.error('API Error:', err.message || err);
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(err.status || 500).json({ 
        error: err.message || 'Internal Server Error' 
    });
});

const server = http.createServer(app);
const { initWebSocketServer, broadcast } = require('./wsServer');
const surveillanceService = require('./services/surveillanceService');

server.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT} en modo ${process.env.NODE_ENV || 'development'}`);
});

try {
    initWebSocketServer(server);
    surveillanceService.setWebSocketBroadcaster(broadcast);
    surveillanceService.start();
} catch (wsErr) {
    console.warn('Advertencia al iniciar servicios secundarios:', wsErr.message);
}

module.exports = app;
module.exports.server = server;
module.exports.broadcast = broadcast;
