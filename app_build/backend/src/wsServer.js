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
  });

  console.log('Servidor WebSocket inicializado');
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
