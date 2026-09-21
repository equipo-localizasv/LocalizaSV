const db = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Normaliza una dirección ingresada por el usuario a URLs válidas de IP Webcam.
 * Ejemplo de entrada: "192.168.1.50:8080" o "http://192.168.1.50:8080"
 */
const normalizeIpWebcam = (inputStr) => {
  if (!inputStr) return { baseUrl: '', streamUrl: '', snapshotUrl: '', ip: '' };
  
  let clean = inputStr.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `http://${clean}`;
  }
  
  // Remover sufijos comunes como /video o /shot.jpg para obtener la base limpia
  clean = clean.replace(/\/video.*$/, '').replace(/\/shot\.jpg.*$/, '').replace(/\/$/, '');

  const urlObj = new URL(clean);
  const ipWithPort = urlObj.host;

  return {
    ip: ipWithPort,
    baseUrl: clean,
    streamUrl: `${clean}/video`,
    snapshotUrl: `${clean}/shot.jpg`
  };
};

/**
 * Obtener lista de cámaras
 * GET /api/camaras
 */
const getCameras = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM camaras ORDER BY id ASC');
    return res.status(200).json(result.rows || []);
  } catch (error) {
    console.error('Error al obtener cámaras:', error);
    return res.status(500).json({ error: 'Error al consultar las cámaras del sistema.' });
  }
};

/**
 * Registrar una nueva cámara IP / IP Webcam
 * POST /api/camaras
 */
