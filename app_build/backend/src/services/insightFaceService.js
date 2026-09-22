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
        this.pythonAvailable = true; // <--- AGREGAR ESTA LÍNEA
        this.reqSeq = 1;
        this.pendingCallbacks = new Map();
        this.stdoutBuffer = '';

        this.startWorker();
    }

  /**
   * Inicia el proceso de fondo (worker) que mantiene los modelos YuNet y SFace cargados en RAM
   startWorker() {
        if (!this.pythonAvailable) return; // <--- No reintentar si Python no existe

        try {
            this.worker = spawn('python', [this.pythonScript, '--worker'], {
                cwd: this.backendRoot,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.worker.stdout.on('data', (chunk) => {
                // ... (mantén tu código actual de stdout aquí)
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
                
                // SOLO reiniciar si Python está disponible en el entorno
                if (this.pythonAvailable) {
                    console.warn(`[InsightFace] Worker neuronal finalizó (código ${code}). Reiniciando en 1s...`);
                    setTimeout(() => this.startWorker(), 1200);
                }
            });

            this.worker.on('error', (err) => {
                console.warn('[InsightFace] Error en worker process:', err.message);
                if (err.code === 'ENOENT') {
                    console.warn('⚠️ Python no está disponible en producción. Módulo biométrico desactivado.');
                    this.pythonAvailable = false; // <--- Desactiva reintentos futuros
                }
            });
        } catch (e) {
            console.warn('[InsightFace] No se pudo iniciar worker daemon:', e.message);
            this.pythonAvailable = false;
        }
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
   * Escanea una imagen usando el motor InsightFace
   * @param {string} imagePath Ruta de la imagen
   * @param {string} [annotatedOutputPath] Ruta opcional para guardar evidencia anotada
   * @returns {Promise<Object>} Resultado biométrico con landmarks y 512-D vector
   */
  async scanFace(imagePath, annotatedOutputPath = null) {
    const resolvedPath = this.resolveImagePath(imagePath);

    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return {
        success: false,
        face_detected: false,
        error: `El archivo de imagen no existe: ${imagePath}`
      };
    }

    // Ruta ultra rápida vía Worker persistente en memoria (~15ms)
    if (this.worker && this.isWorkerReady && !this.worker.killed) {
      const id = this.reqSeq++;
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (this.pendingCallbacks.has(id)) {
            this.pendingCallbacks.delete(id);
            this.fallbackScan(resolvedPath, annotatedOutputPath).then(resolve);
          }
        }, 3000);

        this.pendingCallbacks.set(id, { resolve, timer });
        const payload = JSON.stringify({
          id,
          image_path: resolvedPath,
          annotated_path: annotatedOutputPath
        }) + '\n';
        this.worker.stdin.write(payload);
      });
    }

    // Fallback si el worker está levantándose
    return this.fallbackScan(resolvedPath, annotatedOutputPath);
  }

 fallbackScan(resolvedPath, annotatedOutputPath) {
        if (!this.pythonAvailable) {
            return Promise.resolve({
                success: false,
                face_detected: false,
                error: 'Motor biométrico deshabilitado (Python no disponible en el servidor)'
            });
        }

        const args = [this.pythonScript, resolvedPath];
        if (annotatedOutputPath) {
            args.push(annotatedOutputPath);
        }

        return new Promise((resolve) => {
            execFile('python', args, { timeout: 10000 }, (err, stdout, stderr) => {
                // ... (mantén tu código actual de execFile aquí)
            });
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
            error: 'Salida de escáner biométrico no válida'
          });
        }
      });
    });
  }

  /**
   * Compara dos vectores de características ArcFace de 512 dimensiones
   * mediante similitud de cosenos normalizada y distancia euclidiana forense.
   */
  compareEmbeddings(emb1, emb2) {
    if (!Array.isArray(emb1) || !Array.isArray(emb2) || emb1.length === 0 || emb2.length === 0) {
      return {
        similarity: 0,
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
        percentage: 0,
        euclidean_distance: euclideanDistance,
        match: false,
        verdict: 'VECTOR NULO O CORRUPTO',
        confidence_label: 'Nula'
      };
    }

    const cosineSim = Math.max(0, Math.min(1, dotProduct / (normA * normB)));
    const percent = Math.round(cosineSim * 1000) / 10;
    const match = percent >= 68.0;

    let verdict = 'NO COINCIDE (DESCARTE)';
    let confidence_label = 'Baja';

    if (percent >= 85.0) {
      verdict = 'COINCIDENCIA IDENTIFICADA (MATCH ALTO)';
      confidence_label = 'Muy Alta';
    } else if (percent >= 68.0) {
      verdict = 'COINCIDENCIA PROBABLE (MATCH POSITIVO)';
      confidence_label = 'Positiva';
    }

    return {
      similarity: cosineSim,
      percentage: percent,
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
      error: 'No se pudo verificar la presencia de un rostro humano en la imagen.',
      embedding_512d: null
    };
  }
}

module.exports = new InsightFaceService();
