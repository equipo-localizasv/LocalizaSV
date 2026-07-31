/**
 * LocalizaSV - Servidor de Pruebas WebSocket (Requisito 28)
 * 
 * Este script inicia un servidor WebSocket en ws://localhost:3001/ws
 * y proporciona un menú interactivo en la consola (o emisión periódica) 
 * para enviar los eventos 'nueva_alerta' y 'alerta_actualizada' al frontend.
 */

const http = require('http');
const WebSocket = require('ws');

const PORT = 3001;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'LocalizaSV WebSocket Test Server Running' }));
});

const wss = new WebSocket.Server({ noServer: true });

// Manejo del Upgrade a WebSocket en la ruta /ws o cualquier ruta
server.on('upgrade', (request, socket, head) => {
  console.log(`🔌 Solicitud de Upgrade WebSocket desde: ${request.url}`);
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws, req) => {
  console.log('✅ Cliente conectado al WebSocket de LocalizaSV.');

  ws.on('message', (message) => {
    console.log('📩 Mensaje recibido del cliente:', message.toString());
  });

  ws.on('close', () => {
    console.log('🛑 Cliente desconectado.');
  });
});

/**
 * Emite un evento a todos los clientes WebSocket conectados
 */
function broadcast(eventName, data) {
  const payload = JSON.stringify({ event: eventName, data });
  let count = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
      count++;
    }
  });
  console.log(`📡 Evento "${eventName}" enviado a ${count} cliente(s) conectado(s).`);
}

// Iniciar servidor
server.listen(PORT, () => {
  console.log('===========================================================');
  console.log(`🚀 Servidor WebSocket de Pruebas escuchando en ws://localhost:${PORT}/ws`);
  console.log('===========================================================');
  console.log('Comandos de prueba automáticos activados:');
  console.log(' - Cada 10s se emitirá una "nueva_alerta"');
  console.log(' - Cada 15s se emitirá una "alerta_actualizada"');
  console.log('===========================================================\n');

  let alertIdCounter = 100;

  // 1. Simulación periódica de 'nueva_alerta' (Requisito 25)
  setInterval(() => {
    if (wss.clients.size > 0) {
      alertIdCounter++;
      const sampleNames = ['María Elena López', 'Carlos Eduardo Rivas', 'Sofia Beatriz Gomez', 'Jose Manuel Torres'];
      const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];

      const newAlert = {
        id: alertIdCounter,
        caso_id: Math.floor(Math.random() * 5) + 1,
        nombre_desaparecido: randomName,
        ubicacion_lat: 13.6929 + (Math.random() - 0.5) * 0.2,
        ubicacion_lng: -89.2182 + (Math.random() - 0.5) * 0.3,
        porcentaje_confianza: Math.floor(Math.random() * 25) + 75,
        estado: 'pendiente',
        created_at: new Date().toISOString()
      };

      console.log(`\n🚨 Emitiendo "nueva_alerta" #${newAlert.id} (${newAlert.nombre_desaparecido})...`);
      broadcast('nueva_alerta', newAlert);
    }
  }, 10000);

  // 2. Simulación periódica de 'alerta_actualizada' (Requisito 26)
  setInterval(() => {
    if (wss.clients.size > 0 && alertIdCounter > 100) {
      const targetId = alertIdCounter;
      const statuses = ['confirmado', 'falso positivo'];
      const nextStatus = statuses[Math.floor(Math.random() * statuses.length)];

      const updatedAlert = {
        id: targetId,
        estado: nextStatus,
        updated_at: new Date().toISOString()
      };

      console.log(`\n🔄 Emitiendo "alerta_actualizada" #${targetId} (Estado: ${nextStatus})...`);
      broadcast('alerta_actualizada', updatedAlert);
    }
  }, 15000);
});
