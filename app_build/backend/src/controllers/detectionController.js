const db = require('../config/database');
const { broadcast } = require('../app');

const createDetection = async (req, res) => {
  const {
    caso_id,
    ubicacion_lat,
    ubicacion_lng,
    porcentaje_confianza,
    video_url,
    foto_evidencia_url
  } = req.body;

  // 1. Validate that all required fields are present
  if (
    caso_id === undefined ||
    ubicacion_lat === undefined ||
    ubicacion_lng === undefined ||
    porcentaje_confianza === undefined
  ) {
    return res.status(400).json({
      error: 'Faltan campos obligatorios. Los campos caso_id, ubicacion_lat, ubicacion_lng y porcentaje_confianza son requeridos.'
    });
  }

  try {
    // 2. Verify that the caso_id exists in the Casos table
    const caseCheck = await db.query('SELECT id, nombre_desaparecido FROM casos WHERE id = $1', [caso_id]);
    
    if (caseCheck.rows.length === 0) {
      return res.status(404).json({
        error: `El caso con ID ${caso_id} no existe en la base de datos.`
      });
    }

    const nombreDesaparecido = caseCheck.rows[0]?.nombre_desaparecido || `Caso #${caso_id}`;

    // 3. Create a record in the Alertas table with state 'pendiente'
    const insertResult = await db.query(
      `INSERT INTO alertas (
        caso_id, ubicacion_lat, ubicacion_lng, porcentaje_confianza, 
        video_url, foto_evidencia_url, estado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        parseInt(caso_id),
        parseFloat(ubicacion_lat),
        parseFloat(ubicacion_lng),
        parseFloat(porcentaje_confianza),
        video_url || null,
        foto_evidencia_url || null,
        'pendiente'
      ]
    );

    const newAlert = {
      ...insertResult.rows[0],
      nombre_desaparecido: nombreDesaparecido
    };

    // Broadcast evento WebSocket en tiempo real 'nueva_alerta'
    if (typeof broadcast === 'function') {
      broadcast('nueva_alerta', newAlert);
    }

    // 4. Return the created alert with code 201
    return res.status(201).json({
      message: 'Detección de cámara registrada con éxito.',
      alerta: newAlert
    });

  } catch (error) {
    console.error('Error al registrar detección:', error);
    return res.status(500).json({
      error: 'Ocurrió un error interno en el servidor al intentar registrar la detección.'
    });
  }
};

module.exports = {
  createDetection
};

