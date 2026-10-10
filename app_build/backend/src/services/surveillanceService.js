const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const insightFaceService = require('./insightFaceService');

/**
 * Servicio de Vigilancia Autónoma con InsightFace
 * - Filtro estricto de rostros humanos reales (YuNet DNN): No captura fotos de paredes, muebles ni objetos.
 * - Pre-evaluación de casos y parentesco: Evalúa similitud contra expedientes activos.
 * - Telemetría en vivo vía WebSockets: Permite al usuario ver en pantalla el escaneo en tiempo real.
 * - Umbral biométrico calibrado para feeds de video (52.0%): Detecta a la persona buscada con margen seguro frente a no coincidencias (~6%).
 * - Escaneo profundo y evidencia anotada: Si hay coincidencia, dibuja recuadro pericial y emite alerta para decisión del moderador.
 */
class AutonomousSurveillanceService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.scanIntervalMs = 7000; // Escaneo balanceado cada 7 segundos para permitir fluidez máxima (30 FPS) en el video
    this.similarityThreshold = 70.0; // Umbral estricto pericial (>= 70.0%) para eliminar falsos positivos y evitar confusiones de personas
    this.cameraConfigs = {}; // { [camId]: { enabled: true } }
    this.isCameraScanning = {}; // Prevenir acumulación de llamadas concurrentes por cámara
    this.cooldowns = new Map(); // key: `${camId}_${casoId}` -> timestamp
    this.cooldownDurationMs = 60000; // 60 segundos de enfriamiento entre alertas de la misma persona
    this.webSocketBroadcast = null;
    this.cachedCaseEmbeddings = new Map(); // caseId -> embedding_512d

    // Métricas de telemetría
    this.telemetry = {
      totalScans: 0,
      realFacesDetected: 0,
      discardedNonFaces: 0,
      discardedUnmatchedBystanders: 0,
      presumedMatchesFound: 0,
      lastScanTimestamp: null,
      lastMatchDetails: null
    };

    this.uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Registrar función de broadcast por WebSockets
   */
  setWebSocketBroadcaster(broadcastFn) {
    this.webSocketBroadcast = broadcastFn;
  }

  /**
   * Modificar umbral de sensibilidad de detección
   */
  setThreshold(val) {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 30 && num <= 90) {
      this.similarityThreshold = num;
      console.log(`[SurveillanceService] 🎯 Umbral de coincidencia actualizado a ${this.similarityThreshold}%`);
    }
    return this.similarityThreshold;
  }

  /**
   * Iniciar el bucle de vigilancia autónoma
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[SurveillanceService] 🤖 Motor de Vigilancia Autónoma IA (Umbral: ${this.similarityThreshold}%) INICIADO.`);

    this.intervalId = setInterval(() => {
      this.runSurveillanceCycle().catch((err) => {
        console.warn('[SurveillanceService] Error en ciclo de vigilancia:', err.message);
      });
    }, this.scanIntervalMs);
  }

  /**
   * Detener la vigilancia autónoma
   */
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[SurveillanceService] ⏹️ Motor de Vigilancia Autónoma IA PAUSADO.');
  }

  /**
   * Habilitar o deshabilitar vigilancia autónoma para una cámara específica
   */
  setCameraSurveillance(camId, enabled = true) {
    this.cameraConfigs[camId] = {
      ...(this.cameraConfigs[camId] || {}),
      enabled: Boolean(enabled)
    };
    return this.cameraConfigs[camId];
  }

  /**
   * Extraer un solo fotograma de un flujo MJPEG sin bloquear el sensor de la cámara
   */
  async fetchSingleMjpegFrame(streamUrl, timeoutMs = 2500) {
    return new Promise((resolve) => {
      const httpModule = streamUrl.startsWith('https') ? require('https') : require('http');
      let resolved = false;
      let chunks = [];
      let req = null;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { if (req) req.destroy(); } catch (e) {}
          resolve(null);
        }
      }, timeoutMs);

      try {
        req = httpModule.get(streamUrl, (res) => {
          if (res.statusCode !== 200) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              try { req.destroy(); } catch (e) {}
              resolve(null);
            }
            return;
          }

          res.on('data', (chunk) => {
            if (resolved) return;
            chunks.push(chunk);
            if (chunk.includes(0xd9) || chunks.length > 25) {
              const combined = Buffer.concat(chunks);
              const startIdx = combined.indexOf(Buffer.from([0xff, 0xd8]));
              const endIdx = combined.indexOf(Buffer.from([0xff, 0xd9]), startIdx + 2);
              if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                resolved = true;
                clearTimeout(timer);
                const frameBuf = combined.slice(startIdx, endIdx + 2);
                try { req.destroy(); } catch (e) {}
                resolve(frameBuf);
              }
            }
          });

          res.on('error', () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              try { req.destroy(); } catch (e) {}
              resolve(null);
            }
          });
        });

        req.on('error', () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            try { req.destroy(); } catch (e) {}
            resolve(null);
          }
        });
      } catch (err) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(null);
        }
      }
    });
  }

  /**
   * Obtener vector biométrico de un caso (con caché en memoria para velocidad)
   */
  async getCaseEmbedding(caso) {
    if (!caso) return null;

    if (this.cachedCaseEmbeddings.has(caso.id)) {
      return this.cachedCaseEmbeddings.get(caso.id);
    }

    // Prioridad 1: Vector biométrico verificado ya almacenado en base de datos
    if (caso.biometria_insightface && Array.isArray(caso.biometria_insightface.embedding_512d) && caso.biometria_insightface.embedding_512d.length === 512) {
      this.cachedCaseEmbeddings.set(caso.id, caso.biometria_insightface.embedding_512d);
      return caso.biometria_insightface.embedding_512d;
    }

    if (!caso.foto_url) return null;

    // Prioridad 2: Extraer con el escáner si no venía precargado
    const bioCase = await insightFaceService.scanFace(caso.foto_url);
    if (bioCase && bioCase.face_detected && bioCase.embedding_512d) {
      this.cachedCaseEmbeddings.set(caso.id, bioCase.embedding_512d);
      return bioCase.embedding_512d;
    }

    return null;
  }

  /**
   * Ciclo de vigilancia periódica
   */
  async runSurveillanceCycle() {
    const camResult = await db.query('SELECT * FROM camaras');
    const cameras = (camResult.rows || []).filter((c) => c.estado === 'activa');

    if (cameras.length === 0) return;

    // Obtener los casos de personas desaparecidas con estado activo
    const casesResult = await db.query('SELECT * FROM casos');
    const activeCases = (casesResult.rows || []).filter(
      (c) => !c.estado || c.estado.toLowerCase() !== 'encontrado'
    );

    if (activeCases.length === 0) return;

    for (const cam of cameras) {
      const config = this.cameraConfigs[cam.id] || { enabled: true };
      if (config.enabled === false) continue;
      if (this.isCameraScanning[cam.id]) continue; // Omitir si la cámara aún procesa su escaneo anterior

      this.isCameraScanning[cam.id] = true;
      this.processCameraScan(cam, activeCases)
        .catch(() => {})
        .finally(() => {
          this.isCameraScanning[cam.id] = false;
        });
    }
  }

  /**
   * Procesar el escaneo autónomo inteligente de una cámara
   */
  async processCameraScan(cam, activeCases) {
    const baseUrl = cam.base_url || (cam.ip_address ? `http://${cam.ip_address}` : null);
    if (!baseUrl) return;

    const snapshotUrl = cam.snapshot_url || (cam.base_url ? (cam.base_url.startsWith('rtsp') ? `${cam.base_url}/live/ch1` : `${cam.base_url}/shot.jpg`) : null);
    if (!snapshotUrl) return;

    // Guardar temporalmente para análisis
    const tempFilename = `temp_scan_cam${cam.id}_${Date.now()}.jpg`;
    const tempFilePath = path.join(this.uploadsDir, tempFilename);

    // 1. Obtener fotograma de la cámara (Soporte HTTP y RTSP ultra rápido)
    const isRtsp = snapshotUrl.startsWith('rtsp://') || (cam.stream_url && cam.stream_url.startsWith('rtsp://'));
    if (isRtsp) {
      // Prioridad 1: Leer el fotograma en vivo ya decodificado por el streamer (0 milisegundos de latencia)
      const snapCache = path.join(this.uploadsDir, 'latest_yuicam_snap.jpg');
      let usedCache = false;
      if (fs.existsSync(snapCache)) {
        try {
          const stat = fs.statSync(snapCache);
          if (Date.now() - stat.mtimeMs < 4000) {
            fs.copyFileSync(snapCache, tempFilePath);
            usedCache = true;
          }
        } catch (e) {}
      }

      // Prioridad 2: Si el streamer no está activo, capturar directamente vía script
      if (!usedCache) {
        const { execFile } = require('child_process');
        const snapScript = path.join(__dirname, '../../scripts/rtsp_snapshot.py');
        const targetRtsp = snapshotUrl.startsWith('rtsp://') ? snapshotUrl : cam.stream_url;
        const pythonCmd = process.env.PYTHON_CMD || (process.platform === 'win32' ? 'py' : 'python3');

        await new Promise((resolve) => {
          execFile(pythonCmd, [snapScript, targetRtsp, tempFilePath], { timeout: 3500 }, () => {
            resolve();
          });
        });
      }

      if (!fs.existsSync(tempFilePath)) return;
    } else {
      // Prioridad 1: Leer el fotograma ya disponible en RAM (del stream en vivo pasivo o del transmisor móvil)
      let gotMemFrame = false;
      try {
        const cameraController = require('../controllers/cameraController');
        const liveSample = cameraController.latestLiveStreamSamples?.get(String(cam.id));
        const memFrame = cameraController.activeCameraBuffers?.get(String(cam.id));
        const bestSource = (liveSample && (Date.now() - liveSample.timestamp < 15000)) ? liveSample : memFrame;

        if (bestSource && bestSource.buffer && (Date.now() - bestSource.timestamp < 15000)) {
          fs.writeFileSync(tempFilePath, bestSource.buffer);
          gotMemFrame = true;
        }
      } catch (e) {}

      // Prioridad 2: Extraer fotograma directo del flujo MJPEG (Cero congelamiento del sensor por /shot.jpg)
      if (!gotMemFrame) {
        const streamTarget = cam.stream_url || (cam.base_url ? `${cam.base_url}/video` : null);
        if (streamTarget) {
          const frameBuffer = await this.fetchSingleMjpegFrame(streamTarget, 2500);
          if (frameBuffer && frameBuffer.length > 1000) {
            fs.writeFileSync(tempFilePath, frameBuffer);
            gotMemFrame = true;
          }
        }
      }

      // Prioridad 3: Si falló la lectura MJPEG, usar snapshot HTTP convencional como respaldo
      if (!gotMemFrame && snapshotUrl) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        try {
          const res = await fetch(snapshotUrl, { signal: controller.signal });
          clearTimeout(timeout);
          if (res.ok) {
            const arr = await res.arrayBuffer();
            fs.writeFileSync(tempFilePath, Buffer.from(arr));
          }
        } catch (fetchErr) {
          clearTimeout(timeout);
        }
      }

      if (!fs.existsSync(tempFilePath)) return;
    }

    this.telemetry.totalScans++;
    this.telemetry.lastScanTimestamp = new Date().toISOString();

    try {
      // ================= FASE 1: FILTRO HUMANO ESTRICTO =================
      const scanResult = await insightFaceService.scanFace(tempFilePath);

      // Si no es un rostro humano real (es pared, mueble, planta, etc.)
      if (!scanResult || !scanResult.face_detected || !scanResult.embedding_512d) {
        this.telemetry.discardedNonFaces++;
        if (this.webSocketBroadcast) {
          this.webSocketBroadcast('telemetria_escaneo', {
            cam_id: cam.id,
            cam_nombre: cam.nombre,
            timestamp: new Date().toISOString(),
            face_detected: false,
            message: 'Encuadre despejado (sin rostros)'
          });
        }
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        return;
      }

      this.telemetry.realFacesDetected++;

      // ================= FASE 2: EVALUACIÓN DE CASOS Y PARENTESCO (MULTI-FACE ENGINE JERÁRQUICO) =================
      let facesInFrame = (scanResult.all_faces && scanResult.all_faces.length > 0)
        ? [...scanResult.all_faces]
        : [scanResult];

      // Ordenar rostros por prominencia: tamaño (área) y nitidez, para evaluar primero al sujeto principal
      facesInFrame.sort((a, b) => {
        const areaA = (a.width || 100) * (a.height || 100);
        const areaB = (b.width || 100) * (b.height || 100);
        return areaB - areaA;
      });

      let bestMatch = null;
      let highestSimilarity = 0;

      // 1. Evaluar primero el rostro más prominente / frontal (Sujeto Principal)
      for (let faceIdx = 0; faceIdx < facesInFrame.length; faceIdx++) {
        const currentFace = facesInFrame[faceIdx];
        if (!currentFace.embedding_512d) continue;

        let faceBestCase = null;
        let faceHighestSim = 0;

        for (const caso of activeCases) {
          const caseEmbedding = await this.getCaseEmbedding(caso);
          if (!caseEmbedding) continue;

          const comp = insightFaceService.compareEmbeddings(
            currentFace.embedding_512d,
            caseEmbedding
          );

          if (comp.percentage > faceHighestSim) {
            faceHighestSim = comp.percentage;
            faceBestCase = {
              caso,
              comp,
              face: currentFace,
              faceIndex: faceIdx
            };
          }
        }

        // Si el rostro principal alcanza el umbral de coincidencia, se asigna con prioridad absoluta
        if (faceBestCase && faceHighestSim >= this.similarityThreshold) {
          bestMatch = faceBestCase;
          highestSimilarity = faceHighestSim;
          break; // Sujeto principal identificado con certeza pericial, no confundir con transeúntes secundarios
        }

        // Si no supera el umbral pero es la mayor similitud registrada para telemetría
        if (faceHighestSim > highestSimilarity) {
          highestSimilarity = faceHighestSim;
          bestMatch = faceBestCase;
        }
      }

      // Transmitir telemetría viva para que el moderador VEA EL ESCANEO en pantalla
      if (this.webSocketBroadcast) {
        this.webSocketBroadcast('telemetria_escaneo', {
          cam_id: cam.id,
          cam_nombre: cam.nombre,
          timestamp: new Date().toISOString(),
          face_detected: true,
          total_faces_in_frame: facesInFrame.length,
          multi_face: facesInFrame.length > 1,
          confidence: bestMatch ? bestMatch.face.confidence : scanResult.confidence,
          best_match_name: bestMatch ? bestMatch.caso.nombre_desaparecido : null,
          similarity: highestSimilarity,
          threshold: this.similarityThreshold,
          coincide: highestSimilarity >= this.similarityThreshold
        });
      }

      // Si no alcanza el umbral de detección (es transeúnte o persona no buscada):
      if (!bestMatch || highestSimilarity < this.similarityThreshold) {
        this.telemetry.discardedUnmatchedBystanders++;
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        return;
      }

      // ================= FASE 3: ESCANEO PROFUNDO Y GENERACIÓN DE EVIDENCIA =================
      const cooldownKey = `${cam.id}_${bestMatch.caso.id}`;
      const lastAlert = this.cooldowns.get(cooldownKey);
      if (lastAlert && Date.now() - lastAlert < this.cooldownDurationMs) {
        // En período de enfriamiento para no duplicar alertas
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        return;
      }

      // Coincidencia confirmada:
      this.cooldowns.set(cooldownKey, Date.now());
      this.telemetry.presumedMatchesFound++;

      // Generar imagen de evidencia anotada con recuadro pericial verde, HUD táctico y metadatos
      const evidenceFilename = `evidencia-ia-caso${bestMatch.caso.id}-cam${cam.id}-${Date.now()}.jpg`;
      const evidenceFilePath = path.join(this.uploadsDir, evidenceFilename);
      const evidenceUrl = `/uploads/${evidenceFilename}`;

      await insightFaceService.scanFace(tempFilePath, {
        annotatedOutputPath: evidenceFilePath,
        matchName: bestMatch.caso.nombre_desaparecido,
        matchSimilarity: highestSimilarity,
        matchedFaceIndex: bestMatch.faceIndex
      });

      if (!fs.existsSync(evidenceFilePath) && fs.existsSync(tempFilePath)) {
        fs.copyFileSync(tempFilePath, evidenceFilePath);
      }

      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      console.log(`[SurveillanceService] 🚨 ¡COINCIDENCIA BIOMÉTRICA AUTÓNOMA! ${bestMatch.caso.nombre_desaparecido} detectado en ${cam.nombre} con ${highestSimilarity}% de parentesco.`);

      this.telemetry.lastMatchDetails = {
        caso_id: bestMatch.caso.id,
        nombre_desaparecido: bestMatch.caso.nombre_desaparecido,
        camara_id: cam.id,
        camara_nombre: cam.nombre,
        similarity: highestSimilarity,
        timestamp: new Date().toISOString()
      };

      // Registrar alerta en estado pendiente (id_estado_alerta = 1) para que el moderador tenga la última palabra
      const alertResult = await db.query(
        `INSERT INTO alertas (
          caso_id, ubicacion_lat, ubicacion_lng, porcentaje_confianza,
          foto_evidencia_url, id_estado_alerta, tipo_origen, ubicacion_nombre, comentarios
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          bestMatch.caso.id,
          cam.lat || 13.6929,
          cam.lng || -89.2182,
          highestSimilarity,
          evidenceUrl,
          1, // Estado: Pendiente de moderación humana
          `Vigilancia Autónoma IA (${cam.nombre})`,
          cam.ubicacion || 'Cámara de Monitoreo en Vivo',
          `Presunta aparición identificada automáticamente por InsightFace con un ${highestSimilarity}% de coincidencia con ${bestMatch.caso.nombre_desaparecido}. El moderador debe validar o descartar.`
        ]
      );

      const nuevaAlerta = alertResult.rows[0];

      // Transmitir inmediatamente vía WebSockets al Centro de Mando
      if (this.webSocketBroadcast) {
        this.webSocketBroadcast('nueva_alerta', {
          ...nuevaAlerta,
          nombre_desaparecido: bestMatch.caso.nombre_desaparecido,
          foto_desaparecido: bestMatch.caso.foto_url,
          camara_nombre: cam.nombre,
          es_autonoma: true,
          porcentaje_confianza: highestSimilarity,
          coincidencia: {
            similitud: highestSimilarity,
            distancia_l2: bestMatch.comp.euclidean_distance,
            calidad: scanResult.quality_score,
            pose: scanResult.pose
          }
        });
      }

    } catch (procErr) {
      console.warn('[SurveillanceService] Error en procesamiento de fotograma:', procErr.message);
      if (fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch (e) {}
      }
    }
  }

  /**
   * Obtener estado y telemetría de la vigilancia
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      scanIntervalMs: this.scanIntervalMs,
      similarityThreshold: this.similarityThreshold,
      telemetry: this.telemetry,
      cameraConfigs: this.cameraConfigs
    };
  }
}

module.exports = new AutonomousSurveillanceService();
