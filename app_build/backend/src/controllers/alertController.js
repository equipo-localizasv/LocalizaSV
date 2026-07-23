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

const getActiveAlerts = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, c.nombre_desaparecido 
       FROM alertas a
       JOIN casos c ON a.caso_id = c.id
       WHERE a.estado != 'falso positivo'
       ORDER BY a.created_at DESC`
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener alertas activas:', error);
    return res.status(500).json({ error: 'Ocurrió un error en el servidor al obtener las alertas activas.' });
  }
};

const updateAlertStatus = async (req, res) => {
  const { id } = req.params;
  const { estado, moderador_id, comentarios_moderador, fecha_validacion } = req.body;

  let dbEstadoName = null;
  if (estado) {
    const statusLower = estado.toLowerCase().trim();
    if (statusLower === 'pendiente') dbEstadoName = 'Pendiente';
    else if (statusLower === 'confirmado') dbEstadoName = 'Confirmado';
    else if (statusLower === 'falso positivo' || statusLower === 'falso_positivo') dbEstadoName = 'Falso Positivo';
  }

  if (!dbEstadoName) {
    return res.status(400).json({
      error: 'Estado inválido o no proporcionado. Los estados permitidos son: Pendiente, Confirmado, Falso Positivo.'
    });
  }

  try {
    // 1. Obtener el ID del estado desde el catálogo estados_alerta
    const statusResult = await db.query(
      'SELECT id FROM estados_alerta WHERE nombre = $1',
      [dbEstadoName]
    );

    if (statusResult.rows.length === 0) {
      return res.status(400).json({
        error: `El estado '${dbEstadoName}' no se encuentra registrado en el catálogo.`
      });
    }

    const id_estado_alerta = statusResult.rows[0].id;

    // 2. Validar que el moderador_id exista si se proporciona
    const activeModeratorId = moderador_id || req.user?.id || null;
    if (activeModeratorId) {
      const userCheck = await db.query('SELECT id FROM usuarios WHERE id = $1', [activeModeratorId]);
      if (userCheck.rows.length === 0) {
        return res.status(400).json({
          error: `El moderador con ID ${activeModeratorId} no existe en la base de datos.`
        });
      }
    }

    // 3. Determinar fecha de validación (usar la provista o la actual si cambia de Pendiente)
    const validDate = fecha_validacion || (dbEstadoName !== 'Pendiente' ? new Date().toISOString() : null);

    // 4. Ejecutar la actualización
    const result = await db.query(
      `UPDATE alertas 
       SET id_estado_alerta = $1, 
           moderador_id = $2, 
           fecha_validacion = $3, 
           comentarios_moderador = $4 
       WHERE id = $5 
       RETURNING *`,
      [
        id_estado_alerta,
        activeModeratorId,
        validDate,
        comentarios_moderador || null,
        parseInt(id)
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `La alerta con ID ${id} no existe.` });
    }

    // Mapear el string estado de vuelta en el json devuelto para mantener compatibilidad
    const updatedAlert = result.rows[0];
    updatedAlert.estado = dbEstadoName.toLowerCase();

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
  getActiveAlerts,
  updateAlertStatus
};
