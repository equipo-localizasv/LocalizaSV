/**
 * LOCALIZASV - Módulo de Vigilancia Colaborativa y Captura de Cámaras IP
 * Archivo: camaras/capturar.js
 * 
 * Tareas:
 * 1. Conexión y captura periódica (cada 5 seg) de frames desde cámara IP (RTSP/HTTP/Snapshot).
 * 2. Algoritmo de detección de movimiento / cambio perceptual entre frames.
 * 3. Transmisión multipart/form-data al backend: POST /api/detecciones.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// ================= CONFIGURACIÓN DEL SISTEMA =================
const rawArg = process.argv[2] || process.env.CAMERA_IP || process.env.CAMERA_URL || 'http://192.168.1.50:8080';
let normalizedSnapshotUrl = rawArg;
if (!normalizedSnapshotUrl.startsWith('http://') && !normalizedSnapshotUrl.startsWith('https://')) {
  normalizedSnapshotUrl = `http://${normalizedSnapshotUrl}`;
}
if (!normalizedSnapshotUrl.includes('/shot.jpg') && !normalizedSnapshotUrl.includes('/frame.jpg')) {
  normalizedSnapshotUrl = normalizedSnapshotUrl.replace(/\/$/, '') + '/shot.jpg';
}

const CONFIG = {
  // URL del endpoint de detecciones de LocalizaSV
  API_URL: process.env.API_URL || 'http://localhost:3001/api/detecciones',
  
  // URL del snapshot de la cámara IP (ejemplo con IP Webcam de Android)
  CAMERA_SNAPSHOT_URL: normalizedSnapshotUrl,

  // ID del caso al que se le asocia la vigilancia activa (Caso #1 por defecto)
  CASO_ID: process.env.CASO_ID || 1,

  // Coordenadas geográficas de la cámara
  UBICACION_LAT: parseFloat(process.env.CAMERA_LAT || '13.69294'),
  UBICACION_LNG: parseFloat(process.env.CAMERA_LNG || '-89.21819'),

  // Intervalo de captura (milisegundos) - Requisito: cada 5 segundos
  INTERVAL_MS: parseInt(process.env.INTERVAL_MS || '5000', 10),

  // Umbral de detección de movimiento (0 a 100). Si la diferencia supera este valor, se dispara la alerta
  MOTION_THRESHOLD: 12.0,

  // Porcentaje de confianza estimado por defecto
  DEFAULT_CONFIDENCE: 88.5
};

console.log('====================================================');
console.log('🎥 LOCALIZASV - AGENTE DE CAPTURA IP WEBCAM');
console.log('====================================================');
console.log(`Endpoint destino : ${CONFIG.API_URL}`);
console.log(`Caso asignado    : Caso #${CONFIG.CASO_ID}`);
console.log(`Ubicación GPS    : [${CONFIG.UBICACION_LAT}, ${CONFIG.UBICACION_LNG}]`);
console.log(`Frecuencia       : Cada ${CONFIG.INTERVAL_MS / 1000}s`);
console.log(`IP Cámara Webcam : ${CONFIG.CAMERA_SNAPSHOT_URL}`);
console.log('Tip de uso       : node capturar.js <IP_DE_TU_TELEFONO:8080>');
console.log('====================================================\n');

let previousFrameBuffer = null;
let captureCount = 0;

/**
 * Descarga una imagen real desde la cámara IP Webcam HTTP/HTTPS.
 */
const downloadSnapshot = (url) => {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 4000 }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Cámara respondió con código HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Tiempo de espera agotado al conectar con ${url}. Verifica que la app IP Webcam esté encendida.`));
    });
    
    req.on('error', (err) => reject(err));
  });
};

/**
 * Algoritmo ligero de detección de movimiento comparando varianza de bytes entre frames consecutivos.
 * Retorna el porcentaje de diferencia (0% a 100%).
 */
const calculateMotionDifference = (currentBuffer, prevBuffer) => {
  if (!prevBuffer) return 100; // Primer frame siempre se considera cambio inicial
  if (currentBuffer.length === 0 || prevBuffer.length === 0) return 0;

  const sampleSize = Math.min(currentBuffer.length, prevBuffer.length, 1024);
  let diffSum = 0;

  for (let i = 0; i < sampleSize; i += 4) {
    diffSum += Math.abs(currentBuffer[i] - prevBuffer[i]);
  }

  const maxDiff = (sampleSize / 4) * 255;
  const differencePct = (diffSum / maxDiff) * 100;
  return differencePct;
};

/**
 * Envía la imagen capturada mediante multipart/form-data al backend usando el fetch nativo de Node.js.
 */
const sendDetectionToApi = async (imageBuffer, confidence) => {
  try {
    const formData = new FormData();
    formData.append('caso_id', String(CONFIG.CASO_ID));
    formData.append('ubicacion_lat', String(CONFIG.UBICACION_LAT));
    formData.append('ubicacion_lng', String(CONFIG.UBICACION_LNG));
    formData.append('porcentaje_confianza', String(confidence.toFixed(1)));

    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('imagen', blob, `cam_capture_${Date.now()}.jpg`);

    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (response.ok) {
      console.log(`✅ [Detección Enviada] Alerta creada ID #${data.alerta?.id} | Confianza: ${confidence.toFixed(1)}% | Caso #${CONFIG.CASO_ID}`);
    } else {
      console.error(`⚠️ [Error API ${response.status}]`, data.error || data);
    }
  } catch (error) {
    console.error('❌ [Error de Red] No se pudo comunicar con el backend:', error.message);
  }
};

/**
 * Bucle principal de ejecución del agente de captura
 */
const runCaptureCycle = async () => {
  captureCount++;
  try {
    const currentFrame = await downloadSnapshot(CONFIG.CAMERA_SNAPSHOT_URL);
    const motionDiff = calculateMotionDifference(currentFrame, previousFrameBuffer);

    console.log(`📸 [Frame #${captureCount}] Variación de movimiento: ${motionDiff.toFixed(2)}% (Umbral: ${CONFIG.MOTION_THRESHOLD}%)`);

    if (motionDiff >= CONFIG.MOTION_THRESHOLD || captureCount === 1) {
      console.log(`🚨 ¡Movimiento detectado! Superó el umbral (${motionDiff.toFixed(2)}% >= ${CONFIG.MOTION_THRESHOLD}%). Transmitiendo alerta...`);
      await sendDetectionToApi(currentFrame, CONFIG.DEFAULT_CONFIDENCE);
    } else {
      console.log(`⏸️ Sin movimiento significativo. Frame descartado.`);
    }

    previousFrameBuffer = currentFrame;
  } catch (err) {
    console.warn(`⚠️ Error durante el ciclo de captura: ${err.message}`);
  }
};

// Iniciar ciclo de captura inmediatamente y luego cada INTERVAL_MS
runCaptureCycle();
const intervalHandle = setInterval(runCaptureCycle, CONFIG.INTERVAL_MS);

// Manejo de salida limpia
process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo agente de captura de cámaras...');
  clearInterval(intervalHandle);
  process.exit(0);
});
