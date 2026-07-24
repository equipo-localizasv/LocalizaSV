const db = require('../config/database');

const getPendingAlerts = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, c.nombre_desaparecido 
       FROM alertas a
       JOIN casos c ON a.caso_id = c.id
       WHERE a.estado = 'pendiente'
       ORDER BY a.created_at DESC`
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener alertas pendientes:', error);
    return res.status(500).json({ error: 'Ocurrió un error en el servidor al obtener las alertas pendientes.' });
  }
};

const updateAlertStatus = async (req, res) => {
  const { id } = req.params;
  const { id_estado_alerta, comentarios_moderador } = req.body;

  // 1. Validate that id_estado_alerta is present
  if (id_estado_alerta === undefined) {
    return res.status(400).json({
      error: 'El campo id_estado_alerta es requerido en el cuerpo de la solicitud.'
    });
  }

  // Map state ID to string representation
  const stateMapping = {
    1: 'pendiente',
    2: 'confirmado',
    3: 'falso positivo'
  };

  const estado = stateMapping[id_estado_alerta];
  if (!estado) {
    return res.status(400).json({
      error: 'ID de estado inválido. Los valores válidos son: 1 (pendiente), 2 (confirmado), 3 (falso positivo).'
    });
  }

  try {
    // 2. Verify that the alert exists
    const alertCheck = await db.query('SELECT id FROM alertas WHERE id = $1', [parseInt(id)]);
    if (alertCheck.rows.length === 0) {
      return res.status(404).json({
        error: `La alerta con ID ${id} no existe.`
      });
    }

    // 3. Obtain moderador_id from the authenticated user token (JWT)
    const moderador_id = req.user.id;
    const fecha_validacion = new Date().toISOString();
    const comentarios = comentarios_moderador || null;

    // 4. Update the alert details
    const result = await db.query(
      `UPDATE alertas 
       SET id_estado_alerta = $1, 
           estado = $2, 
           moderador_id = $3, 
           fecha_validacion = $4, 
           comentarios = $5 
       WHERE id = $6 
       RETURNING *`,
      [
        parseInt(id_estado_alerta),
        estado,
        parseInt(moderador_id),
        fecha_validacion,
        comentarios,
        parseInt(id)
      ]
    );

    return res.status(200).json({
      message: 'Estado de la alerta actualizado con éxito por el moderador.',
      alerta: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar estado de la alerta:', error);
    return res.status(500).json({ error: 'Ocurrió un error en el servidor al actualizar la alerta.' });
  }
};

const getConfirmedAlerts = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, c.nombre_desaparecido 
       FROM alertas a
       JOIN casos c ON a.caso_id = c.id
       WHERE a.estado = 'confirmado'
       ORDER BY a.created_at DESC`
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener alertas activas (confirmadas):', error);
    return res.status(500).json({ error: 'Ocurrió un error en el servidor al obtener las alertas activas.' });
  }
};

module.exports = {
  getPendingAlerts,
  updateAlertStatus,
  getConfirmedAlerts
};
