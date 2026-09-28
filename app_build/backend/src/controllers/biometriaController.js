const insightFaceService = require('../services/insightFaceService');
const db = require('../config/database');
const path = require('path');
const fs = require('fs');

/**
 * Escanea un rostro usando InsightFace a partir de un archivo subido o URL
 * POST /api/biometria/scan
 */
const scanFace = async (req, res) => {
  try {
    let imagePath = null;

    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    } else if (req.body.foto_url) {
      imagePath = req.body.foto_url;
    }

    if (!imagePath) {
      return res.status(400).json({
        error: 'Debe proporcionar una imagen (archivo "foto" o "foto_url") para escanear.'
      });
    }

    const biometrics = await insightFaceService.scanFace(imagePath);

    return res.status(200).json({
      success: true,
      message: 'Escaneo biométrico InsightFace completado con éxito.',
      image_url: imagePath,
      biometrics
    });
  } catch (error) {
    console.error('Error en escaneo biométrico:', error);
    return res.status(500).json({
      error: 'Error procesando el escaneo biométrico InsightFace.'
    });
  }
};

/**
 * Cotejo biométrico forense 1:1 entre dos rostros
 * POST /api/biometria/compare
 */
const compareFaces = async (req, res) => {
  const { embedding1, embedding2, foto1_url, foto2_url } = req.body;

  try {
    if (foto1_url && foto2_url) {
      const result = await insightFaceService.compareFacesFull(foto1_url, foto2_url);
      return res.status(200).json({
        success: true,
        ...result
      });
    }

    let embA = embedding1;
    let embB = embedding2;

    if (!embA || !embB) {
      return res.status(400).json({
        error: 'Debe suministrar dos imágenes ("foto1_url" y "foto2_url") o dos vectores de 512-D.'
      });
    }

    const comp = insightFaceService.compareEmbeddings(embA, embB);
    return res.status(200).json({
      success: true,
      comparison: comp
    });
  } catch (error) {
    console.error('Error en comparación biométrica:', error);
    return res.status(500).json({ error: 'Error al comparar perfiles biométricos.' });
  }
};

/**
 * Búsqueda biométrica 1:N (Compara una imagen contra todos los casos registrados)
 * POST /api/biometria/search
 */
