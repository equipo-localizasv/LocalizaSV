const WebSocket = require('ws');

let wss;

const initWebSocketServer = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('Nuevo cliente WebSocket conectado');

    ws.on('close', () => {
      console.log('Cliente WebSocket desconectado');
    });

    ws.on('error', (error) => {
      console.error('Error en conexión WebSocket:', error);
    });
    
    // Opcional: enviar un mensaje de bienvenida
    ws.send(JSON.stringify({ event: 'connected', message: 'Conectado al servidor WebSocket de LocalizaSV' }));

    // Escuchar mensajes entrantes (Transmisión de fotogramas vía WebSocket de ultra-baja latencia)
    ws.on('message', async (rawMsg) => {
      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed.event === 'camera_frame_upload') {
          const payload = parsed.data || parsed;
          const { camId, image } = payload;
          if (camId && image) {
            const { handleIncomingFrame } = require('./controllers/cameraController');
            if (handleIncomingFrame) {
              await handleIncomingFrame(camId, image);
            }
          }
        }
      } catch (err) {}
    });
  });

  console.log('Servidor WebSocket inicializado con soporte de streaming de video');
};

const broadcast = (event, data) => {
  if (!wss) {
    console.warn('Intento de broadcast antes de inicializar el servidor WebSocket');
    return;
  }

  const payload = JSON.stringify({ event, data });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

module.exports = {
  initWebSocketServer,
  broadcast
};
