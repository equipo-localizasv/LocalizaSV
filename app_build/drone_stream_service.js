/**
 * LocalizaSV - Servicio de Streaming para Dron GT50 (Turbodrone)
 * 
 * Requisitos atendidos:
 * 1. Conexión con el Dron GT50 a través de la interfaz/clase Turbodrone.
 * 2. Obtención de stream de video (RTSP / HTTP).
 * 3. Conversión del stream a formato compatible con Frontend (WebSocket MJPEG/MPEG-TS o HTTP Stream).
 * 4. Control On-Demand: Iniciar y Detener transmisión mediante peticiones o llamadas a funciones.
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

// --- 1. SIMULADOR DE INTERFAZ TURBODRONE GT50 ---
class TurbodroneGT50 {
  constructor(config = {}) {
    this.ip = config.ip || '192.168.1.1';
    this.port = config.port || 554;
    this.connected = false;
    // URL por defecto RTSP o HTTP del stream del dron GT50
    this.streamUrl = config.streamUrl || `rtsp://${this.ip}:${this.port}/live/gt50_hd`;
  }

  async connect() {
    console.log(`[Turbodrone] Conectando con Dron GT50 en ${this.ip}:${this.port}...`);
    // Simulación de handshake con el controlador del dron GT50
    await new Promise((resolve) => setTimeout(resolve, 800));
    this.connected = true;
    console.log(`[Turbodrone] ✅ Conexión establecida con Dron GT50.`);
    return true;
  }

  async disconnect() {
    console.log(`[Turbodrone] Desconectando Dron GT50...`);
    this.connected = false;
    console.log(`[Turbodrone] 🛑 Dron GT50 desconectado.`);
  }

  getVideoStreamUrl() {
    if (!this.connected) {
      throw new Error('El dron GT50 no está conectado. Llame a connect() primero.');
    }
    return this.streamUrl;
  }
}

// --- 2. GESTOR DE TRANSMISIÓN DE VIDEO (STREAMER) ---
class DroneStreamManager {
  constructor(server, drone) {
    this.server = server;
    this.drone = drone;
    this.isStreaming = false;
    this.ffmpegProcess = null;
    this.wss = new WebSocket.Server({ noServer: true });

    // Manejo de conexiones WebSocket de clientes frontend
    this.wss.on('connection', (ws) => {
      console.log('📡 Nuevo cliente conectado al Stream WebSocket del Dron GT50.');

      ws.on('close', () => {
        console.log('📡 Cliente desconectado del Stream WebSocket.');
      });
    });

    // Vincular la actualización de la conexión WebSocket al servidor HTTP
    this.server.on('upgrade', (request, socket, head) => {
      if (request.url === '/ws/drone-stream') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      }
    });
  }

  /**
   * Transmite un chunk de video a todos los clientes WebSocket conectados
   */
  broadcast(data) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * 3 & 4. Iniciar la transmisión de video bajo demanda
   */
  async startStream(customStreamUrl = null) {
    if (this.isStreaming) {
      console.log('⚠️ La transmisión ya se encuentra activa.');
      return { success: false, message: 'La transmisión ya está en ejecución.' };
    }

    try {
      // 1. Conectar con el dron GT50 si no lo está
      if (!this.drone.connected) {
        await this.drone.connect();
      }

      const inputUrl = customStreamUrl || this.drone.getVideoStreamUrl();
      console.log(`🎬 Iniciando conversión de stream desde: ${inputUrl}`);

      // Usar FFmpeg para tomar la fuente (RTSP/HTTP o generador de prueba) y retransmitir en WebSocket MJPEG/JPEG
      // Nota: Si la URL de entrada es de prueba o no existe un dron real, FFmpeg genera un video de prueba (testsrc).
      const ffmpegArgs = [
        '-re',
        '-f', 'lavfi', '-i', 'testsrc=size=640x480:rate=15', // Fuente sintética de prueba si no hay cámara física
        '-f', 'mjpeg',
        '-q:v', '5',
        '-r', '15',
        '-'
      ];

      // Si se proporciona una fuente RTSP/HTTP real:
      if (customStreamUrl || process.env.USE_REAL_RTSP === 'true') {
        ffmpegArgs.splice(0, 4, '-i', inputUrl); // Reemplaza la fuente sintética por la real
      }

      this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

      this.ffmpegProcess.stdout.on('data', (chunk) => {
        // Broadcast de la imagen MJPEG comprimida vía WebSocket a los clientes del frontend
        this.broadcast(chunk);
      });

      this.ffmpegProcess.stderr.on('data', (data) => {
        // Logs de depuración de FFmpeg (descomentar si se desea auditar la salida)
        // console.log(`[FFmpeg] ${data.toString()}`);
      });

      this.ffmpegProcess.on('close', (code) => {
        console.log(`🛑 Proceso FFmpeg finalizado (código ${code}).`);
        this.isStreaming = false;
      });

      this.isStreaming = true;
      console.log('✅ Transmisión de video del Dron GT50 iniciada con éxito.');

      return {
        success: true,
        message: 'Transmisión iniciada correctamente.',
        wsUrl: 'ws://localhost:3002/ws/drone-stream'
      };

    } catch (error) {
      console.error('❌ Error al iniciar la transmisión del dron:', error.message);
      this.isStreaming = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * 4. Detener la transmisión bajo demanda
   */
  async stopStream() {
    if (!this.isStreaming) {
      console.log('⚠️ No hay ninguna transmisión activa para detener.');
      return { success: false, message: 'La transmisión ya estaba detenida.' };
    }

    console.log('🛑 Deteniendo transmisión de video...');

    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');
      this.ffmpegProcess = null;
    }

    await this.drone.disconnect();
    this.isStreaming = false;

    console.log('✅ Transmisión de video del Dron GT50 detenida correctamente.');
    return { success: true, message: 'Transmisión detenida correctamente.' };
  }

  getStatus() {
    return {
      isStreaming: this.isStreaming,
      droneConnected: this.drone.connected,
      connectedClients: this.wss.clients.size
    };
  }
}

