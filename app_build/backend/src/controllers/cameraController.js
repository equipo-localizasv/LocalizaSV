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
 * Proxy directo de snapshot en vivo para evitar problemas de CORS y Mixed-Content
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
      return res.status(400).send('La cámara no tiene URL de snapshot.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const camResponse = await fetch(snapshotUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!camResponse.ok) {
      return res.status(502).send('No se pudo obtener el fotograma de la cámara IP.');
    }

    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    const buffer = await camResponse.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err) {
    return res.status(504).send('Tiempo de espera agotado al conectar con la cámara IP.');
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
  deleteCamera
};