const createCamera = async (req, res) => {
  const { nombre, ip_address, stream_url, ubicacion, lat, lng, tipo, resolucion, fps } = req.body;

  const rawTarget = ip_address || stream_url;
  if (!nombre || !rawTarget) {
    return res.status(400).json({ error: 'El nombre y la IP o URL de la cámara son obligatorios.' });
  }

  const { ip, baseUrl, streamUrl, snapshotUrl } = normalizeIpWebcam(rawTarget);

  try {
    const result = await db.query(
      `INSERT INTO camaras (nombre, ubicacion, lat, lng, stream_url, tipo, resolucion, fps, estado, ip_address, snapshot_url, base_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        nombre,
        ubicacion || 'San Salvador, El Salvador',
        lat ? parseFloat(lat) : 13.6929,
        lng ? parseFloat(lng) : -89.2182,
        streamUrl,
        tipo || 'Cámara Móvil IP Webcam',
        resolucion || '1080p FHD',
        fps ? parseInt(fps) : 30,
        'activa',
        ip,
        snapshotUrl,
        baseUrl
      ]
    );

    return res.status(201).json({
      message: 'Cámara conectada exitosamente.',
      camara: result.rows[0]
    });
  } catch (error) {
    console.error('Error al registrar cámara:', error);
    return res.status(500).json({ error: 'Error al registrar la cámara en el sistema.' });
  }
};

/**
 * Controlador de hardware y comandos PTZ para IP Webcam
 * POST /api/camaras/:id/control
 * Acciones soportadas: 'torch_on', 'torch_off', 'zoom', 'focus', 'switch_camera', 'capture', 'ping'
 */
const controlCamera = async (req, res) => {
  const { id } = req.params;
  const { action, zoomValue, cameraFacing } = req.body;

  try {
    const camRes = await db.query('SELECT * FROM camaras WHERE id = $1', [id]);
    if (!camRes.rows || camRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cámara no encontrada.' });
    }

    const cam = camRes.rows[0];
    const baseUrl = cam.base_url || (cam.ip_address ? (cam.ip_address.startsWith('http') ? cam.ip_address : `http://${cam.ip_address}`) : null);

    if (!baseUrl) {
      return res.status(400).json({ error: 'La cámara no tiene una dirección IP base configurada.' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    let targetEndpoint = '';
    let responseData = { success: true, action };

    switch (action) {
      case 'torch_on':
        targetEndpoint = `${baseUrl}/enabletorch`;
        responseData.linterna = true;
        await db.query('UPDATE camaras SET linterna = $1 WHERE id = $2', [true, id]);
        break;

      case 'torch_off':
        targetEndpoint = `${baseUrl}/disabletorch`;
        responseData.linterna = false;
        await db.query('UPDATE camaras SET linterna = $1 WHERE id = $2', [false, id]);
        break;

      case 'zoom':
        const safeZoom = Math.max(0, Math.min(100, parseInt(zoomValue || 0)));
        targetEndpoint = `${baseUrl}/ptz?zoom=${safeZoom}`;
        responseData.zoom = safeZoom;
        await db.query('UPDATE camaras SET zoom = $1 WHERE id = $2', [safeZoom, id]);
        break;

      case 'zoom_in': {
        const currentZoom = parseInt(cam.zoom || 0);
        const newZoom = Math.min(100, currentZoom + 10);
        targetEndpoint = `${baseUrl}/ptz?zoom=${newZoom}`;
        responseData.zoom = newZoom;
        await db.query('UPDATE camaras SET zoom = $1 WHERE id = $2', [newZoom, id]);
        break;
      }

      case 'zoom_out': {
        const currentZoom = parseInt(cam.zoom || 0);
        const newZoom = Math.max(0, currentZoom - 10);
        targetEndpoint = `${baseUrl}/ptz?zoom=${newZoom}`;
        responseData.zoom = newZoom;
        await db.query('UPDATE camaras SET zoom = $1 WHERE id = $2', [newZoom, id]);
        break;
      }

      // ================= CONTROLES PTZ (PAN - TILT - ZOOM) =================
      case 'ptz_up': {
        const currentTilt = parseInt(cam.tilt || 0);
        const newTilt = Math.min(90, currentTilt + 15);
        targetEndpoint = `${baseUrl}/ptz?move=up&step=15`;
        responseData.tilt = newTilt;
        responseData.pan = parseInt(cam.pan || 0);
        await db.query('UPDATE camaras SET tilt = $1 WHERE id = $2', [newTilt, id]);
        break;
      }

      case 'ptz_down': {
        const currentTilt = parseInt(cam.tilt || 0);
        const newTilt = Math.max(-90, currentTilt - 15);
        targetEndpoint = `${baseUrl}/ptz?move=down&step=15`;
        responseData.tilt = newTilt;
        responseData.pan = parseInt(cam.pan || 0);
        await db.query('UPDATE camaras SET tilt = $1 WHERE id = $2', [newTilt, id]);
        break;
      }

      case 'ptz_left': {
        const currentPan = parseInt(cam.pan || 0);
        const newPan = Math.max(-180, currentPan - 15);
        targetEndpoint = `${baseUrl}/ptz?move=left&step=15`;
        responseData.pan = newPan;
        responseData.tilt = parseInt(cam.tilt || 0);
        await db.query('UPDATE camaras SET pan = $1 WHERE id = $2', [newPan, id]);
        break;
      }

      case 'ptz_right': {
        const currentPan = parseInt(cam.pan || 0);
        const newPan = Math.min(180, currentPan + 15);
        targetEndpoint = `${baseUrl}/ptz?move=right&step=15`;
        responseData.pan = newPan;
        responseData.tilt = parseInt(cam.tilt || 0);
        await db.query('UPDATE camaras SET pan = $1 WHERE id = $2', [newPan, id]);
        break;
      }

      case 'ptz_upleft': {
        const newPan = Math.max(-180, parseInt(cam.pan || 0) - 15);
        const newTilt = Math.min(90, parseInt(cam.tilt || 0) + 15);
        targetEndpoint = `${baseUrl}/ptz?move=upleft`;
        responseData.pan = newPan;
        responseData.tilt = newTilt;
        await db.query('UPDATE camaras SET pan = $1, tilt = $2 WHERE id = $3', [newPan, newTilt, id]);
        break;
      }

      case 'ptz_upright': {
        const newPan = Math.min(180, parseInt(cam.pan || 0) + 15);
        const newTilt = Math.min(90, parseInt(cam.tilt || 0) + 15);
        targetEndpoint = `${baseUrl}/ptz?move=upright`;
        responseData.pan = newPan;
        responseData.tilt = newTilt;
        await db.query('UPDATE camaras SET pan = $1, tilt = $2 WHERE id = $3', [newPan, newTilt, id]);
        break;
      }

      case 'ptz_downleft': {
        const newPan = Math.max(-180, parseInt(cam.pan || 0) - 15);
        const newTilt = Math.max(-90, parseInt(cam.tilt || 0) - 15);
        targetEndpoint = `${baseUrl}/ptz?move=downleft`;
        responseData.pan = newPan;
        responseData.tilt = newTilt;
        await db.query('UPDATE camaras SET pan = $1, tilt = $2 WHERE id = $3', [newPan, newTilt, id]);
        break;
      }

      case 'ptz_downright': {
        const newPan = Math.min(180, parseInt(cam.pan || 0) + 15);
        const newTilt = Math.max(-90, parseInt(cam.tilt || 0) - 15);
        targetEndpoint = `${baseUrl}/ptz?move=downright`;
        responseData.pan = newPan;
        responseData.tilt = newTilt;
        await db.query('UPDATE camaras SET pan = $1, tilt = $2 WHERE id = $3', [newPan, newTilt, id]);
        break;
      }

      case 'ptz_center': {
        targetEndpoint = `${baseUrl}/ptz?move=home`;
        responseData.pan = 0;
        responseData.tilt = 0;
        await db.query('UPDATE camaras SET pan = $1, tilt = $2 WHERE id = $3', [0, 0, id]);
        break;
      }

      case 'ptz_patrol': {
        const newPatrol = !Boolean(cam.patrullaje_activo);
        targetEndpoint = `${baseUrl}/ptz?patrol=${newPatrol ? 'on' : 'off'}`;
        responseData.patrullaje_activo = newPatrol;
        responseData.message = newPatrol ? 'Auto-patrullaje 360° activado.' : 'Auto-patrullaje detenido.';
        await db.query('UPDATE camaras SET patrullaje_activo = $1 WHERE id = $2', [newPatrol, id]);
        break;
      }

      case 'ptz_stop': {
        targetEndpoint = `${baseUrl}/ptz?move=stop`;
        responseData.stopped = true;
        break;
      }

      case 'focus':
        targetEndpoint = `${baseUrl}/focus`;
        responseData.focused = true;
        break;

      case 'switch_camera':
        const isFront = cameraFacing === 'front';
        targetEndpoint = `${baseUrl}/settings/ffc?set=${isFront ? 'on' : 'off'}`;
        responseData.cameraFacing = isFront ? 'front' : 'back';
        break;

      case 'capture':
        targetEndpoint = `${baseUrl}/shot.jpg`;
        break;

      case 'ping':
      case 'status':
        targetEndpoint = `${baseUrl}/status.json`;
        break;

      default:
        return res.status(400).json({ error: `Acción desconocida: ${action}` });
    }

    try {
      if (action === 'capture') {
        const imgRes = await fetch(targetEndpoint, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!imgRes.ok) {
          throw new Error(`Cámara respondió con HTTP ${imgRes.status}`);
        }

        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const filename = `cam-capture-${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, buffer);

        responseData.captured_image_url = `/uploads/${filename}`;
        responseData.message = 'Fotograma capturado con éxito de la cámara IP.';
        return res.status(200).json(responseData);
      }

      const phoneRes = await fetch(targetEndpoint, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (action === 'ping' || action === 'status') {
        const telemetry = await phoneRes.json().catch(() => ({}));
        responseData.telemetry = telemetry;
      }

      return res.status(200).json(responseData);
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      console.warn(`[IP Webcam] Error de comunicación con ${targetEndpoint}:`, fetchErr.message);

      // Si la cámara física no respondió (ej. el teléfono se suspendió), retornamos estado simulado controlado
      return res.status(200).json({
        ...responseData,
        warning: `Comando enviado pero la IP (${cam.ip_address}) tardó en responder. Verifique que la app IP Webcam siga activa.`
      });
    }
  } catch (error) {
    console.error('Error al controlar cámara:', error);
    return res.status(500).json({ error: 'Error interno al enviar el comando a la cámara.' });
  }
};

/**
 * Proxy directo de snapshot en vivo con escudo anti-caídas
 * Si la cámara física está suspendida o apagada, devuelve una imagen táctica de estado
 * en lugar de lanzar errores 504 o romper la interfaz.
 * GET /api/camaras/:id/snapshot
 */
const proxySnapshot = async (req, res) => {
  const { id } = req.params;
  try {
    const camRes = await db.query('SELECT * FROM camaras WHERE id = $1', [id]);
    if (!camRes.rows || camRes.rows.length === 0) {
      return res.status(404).send('Cámara no encontrada.');
    }

    const cam = camRes.rows[0];
    const snapshotUrl = cam.snapshot_url || (cam.base_url ? `${cam.base_url}/shot.jpg` : null);

    if (!snapshotUrl) {
      return sendOfflinePlaceholder(res, cam.nombre, cam.ip_address || 'Sin IP');
    }

    // Soporte para cámaras RTSP (YuiCam / AJCloud)
    if (snapshotUrl.startsWith('rtsp://') || (cam.stream_url && cam.stream_url.startsWith('rtsp://'))) {
      const snapCache = path.join(__dirname, '../../uploads/latest_yuicam_snap.jpg');
      if (fs.existsSync(snapCache)) {
        try {
          const stat = fs.statSync(snapCache);
          if (Date.now() - stat.mtimeMs < 8000) {
            res.set('Content-Type', 'image/jpeg');
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            return res.sendFile(snapCache);
          }
        } catch (e) {}
      }

      const { execFile } = require('child_process');
      const snapScript = path.join(__dirname, '../../scripts/rtsp_snapshot.py');
      const targetRtsp = snapshotUrl.startsWith('rtsp://') ? snapshotUrl : cam.stream_url;
      const tempSnap = path.join(__dirname, `../../uploads/snap_cam_${id}_${Date.now()}.jpg`);

      return execFile('python', [snapScript, targetRtsp, tempSnap], { timeout: 8000 }, (err) => {
        if (err || !fs.existsSync(tempSnap)) {
          return sendOfflinePlaceholder(res, cam.nombre, cam.ip_address);
        }
        try {
          const buffer = fs.readFileSync(tempSnap);
          fs.unlinkSync(tempSnap);
          res.set('Content-Type', 'image/jpeg');
          res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          return res.send(buffer);
        } catch (readErr) {
          return sendOfflinePlaceholder(res, cam.nombre, cam.ip_address);
        }
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2200);

    try {
      const camResponse = await fetch(snapshotUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!camResponse.ok) {
        return sendOfflinePlaceholder(res, cam.nombre, cam.ip_address);
      }

      res.set('Content-Type', 'image/jpeg');
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      const buffer = await camResponse.arrayBuffer();
      return res.send(Buffer.from(buffer));
    } catch (fetchErr) {
      clearTimeout(timeout);
      return sendOfflinePlaceholder(res, cam.nombre, cam.ip_address);
    }
  } catch (err) {
    return sendOfflinePlaceholder(res, 'Cámara', '192.168.1.X');
  }
};

/**
 * Proxy directo de video en vivo (MJPEG Stream)
 * Evita bloqueos CORS o Private Network Access (PNA) del navegador
 * GET /api/camaras/:id/stream
 */
const proxyStream = async (req, res) => {
  const { id } = req.params;
  try {
    const camRes = await db.query('SELECT * FROM camaras WHERE id = $1', [id]);
    if (!camRes.rows || camRes.rows.length === 0) {
      return res.status(404).send('Cámara no encontrada.');
    }

    const cam = camRes.rows[0];
    const streamUrl = cam.stream_url || (cam.base_url ? (cam.base_url.startsWith('rtsp') ? `${cam.base_url}/live/ch1` : `${cam.base_url}/video`) : null);

    if (!streamUrl) {
      return sendOfflinePlaceholder(res, cam.nombre, cam.ip_address || 'Sin IP');
    }

    // Soporte para cámaras RTSP (YuiCam / AJCloud)
    if (streamUrl.startsWith('rtsp://')) {
      const { spawn } = require('child_process');
      const streamerScript = path.join(__dirname, '../../scripts/rtsp_streamer.py');
      const child = spawn('python', [streamerScript, streamUrl, '15', '65']);

      res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=--frame',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'close',
        'Pragma': 'no-cache'
      });

      child.stdout.pipe(res);

      child.on('error', (err) => {
        console.warn('[RTSP Streamer] Error:', err.message);
        if (!res.headersSent) {
          sendOfflinePlaceholder(res, cam.nombre, cam.ip_address);
        }
      });

      req.on('close', () => {
        try {
          child.kill();
        } catch (e) {}
      });
      return;
    }

    const httpModule = streamUrl.startsWith('https') ? require('https') : require('http');
    const proxyReq = httpModule.get(streamUrl, { timeout: 5000 }, (camStream) => {
      if (camStream.statusCode !== 200) {
        return sendOfflinePlaceholder(res, cam.nombre, cam.ip_address);
      }
      res.writeHead(200, {
        'Content-Type': camStream.headers['content-type'] || 'multipart/x-mixed-replace; boundary=--video boundary--',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'close',
        'Pragma': 'no-cache'
      });
      camStream.pipe(res);
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        sendOfflinePlaceholder(res, cam.nombre, cam.ip_address);
      }
    });

    proxyReq.on('error', () => {
      if (!res.headersSent) {
        sendOfflinePlaceholder(res, cam.nombre, cam.ip_address);
      }
    });

    req.on('close', () => {
      proxyReq.destroy();
    });
  } catch (err) {
    if (!res.headersSent) {
      sendOfflinePlaceholder(res, 'Cámara', '192.168.1.X');
    }
  }
};

/**
 * Genera un marco táctico SVG para cámaras fuera de línea
 */
const sendOfflinePlaceholder = (res, nombre, ip) => {
  res.set('Content-Type', 'image/svg+xml');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <rect width="640" height="360" fill="#090d16"/>
      <rect x="15" y="15" width="610" height="330" rx="8" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <circle cx="320" cy="130" r="38" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-dasharray="6 3"/>
      <text x="320" y="142" font-size="30" font-family="sans-serif" fill="#f43f5e" text-anchor="middle">✕</text>
      <text x="320" y="200" font-size="16" font-family="sans-serif" font-weight="bold" fill="#f8fafc" text-anchor="middle">CÁMARA FUERA DE LÍNEA</text>
      <text x="320" y="225" font-size="13" font-family="monospace" font-weight="bold" fill="#38bdf8" text-anchor="middle">IP: ${ip || 'No configurada'}</text>
      <text x="320" y="255" font-size="11" font-family="sans-serif" fill="#94a3b8" text-anchor="middle">Verifique que la app IP Webcam esté abierta y transmitiendo en su teléfono</text>
      <text x="320" y="278" font-size="10" font-family="sans-serif" fill="#64748b" text-anchor="middle">(Pulse "Probar Ping" o "Cambiar IP" si el router asignó una nueva dirección)</text>
    </svg>
  `;
  return res.status(200).send(svg.trim());
};

/**
 * Probar conectividad con la cámara IP en tiempo real (Ping)
 * GET /api/camaras/:id/ping
 */
const pingCamera = async (req, res) => {
  const { id } = req.params;
  try {
    const camRes = await db.query('SELECT * FROM camaras WHERE id = $1', [id]);
    if (!camRes.rows || camRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cámara no encontrada.' });
    }

    const cam = camRes.rows[0];
    const baseUrl = cam.base_url || (cam.ip_address ? `http://${cam.ip_address}` : null);

    if (!baseUrl) {
      return res.status(400).json({ online: false, error: 'No tiene IP configurada.' });
    }

    // Ping para cámaras RTSP (YuiCam)
    if (baseUrl.startsWith('rtsp://') || (cam.stream_url && cam.stream_url.startsWith('rtsp://'))) {
      const net = require('net');
      const cleanHost = (cam.ip_address || '192.168.1.74').replace(/^https?:\/\//, '').replace(/^rtsp:\/\//, '').split(':')[0];
      const startTime = Date.now();
      const socket = new net.Socket();
      socket.setTimeout(2500);

      socket.on('connect', () => {
        const latencyMs = Date.now() - startTime;
        socket.destroy();
        return res.status(200).json({
          online: true,
          latencyMs,
          ip: cam.ip_address,
          details: 'YuiCam RTSP Stream Activo (1080p/360p)',
          message: `✓ Conexión en vivo con la cámara YuiCam Wi-Fi (${latencyMs}ms).`
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        return res.status(200).json({
          online: false,
          ip: cam.ip_address,
          message: `Tiempo de espera agotado al conectar con ${cam.ip_address} (puerto RTSP 554).`
        });
      });

      socket.on('error', (err) => {
        socket.destroy();
        return res.status(200).json({
          online: false,
          ip: cam.ip_address,
          message: `No se pudo conectar al puerto de la cámara: ${err.message}`
        });
      });

      socket.connect(554, cleanHost);
      return;
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
      const response = await fetch(`${baseUrl}/status.json`, { signal: controller.signal });
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        const telemetry = await response.json().catch(() => ({}));
        return res.status(200).json({
          online: true,
          latencyMs,
          ip: cam.ip_address,
          telemetry,
          message: `✓ Conexión exitosa con la cámara (${latencyMs}ms).`
        });
      } else {
        return res.status(200).json({
          online: false,
          ip: cam.ip_address,
          message: `Cámara respondió con código HTTP ${response.status}.`
        });
      }
    } catch (err) {
      clearTimeout(timeout);
      return res.status(200).json({
        online: false,
        ip: cam.ip_address,
        message: `No se pudo conectar con ${cam.ip_address}. Verifique que el teléfono esté encendido y en la misma red Wi-Fi.`
      });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Error interno en prueba de ping.' });
  }
};

/**
 * Actualizar datos de una cámara (ej. nueva dirección IP asignada por el router)
 * PUT /api/camaras/:id
 */
const updateCamera = async (req, res) => {
  const { id } = req.params;
  const { nombre, ip_address, ubicacion, lat, lng } = req.body;

  try {
    const camRes = await db.query('SELECT * FROM camaras WHERE id = $1', [id]);
    if (!camRes.rows || camRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cámara no encontrada.' });
    }

    const { ip, baseUrl, streamUrl, snapshotUrl } = normalizeIpWebcam(ip_address || camRes.rows[0].ip_address);

    const updateRes = await db.query(
      `UPDATE camaras SET nombre = $1, ubicacion = $2, lat = $3, lng = $4, stream_url = $5, snapshot_url = $6, base_url = $7, ip_address = $8 WHERE id = $9 RETURNING *`,
      [
        nombre || camRes.rows[0].nombre,
        ubicacion || camRes.rows[0].ubicacion,
        lat ? parseFloat(lat) : camRes.rows[0].lat,
        lng ? parseFloat(lng) : camRes.rows[0].lng,
        streamUrl,
        snapshotUrl,
        baseUrl,
        ip,
        id
      ]
    );

    return res.status(200).json({
      message: 'Cámara actualizada con éxito.',
      camara: updateRes.rows[0]
    });
  } catch (err) {
    console.error('Error al actualizar cámara:', err);
    return res.status(500).json({ error: 'Error al actualizar la cámara.' });
  }
};

/**
 * Activar / Desactivar Vigilancia Autónoma con IA InsightFace
 * POST /api/camaras/:id/autovigilancia
 */
const toggleSurveillance = async (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;

  try {
    const surveillanceService = require('../services/surveillanceService');
    const result = surveillanceService.setCameraSurveillance(id, enabled);

    return res.status(200).json({
      success: true,
      camId: id,
      surveillance: result,
      message: enabled
        ? '🤖 Vigilancia Autónoma con InsightFace ACTIVADA para esta cámara.'
        : '⏹️ Vigilancia Autónoma pausada para esta cámara.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error configurando vigilancia autónoma.' });
  }
};

/**
 * Obtener estado global de la vigilancia autónoma
 * GET /api/camaras/autovigilancia/status
 */
const getSurveillanceStatus = async (req, res) => {
  try {
    const surveillanceService = require('../services/surveillanceService');
    return res.status(200).json(surveillanceService.getStatus());
  } catch (err) {
    return res.status(500).json({ error: 'Error obteniendo estado de vigilancia.' });
  }
};

/**
 * Configurar umbral de sensibilidad de la vigilancia autónoma
 * POST /api/camaras/autovigilancia/threshold
 */
const setSurveillanceThreshold = async (req, res) => {
  try {
    const { threshold } = req.body;
    const surveillanceService = require('../services/surveillanceService');
    const updated = surveillanceService.setThreshold(threshold);
    return res.status(200).json({ success: true, similarityThreshold: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Error configurando umbral de vigilancia.' });
  }
};

/**
 * Eliminar una cámara
 * DELETE /api/camaras/:id
 */
const deleteCamera = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM camaras WHERE id = $1', [id]);
    return res.status(200).json({ message: 'Cámara desconectada del sistema.' });
  } catch (error) {
    console.error('Error al eliminar cámara:', error);
    return res.status(500).json({ error: 'Error al eliminar la cámara.' });
  }
};

module.exports = {
  getCameras,
  createCamera,
  controlCamera,
  proxySnapshot,
  proxyStream,
  pingCamera,
  updateCamera,
  toggleSurveillance,
  getSurveillanceStatus,
  setSurveillanceThreshold,
  deleteCamera
};


