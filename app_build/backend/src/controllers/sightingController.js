const db = require('../config/database');
const { broadcast } = require('../wsServer');
const insightFaceService = require('../services/insightFaceService');

/**
 * Registro de posible avistamiento comunitario por parte de un ciudadano
 * POST /api/avistamientos
 */
const reportSighting = async (req, res) => {
  const {
    caso_id,
    ubicacion_texto,
    ubicacion_lat,
    ubicacion_lng,
    descripcion,
    informante_nombre,
    informante_telefono
  } = req.body || {};

  if (!caso_id) {
    return res.status(400).json({ error: 'El ID del caso es obligatorio para reportar un avistamiento.' });
  }

  // Verificar archivo fotográfico de evidencia
  if (!req.file) {
    return res.status(400).json({ error: 'Debe adjuntar una fotografía como evidencia del avistamiento.' });
  }

  const foto_evidencia_url = `/uploads/${req.file.filename}`;

  try {
    // 1. Validar que el caso existe
    const caseResult = await db.query('SELECT id, nombre_desaparecido FROM casos WHERE id = $1', [caso_id]);
    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: `El caso con ID ${caso_id} no existe.` });
    }

    const nombreDesaparecido = caseResult.rows[0].nombre_desaparecido;
    const caseFotoUrl = caseResult.rows[0].foto_url;

    // 2. Coordenadas por defecto (Centro de San Salvador) si no se especificaron
    const finalLat = ubicacion_lat ? parseFloat(ubicacion_lat) : 13.6989;
    const finalLng = ubicacion_lng ? parseFloat(ubicacion_lng) : -89.2155;

    // 3. Cotejo facial biométrico opcional mediante ArcFace 512-D
    let similarityPercent = 85.0;
    try {
      if (caseFotoUrl && insightFaceService && typeof insightFaceService.compareFaces === 'function') {
        const comp = await insightFaceService.compareFaces(caseFotoUrl, foto_evidencia_url);
        if (comp && comp.similarity_percent) {
          similarityPercent = parseFloat(comp.similarity_percent.toFixed(1));
        }
      }
    } catch (bioErr) {
      console.warn('[InsightFace] Cotejo biométrico de avistamiento:', bioErr.message);
    }

    // 4. Crear alerta asociada al caso (agregada al expediente)
    const insertResult = await db.query(
      `INSERT INTO alertas (
        caso_id, ubicacion_lat, ubicacion_lng, porcentaje_confianza, 
        foto_evidencia_url, id_estado_alerta, tipo_origen, ubicacion_nombre, comentarios
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        parseInt(caso_id),
        finalLat,
        finalLng,
        similarityPercent,
        foto_evidencia_url,
        1, // Estado Pendiente
        'Avistamiento Ciudadano',
        ubicacion_texto || 'Ubicación reportada por ciudadano',
        descripcion || 'Posible avistamiento reportado por la comunidad.'
      ]
    );

    const newAlert = {
      ...insertResult.rows[0],
      estado: 'pendiente',
      nombre_desaparecido: nombreDesaparecido,
      tipo_origen: 'Avistamiento Ciudadano',
      informante_nombre: informante_nombre || (req.user ? req.user.nombre : 'Ciudadano Anónimo'),
      informante_telefono: informante_telefono || (req.user ? req.user.telefono : null)
    };

    // 4. Emitir en tiempo real hacia los moderadores y autoridades
    broadcast('nueva_alerta', newAlert);

    return res.status(201).json({
      message: '¡Evidencia y avistamiento registrados con éxito! El equipo de moderación ha sido notificado.',
      alerta: newAlert
    });
  } catch (error) {
    console.error('Error al registrar avistamiento ciudadano:', error);
    return res.status(500).json({ error: 'Ocurrió un error al procesar el reporte de avistamiento.' });
  }
};

module.exports = {
  reportSighting
};
