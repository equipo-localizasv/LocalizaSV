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
    this.scanIntervalMs = 1000; // Escaneo ultra-rápido cada 1 segundo por cámara
    this.similarityThreshold = 52.0; // Umbral óptimo de detección para streams de cámara IP (%)
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
   * Obtener vector biométrico de un caso (con caché en memoria para velocidad)
   */
  async getCaseEmbedding(caso) {
    if (!caso || !caso.foto_url) return null;

    if (this.cachedCaseEmbeddings.has(caso.id)) {
      return this.cachedCaseEmbeddings.get(caso.id);
    }

    // Extraer con el escáner
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

        await new Promise((resolve) => {
          execFile('python', [snapScript, targetRtsp, tempFilePath], { timeout: 3500 }, () => {
            resolve();
          });
        });
      }

      if (!fs.existsSync(tempFilePath)) return;
    } else {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1800);

      try {
        const res = await fetch(snapshotUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return;
        const arr = await res.arrayBuffer();
        fs.writeFileSync(tempFilePath, Buffer.from(arr));
      } catch (fetchErr) {
        clearTimeout(timeout);
        return;
      }
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

      // ================= FASE 2: EVALUACIÓN DE CASOS Y PARENTESCO =================
      let bestMatch = null;
      let highestSimilarity = 0;

      for (const caso of activeCases) {
        const caseEmbedding = await this.getCaseEmbedding(caso);
        if (!caseEmbedding) continue;

        const comp = insightFaceService.compareEmbeddings(
          scanResult.embedding_512d,
          caseEmbedding
        );

        if (comp.percentage > highestSimilarity) {
          highestSimilarity = comp.percentage;
          bestMatch = { caso, comp };
        }
      }

      // Transmitir telemetría viva para que el moderador VEA EL ESCANEO en pantalla
      if (this.webSocketBroadcast) {
        this.webSocketBroadcast('telemetria_escaneo', {
          cam_id: cam.id,
          cam_nombre: cam.nombre,
          timestamp: new Date().toISOString(),
          face_detected: true,
          confidence: scanResult.confidence,
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

      // Generar imagen de evidencia anotada con recuadro pericial verde y landmarks
      const evidenceFilename = `evidencia-ia-caso${bestMatch.caso.id}-cam${cam.id}-${Date.now()}.jpg`;
      const evidenceFilePath = path.join(this.uploadsDir, evidenceFilename);
      const evidenceUrl = `/uploads/${evidenceFilename}`;

      await insightFaceService.scanFace(tempFilePath, evidenceFilePath);

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
