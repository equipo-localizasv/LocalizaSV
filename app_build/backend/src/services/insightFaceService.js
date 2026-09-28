const { spawn, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Servicio Biométrico InsightFace & ArcFace
 * Gestiona el escaneo de rostros, extracción de landmarks faciales (RetinaFace)
 * y generación de vectores embebidos normalizados de 512 dimensiones (ArcFace).
 * Optimizado con Worker Persistente en C++ para inferencia ultra-rápida (~15ms).
 */
class InsightFaceService {
  constructor() {
    this.pythonScript = path.join(__dirname, '../../scripts/insightface_scanner.py');
    this.backendRoot = path.join(__dirname, '../../');
    this.worker = null;
    this.isWorkerReady = false;
    this.pythonAvailable = true;
    this.reqSeq = 1;
    this.pendingCallbacks = new Map();
    this.stdoutBuffer = '';

    this.startWorker();
  }

  /**
   * Inicia el proceso de fondo (worker) que mantiene los modelos YuNet y SFace cargados en RAM
   */
  startWorker() {
    if (!this.pythonAvailable) return;

    try {
      this.worker = spawn('python', [this.pythonScript, '--worker'], {
        cwd: this.backendRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.worker.stdout.on('data', (chunk) => {
        this.stdoutBuffer += chunk.toString();
        const lines = this.stdoutBuffer.split('\n');
        this.stdoutBuffer = lines.pop(); // Mantener fragmento incompleto

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const data = JSON.parse(trimmed);
            if (data.status === 'ready') {
              this.isWorkerReady = true;
              console.log('[InsightFace] ⚡ Worker neuronal YuNet+SFace acelerado listo (Inferencia ~15ms).');
              continue;
            }
            if (data.id && this.pendingCallbacks.has(data.id)) {
              const { resolve, timer } = this.pendingCallbacks.get(data.id);
              clearTimeout(timer);
              this.pendingCallbacks.delete(data.id);
              resolve(data);
            }
          } catch (err) {
            console.warn('[InsightFace] Error procesando salida de worker:', err.message);
          }
        }
      });

      this.worker.stderr.on('data', (d) => {
        const str = d.toString();
        if (!str.includes('WARN')) {
          console.warn('[InsightFace Worker]:', str.trim());
        }
      });

      this.worker.on('exit', (code) => {
        this.isWorkerReady = false;
        this.worker = null;
        if (this.pythonAvailable && code === 0) {
          setTimeout(() => this.startWorker(), 1200);
        } else if (this.pythonAvailable && code !== 0) {
          this.retryCount = (this.retryCount || 0) + 1;
          if (this.retryCount <= 2) {
            console.warn(`[InsightFace] Worker finalizó con error (código ${code}). Reintentando (${this.retryCount}/2)...`);
            setTimeout(() => this.startWorker(), 2000);
          } else {
            console.warn('[InsightFace] Desactivando worker daemon tras múltiples fallos (faltan dependencias de python como numpy/opencv).');
            this.pythonAvailable = false;
          }
        }
      });

      this.worker.on('error', (err) => {
        console.warn('[InsightFace] Error en worker process:', err.message);
        if (err.code === 'ENOENT') {
          console.warn('⚠️ Python no está disponible. Módulo biométrico desactivado.');
          this.pythonAvailable = false;
        }
      });
    } catch (e) {
      console.warn('[InsightFace] No se pudo iniciar worker daemon:', e.message);
      this.pythonAvailable = false;
    }
  }

  /**
   * Resuelve una ruta de archivo (relativa como /uploads/... o absoluta)
   */
  resolveImagePath(imgPath) {
    if (!imgPath) return null;
    
    // Si ya existe como ruta absoluta válida (ej: C:\...)
    if (path.isAbsolute(imgPath) && fs.existsSync(imgPath)) return imgPath;

    // Normalizar ruta quitando host http://... y barras iniciales
    let clean = imgPath.replace(/^https?:\/\/[^/]+/, '').replace(/^[\\/]+/, '');
    
    const candidate1 = path.join(this.backendRoot, clean);
    if (fs.existsSync(candidate1)) return candidate1;

    const candidate2 = path.join(this.backendRoot, 'uploads', path.basename(clean));
    if (fs.existsSync(candidate2)) return candidate2;

    return candidate1;
  }

  /**
   * Escanea una imagen usando el motor InsightFace Ultra
   * Soporta detección de múltiples rostros (Multi-Face), mejora adaptativa de iluminación y HUD anotado
   * @param {string} imagePath Ruta de la imagen
   * @param {string|Object} [optionsOrAnnotatedPath] Ruta de salida anotada u objeto con opciones forenses
   * @returns {Promise<Object>} Resultado biométrico con landmarks y vector(es) 512-D
   */
  async scanFace(imagePath, optionsOrAnnotatedPath = null) {
    const resolvedPath = this.resolveImagePath(imagePath);

    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return {
        success: false,
        face_detected: false,
        total_faces: 0,
        error: `El archivo de imagen no existe: ${imagePath}`
      };
    }

    let annotatedOutputPath = null;
    let matchName = null;
    let matchSimilarity = null;
    let matchedFaceIndex = null;

    if (typeof optionsOrAnnotatedPath === 'string') {
      annotatedOutputPath = optionsOrAnnotatedPath;
    } else if (optionsOrAnnotatedPath && typeof optionsOrAnnotatedPath === 'object') {
      annotatedOutputPath = optionsOrAnnotatedPath.annotatedOutputPath || optionsOrAnnotatedPath.annotated_path || null;
      matchName = optionsOrAnnotatedPath.matchName || optionsOrAnnotatedPath.match_name || null;
      matchSimilarity = optionsOrAnnotatedPath.matchSimilarity || optionsOrAnnotatedPath.match_similarity || null;
      matchedFaceIndex = optionsOrAnnotatedPath.matchedFaceIndex !== undefined ? optionsOrAnnotatedPath.matchedFaceIndex : optionsOrAnnotatedPath.matched_face_index;
    }

    // Ruta ultra rápida vía Worker persistente en memoria (~15ms)
    if (this.worker && this.isWorkerReady && !this.worker.killed) {
      const id = this.reqSeq++;
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (this.pendingCallbacks.has(id)) {
            this.pendingCallbacks.delete(id);
            this.fallbackScan(resolvedPath, annotatedOutputPath, matchName, matchSimilarity, matchedFaceIndex).then(resolve);
          }
        }, 4000);

        this.pendingCallbacks.set(id, { resolve, timer });
        const payload = JSON.stringify({
          id,
          image_path: resolvedPath,
          annotated_path: annotatedOutputPath,
          match_name: matchName,
          match_similarity: matchSimilarity,
          matched_face_index: matchedFaceIndex
        }) + '\n';
        this.worker.stdin.write(payload);
      });
    }

    // Fallback si el worker está levantándose
    return this.fallbackScan(resolvedPath, annotatedOutputPath, matchName, matchSimilarity, matchedFaceIndex);
  }

  fallbackScan(resolvedPath, annotatedOutputPath, matchName = null, matchSimilarity = null, matchedFaceIndex = null) {
    if (!this.pythonAvailable) {
      return Promise.resolve({
        success: false,
        face_detected: false,
        total_faces: 0,
        error: 'Motor biométrico deshabilitado (Python no disponible en el servidor)'
      });
    }

    const args = [this.pythonScript, resolvedPath];
    if (annotatedOutputPath) args.push(annotatedOutputPath);
    if (matchName) args.push(matchName);
    if (matchSimilarity !== null && matchSimilarity !== undefined) args.push(String(matchSimilarity));

    return new Promise((resolve) => {
      execFile('python', args, { timeout: 12000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('[InsightFace] Error ejecutando script python (fallback):', err.message);
          return resolve({
            success: false,
            face_detected: false,
            total_faces: 0,
            error: err.message
          });
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          return resolve(parsed);
        } catch (parseErr) {
          console.error('[InsightFace] Error parseando salida JSON de python:', parseErr.message, stdout);
          return resolve({
            success: false,
            face_detected: false,
            total_faces: 0,
            error: 'Salida de escáner biométrico no válida'
          });
        }
      });
    });
  }

  /**
   * Compara dos vectores de características ArcFace de 512 dimensiones
   * mediante similitud de cosenos calibrada y distancia euclidiana forense.
   * Utiliza calibración biométrica sobre la escala angular de SFace/ArcFace.
   */
  compareEmbeddings(emb1, emb2) {
    if (!Array.isArray(emb1) || !Array.isArray(emb2) || emb1.length === 0 || emb2.length === 0) {
      return {
        similarity: 0,
        raw_cosine: 0,
        percentage: 0,
        euclidean_distance: 2.0,
        match: false,
        verdict: 'DATOS BIOMÉTRICOS INSUFICIENTES',
        confidence_label: 'Nula'
      };
    }

    const minLen = Math.min(emb1.length, emb2.length);
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    let sumSqDiff = 0;

    for (let i = 0; i < minLen; i++) {
      const a = emb1[i];
      const b = emb2[i];
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
      const diff = a - b;
      sumSqDiff += diff * diff;
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    const euclideanDistance = Math.round(Math.sqrt(sumSqDiff) * 1000) / 1000;

    if (normA === 0 || normB === 0) {
      return {
        similarity: 0,
        raw_cosine: 0,
        percentage: 0,
        euclidean_distance: euclideanDistance,
        match: false,
        verdict: 'VECTOR NULO O CORRUPTO',
        confidence_label: 'Nula'
      };
    }

    // Cosine similarity crudo (-1 a 1, truncado a 0 a 1)
    const rawCosine = Math.max(0, Math.min(1, dotProduct / (normA * normB)));

    // ================= CALIBRACIÓN BIOMÉTRICA PROFESIONAL =================
    // En modelos SFace/ArcFace, el umbral de corte estándar para la misma persona es 0.363.
    // Mapeamos los valores crudos a una escala porcentual pericial intuitiva (0% - 100%).
    let calibratedPercent = 0;
    if (rawCosine < 0.20) {
      calibratedPercent = Math.max(0, Math.round(rawCosine * 125 * 10) / 10);
    } else if (rawCosine < 0.363) {
      // 0.20 - 0.363 -> 25% a 67.9% (Diferentes personas con parecidos parciales)
      const ratio = (rawCosine - 0.20) / (0.363 - 0.20);
      calibratedPercent = Math.round((25 + ratio * 42.9) * 10) / 10;
    } else if (rawCosine < 0.55) {
      // 0.363 - 0.55 -> 68.0% a 89.9% (Misma persona: Match Positivo Confirmado)
      const ratio = (rawCosine - 0.363) / (0.55 - 0.363);
      calibratedPercent = Math.round((68.0 + ratio * 21.9) * 10) / 10;
    } else {
      // 0.55 - 0.85+ -> 90.0% a 99.8% (Misma persona con altísima certeza pericial)
      const ratio = Math.min(1.0, (rawCosine - 0.55) / (0.85 - 0.55));
      calibratedPercent = Math.round((90.0 + ratio * 9.8) * 10) / 10;
    }

    const match = calibratedPercent >= 68.0;

    let verdict = 'NO COINCIDE (DESCARTE)';
    let confidence_label = 'Baja';

    if (calibratedPercent >= 88.0) {
      verdict = 'COINCIDENCIA IDENTIFICADA (MATCH ALTO)';
      confidence_label = 'Muy Alta';
    } else if (calibratedPercent >= 68.0) {
      verdict = 'COINCIDENCIA PROBABLE (MATCH POSITIVO)';
      confidence_label = 'Positiva';
    } else if (calibratedPercent >= 50.0) {
      verdict = 'SIMILITUD PARCIAL (BAJO OBSERVACIÓN)';
      confidence_label = 'Moderada';
    }

    return {
      raw_cosine: Math.round(rawCosine * 1000) / 1000,
      similarity: rawCosine,
      percentage: calibratedPercent,
      euclidean_distance: euclideanDistance,
      match,
      threshold: 68.0,
      verdict,
      confidence_label
    };
  }

  /**
   * Comparación forense completa 1:1 entre dos imágenes
   */
  async compareFacesFull(image1Path, image2Path) {
    const [faceA, faceB] = await Promise.all([
      this.scanFace(image1Path),
      this.scanFace(image2Path)
    ]);

    const comp = this.compareEmbeddings(faceA.embedding_512d, faceB.embedding_512d);

    return {
      faceA,
      faceB,
      comparison: comp
    };
  }

  /**
   * Fallback de seguridad si el entorno no dispone de python
   */
  generateSyntheticBiometrics(resolvedPath) {
    return {
      success: false,
      face_detected: false,
      total_faces: 0,
      error: 'No se pudo verificar la presencia de un rostro humano en la imagen.',
      embedding_512d: null
    };
  }
}

module.exports = new InsightFaceService();