const searchBiometricDatabase = async (req, res) => {
  try {
    let queryImagePath = null;

    if (req.file) {
      queryImagePath = `/uploads/${req.file.filename}`;
    } else if (req.body.foto_url) {
      queryImagePath = req.body.foto_url;
    }

    if (!queryImagePath) {
      return res.status(400).json({
        error: 'Debe proporcionar una imagen para buscar en la base de datos de desaparecidos.'
      });
    }

    // 1. Escanear la imagen objetivo con InsightFace Ultra (Multi-Face)
    const targetBiometrics = await insightFaceService.scanFace(queryImagePath);
    if (!targetBiometrics.face_detected || (!targetBiometrics.embedding_512d && (!targetBiometrics.all_faces || targetBiometrics.all_faces.length === 0))) {
      return res.status(400).json({
        error: 'No se detectó un rostro humano válido en la imagen proporcionada.',
        biometrics: targetBiometrics
      });
    }

    const facesInQuery = (targetBiometrics.all_faces && targetBiometrics.all_faces.length > 0)
      ? targetBiometrics.all_faces
      : [targetBiometrics];

    // 2. Obtener todos los casos activos
    const casesRes = await db.query('SELECT * FROM casos');
    const allCases = casesRes.rows || [];

    // 3. Comparar cada rostro de la imagen de consulta contra cada caso en base de datos
    const results = [];

    for (const caso of allCases) {
      if (!caso.foto_url) continue;

      let caseEmbedding = null;
      if (caso.biometria_insightface) {
        try {
          const parsed = typeof caso.biometria_insightface === 'string' 
            ? JSON.parse(caso.biometria_insightface) 
            : caso.biometria_insightface;
          caseEmbedding = parsed.embedding_512d || parsed;
        } catch (e) {}
      }

      // Si no tenía embedding pre-calculado, lo extraemos y lo persistimos en la base de datos
      if (!caseEmbedding) {
        try {
          const bio = await insightFaceService.scanFace(caso.foto_url);
          if (bio && bio.face_detected && bio.embedding_512d) {
            caseEmbedding = bio.embedding_512d;
            // Persistir de forma transparente para acelerar búsquedas futuras
            db.query('UPDATE casos SET biometria_insightface = $1 WHERE id = $2', [JSON.stringify(bio), caso.id]).catch(() => {});
          }
        } catch (scanErr) {
          console.warn(`[BiometriaController] Error indexando caso ${caso.id}:`, scanErr.message);
        }
      }

      if (caseEmbedding) {
        // Encontrar la mejor coincidencia entre todos los rostros de la foto subida
        let bestFaceComp = null;
        let bestFaceIdx = 0;

        for (let qIdx = 0; qIdx < facesInQuery.length; qIdx++) {
          const qFace = facesInQuery[qIdx];
          if (!qFace.embedding_512d) continue;

          const comp = insightFaceService.compareEmbeddings(
            qFace.embedding_512d,
            caseEmbedding
          );

          if (!bestFaceComp || comp.percentage > bestFaceComp.percentage) {
            bestFaceComp = comp;
            bestFaceIdx = qIdx;
          }
        }

        if (bestFaceComp) {
          results.push({
            caso_id: caso.id,
            nombre_desaparecido: caso.nombre_desaparecido,
            foto_url: caso.foto_url,
            edad: caso.edad,
            departamento: caso.ubicacion_desaparicion,
            estado: caso.estado,
            matched_query_face_index: bestFaceIdx,
            matched_query_face_bbox: facesInQuery[bestFaceIdx]?.bbox,
            similarity_percentage: bestFaceComp.percentage,
            raw_cosine: bestFaceComp.raw_cosine,
            euclidean_distance: bestFaceComp.euclidean_distance,
            match: bestFaceComp.match,
            verdict: bestFaceComp.verdict,
            confidence_label: bestFaceComp.confidence_label
          });
        }
      }
    }

    // Ordenar de mayor a menor coincidencia
    results.sort((a, b) => b.similarity_percentage - a.similarity_percentage);

    return res.status(200).json({
      success: true,
      query_image: queryImagePath,
      query_biometrics: targetBiometrics,
      total_faces_in_query: facesInQuery.length,
      multi_face_query: facesInQuery.length > 1,
      total_compared: results.length,
      top_matches: results.slice(0, 5),
      all_results: results
    });
  } catch (error) {
    console.error('Error en búsqueda biométrica 1:N:', error);
    return res.status(500).json({ error: 'Error procesando la búsqueda biométrica en la base de datos.' });
  }
};

/**
 * Diagnóstico de calidad biométrica y ángulo facial (RetinaFace Quality)
 * POST /api/biometria/diagnostico
 */
const diagnoseFaceQuality = async (req, res) => {
  try {
    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    } else if (req.body.foto_url) {
      imagePath = req.body.foto_url;
    }

    if (!imagePath) {
      return res.status(400).json({ error: 'Proporcione una imagen para diagnóstico.' });
    }

    const bio = await insightFaceService.scanFace(imagePath);

    const pitch = bio.pose?.pitch || 0;
    const yaw = bio.pose?.yaw || 0;
    const roll = bio.pose?.roll || 0;

    const recommendations = [];
    if (Math.abs(yaw) > 12) {
      recommendations.push(`Rostro girado horizontalmente (${yaw > 0 ? 'hacia la derecha' : 'hacia la izquierda'}). Se recomienda foto más frontal.`);
    }
    if (Math.abs(pitch) > 10) {
      recommendations.push(`Inclinación vertical detectada (${pitch > 0 ? 'mirando hacia abajo' : 'mirando hacia arriba'}).`);
    }
    if (bio.confidence < 90) {
      recommendations.push('Confianza por debajo de 90%. Asegure buena iluminación y resolución.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Alineación frontal y calidad óptimas para indexación biométrica.');
    }

    return res.status(200).json({
      success: true,
      diagnostics: {
        face_detected: bio.face_detected,
        confidence: bio.confidence,
        quality_score: bio.quality_score,
        aligned: bio.aligned,
        pose: bio.pose,
        recommendations
      }
    });
  } catch (error) {
    console.error('Error en diagnóstico biométrico:', error);
    return res.status(500).json({ error: 'Error analizando calidad biométrica.' });
  }
};

module.exports = {
  scanFace,
  compareFaces,
  searchBiometricDatabase,
  diagnoseFaceQuality
};
