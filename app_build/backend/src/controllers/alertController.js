const db = require('../config/database');

const getActiveAlerts = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, LOWER(ea.nombre) as estado, c.nombre_desaparecido 
       FROM alertas a
       JOIN casos c ON a.caso_id = c.id
       JOIN estados_alerta ea ON a.id_estado_alerta = ea.id
       WHERE LOWER(ea.nombre) != 'falso positivo'
       ORDER BY a.fecha_deteccion DESC`
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener alertas activas:', error);
    return res.status(500).json({ error: 'Ocurrió un error en el servidor al obtener las alertas activas.' });
  }
};

const getPendingAlerts = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, LOWER(ea.nombre) as estado, c.nombre_desaparecido 
       FROM alertas a
       JOIN casos c ON a.caso_id = c.id
       JOIN estados_alerta ea ON a.id_estado_alerta = ea.id
       WHERE LOWER(ea.nombre) = 'pendiente'
       ORDER BY a.fecha_deteccion DESC`
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener alertas pendientes:', error);
    return res.status(500).json({ error: 'Ocurrió un error en el servidor al obtener las alertas pendientes.' });
  }
};

const updateAlertStatus = async (req, res) => {
  const { id } = req.params;
  const { id_estado_alerta, estado: estadoBody, comentarios_moderador, comentarios: comentariosBody } = req.body;

  let finalIdEstado = id_estado_alerta;
  let finalEstado = estadoBody;
  const comentarios = comentarios_moderador || comentariosBody || null;

  // Status mapping translate dictionary
  const stateIdToName = {
    1: 'pendiente',
    2: 'confirmado',
    3: 'falso positivo'
  };

  const stateNameToId = {
    'pendiente': 1,
    'confirmado': 2,
    'falso positivo': 3,
    'falso_positivo': 3
  };

  if (finalIdEstado !== undefined) {
    finalEstado = stateIdToName[finalIdEstado];
  } else if (finalEstado !== undefined) {
    const normalized = finalEstado.trim().toLowerCase();
    finalIdEstado = stateNameToId[normalized];
    finalEstado = stateIdToName[finalIdEstado] || normalized;
  }

  if (!finalIdEstado || !finalEstado) {
    return res.status(400).json({
      error: 'Estado inválido. Proporcione id_estado_alerta (1, 2, 3) o estado ("pendiente", "confirmado", "falso positivo").'
    });
  }

  try {
    // Verify alert exists
    const alertCheck = await db.query('SELECT id FROM alertas WHERE id = $1', [parseInt(id)]);
    if (alertCheck.rows.length === 0) {
      return res.status(404).json({ error: `La alerta con ID ${id} no existe.` });
    }

    // Retrieve moderator ID from JWT payload (req.user)
    const moderador_id = req.user ? req.user.id : null;
    const fecha_validacion = new Date().toISOString();

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
        parseInt(finalIdEstado),
        finalEstado,
        moderador_id,
        fecha_validacion,
        comentarios,
        parseInt(id)
      ]
    );

    return res.status(200).json({
      message: 'Estado de la alerta actualizado con éxito.',
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
  getActiveAlerts,
  getPendingAlerts,
  updateAlertStatus,
  getConfirmedAlerts
};
