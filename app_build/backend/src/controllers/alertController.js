const db = require('../config/database');
<<<<<<< HEAD
const { broadcast } = require('../wsServer');
=======
const { sendNotificationToAll } = require('../services/notifications');
>>>>>>> 703923d02561cfc9719a4f587f9292a65555b69b

const getPendingAlerts = async (req, res) => {
  try {
    // OPTIMIZED: Filter by indexed integer ID (a.id_estado_alerta = 1) instead of string LOWER evaluation
    const result = await db.query(
      `SELECT a.*, LOWER(ea.nombre) as estado, c.nombre_desaparecido 
       FROM alertas a
       JOIN casos c ON a.caso_id = c.id
       JOIN estados_alerta ea ON a.id_estado_alerta = ea.id
       WHERE a.id_estado_alerta = 1
       ORDER BY a.fecha_deteccion DESC`
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener alertas pendientes:', error);
    return res.status(500).json({ error: 'Ocurrió un error en el servidor al obtener las alertas pendientes.' });
  }
};

const getActiveAlerts = async (req, res) => {
  try {
    // OPTIMIZED: Filter by indexed integer ID (a.id_estado_alerta = 2) for confirmed/active alerts
    const result = await db.query(
      `SELECT a.*, c.nombre_desaparecido 
       FROM alertas a
       JOIN casos c ON a.caso_id = c.id
       WHERE a.id_estado_alerta = 2
       ORDER BY a.created_at DESC`
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener alertas activas:', error);
    return res.status(500).json({ error: 'Ocurrió un error en el servidor al obtener las alertas activas.' });
  }
};

const getConfirmedAlerts = async (req, res) => {
  return getActiveAlerts(req, res);
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
    const alertCheck = await db.query('SELECT id, caso_id FROM alertas WHERE id = $1', [parseInt(id)]);
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
      [finalIdEstado, finalEstado, moderador_id, fecha_validacion, comentarios, parseInt(id)]
    );

<<<<<<< HEAD
    const updatedAlert = result.rows[0];

    // Emit WebSocket event
    broadcast('alerta_actualizada', updatedAlert);
=======
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `La alerta con ID ${id} no existe.` });
    }

    const updatedAlert = result.rows[0];

    // 1. Broadcast WebSocket event in real-time
    const appModule = require('../app');
    if (appModule && typeof appModule.broadcast === 'function') {
      appModule.broadcast('alerta_actualizada', updatedAlert);
    }

    // 2. Trigger push notification if status was updated to Confirmed (id_estado_alerta = 2)
    if (parseInt(finalIdEstado) === 2) {
      try {
        const caseResult = await db.query(
          'SELECT nombre_desaparecido FROM casos WHERE id = $1',
          [updatedAlert.caso_id]
        );
        const name = caseResult.rows[0] ? caseResult.rows[0].nombre_desaparecido : 'Desconocido';
        
        // Fire and forget push notification async
        sendNotificationToAll(
          '¡Alerta de avistamiento confirmada!',
          `Se ha confirmado un avistamiento para: ${name}`,
          {
            click_action: `/caso/${updatedAlert.caso_id}`,
            caso_id: String(updatedAlert.caso_id),
            alerta_id: String(updatedAlert.id)
          }
        ).catch(err => {
          console.error('[Notification Trigger Error] Failed to send push message:', err);
        });
      } catch (triggerError) {
        console.error('[Notification Trigger Error] Failed to query case or send push:', triggerError);
      }
    }
>>>>>>> 703923d02561cfc9719a4f587f9292a65555b69b

    return res.status(200).json({
      message: 'Estado de la alerta actualizado con éxito.',
      alerta: updatedAlert
    });
  } catch (error) {
    console.error('Error al actualizar estado de la alerta:', error);
    return res.status(500).json({ error: 'Ocurrió un error en el servidor al actualizar la alerta.' });
  }
};

module.exports = {
  getActiveAlerts,
  getPendingAlerts,
  updateAlertStatus,
  getConfirmedAlerts
};