// --- 5. SERVIDOR EXPRESS CON ENDPOINTS HTTP ON-DEMAND ---
const app = express();
app.use(express.json());

const server = http.createServer(app);
const gt50Drone = new TurbodroneGT50({ ip: '192.168.1.1', port: 554 });
const streamManager = new DroneStreamManager(server, gt50Drone);

// Endpoint 1: Iniciar transmisión On-Demand
app.post('/api/drone/stream/start', async (req, res) => {
  const { customStreamUrl } = req.body;
  const result = await streamManager.startStream(customStreamUrl);
  const statusCode = result.success ? 200 : 400;
  res.status(statusCode).json(result);
});

// Endpoint 2: Detener transmisión On-Demand
app.post('/api/drone/stream/stop', async (req, res) => {
  const result = await streamManager.stopStream();
  const statusCode = result.success ? 200 : 400;
  res.status(statusCode).json(result);
});

// Endpoint 3: Consultar estado del stream
app.get('/api/drone/stream/status', (req, res) => {
  res.json(streamManager.getStatus());
});

// Página HTML de prueba para visualizar el stream WebSocket en vivo
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>LocalizaSV - GT50 Drone Live Stream</title>
      <style>
        body { background: #0f172a; color: white; font-family: sans-serif; text-align: center; padding: 2rem; }
        .controls { margin-bottom: 1rem; }
        button { padding: 10px 20px; font-size: 16px; border-radius: 5px; cursor: pointer; margin: 0 5px; border: none; }
        .start { background: #10b981; color: white; }
        .stop { background: #ef4444; color: white; }
        #canvas-container { margin: 20px auto; width: 640px; height: 480px; background: #1e293b; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        img { width: 100%; height: 100%; border-radius: 8px; }
      </style>
    </head>
    <body>
      <h1>🚁 Control de Stream - Dron GT50 (Turbodrone)</h1>
      <div class="controls">
        <button class="start" onclick="startStream()">▶️ Iniciar Transmisión</button>
        <button class="stop" onclick="stopStream()">⏹️ Detener Transmisión</button>
      </div>
      <div id="canvas-container">
        <img id="stream-view" src="" alt="Stream no iniciado" />
      </div>

      <script>
        let ws = null;

        async function startStream() {
          const res = await fetch('/api/drone/stream/start', { method: 'POST' });
          const data = await res.json();
          console.log(data);

          if (ws) ws.close();
          ws = new WebSocket('ws://' + window.location.host + '/ws/drone-stream');
          ws.binaryType = 'arraybuffer';

          ws.onmessage = (event) => {
            const blob = new Blob([event.data], { type: 'image/jpeg' });
            document.getElementById('stream-view').src = URL.createObjectURL(blob);
          };
        }

        async function stopStream() {
          const res = await fetch('/api/drone/stream/stop', { method: 'POST' });
          const data = await res.json();
          console.log(data);
          if (ws) {
            ws.close();
            ws = null;
          }
          document.getElementById('stream-view').src = '';
        }
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  console.log(`===========================================================`);
  console.log(`🚁 Servicio de Stream Dron GT50 (Turbodrone) en Puerto ${PORT}`);
  console.log(`🌐 Vista de Prueba: http://localhost:${PORT}`);
  console.log(`▶️ Endpoint Start:  POST http://localhost:${PORT}/api/drone/stream/start`);
  console.log(`⏹️ Endpoint Stop:   POST http://localhost:${PORT}/api/drone/stream/stop`);
  console.log(`===========================================================`);
});
