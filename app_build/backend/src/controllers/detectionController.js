const db = require('../config/database');
const { broadcast } = require('../wsServer');

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
    const caseCheck = await db.query('SELECT id FROM casos WHERE id = $1', [caso_id]);
    
    if (caseCheck.rows.length === 0) {
      return res.status(404).json({
        error: `El caso con ID ${caso_id} no existe en la base de datos.`
      });
    }

    // 3. Obtener el ID del estado 'Pendiente'
    const statusResult = await db.query(
      "SELECT id FROM estados_alerta WHERE nombre = 'Pendiente'"
    );
    const id_estado_alerta = statusResult.rows[0]?.id || 1;

    // 4. Create a record in the Alertas table
    const insertResult = await db.query(
      `INSERT INTO alertas (
        caso_id, ubicacion_lat, ubicacion_lng, porcentaje_confianza, 
        video_url, foto_evidencia_url, id_estado_alerta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        parseInt(caso_id),
        parseFloat(ubicacion_lat),
        parseFloat(ubicacion_lng),
        parseFloat(porcentaje_confianza),
        video_url || null,
        foto_evidencia_url || null,
        id_estado_alerta
      ]
    );

    // Mapear el string estado de vuelta en el json devuelto para mantener compatibilidad
    const newAlert = insertResult.rows[0];
    newAlert.estado = 'pendiente';

    // Emit WebSocket event
    broadcast('nueva_alerta', newAlert);

    // 5. Return the created alert with code 201
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
