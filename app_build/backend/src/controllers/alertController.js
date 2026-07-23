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
  const { estado } = req.body;

  const validStatuses = ['pendiente', 'confirmado', 'falso positivo'];
  if (!estado || !validStatuses.includes(estado)) {
    return res.status(400).json({
      error: `Estado inválido. Los estados permitidos son: ${validStatuses.join(', ')}.`
    });
  }

  try {
    const result = await db.query(
      `UPDATE alertas 
       SET estado = $1 
       WHERE id = $2 
       RETURNING *`,
      [estado, parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `La alerta con ID ${id} no existe.` });
    }

    return res.status(200).json({
      message: 'Estado de la alerta actualizado con éxito.',
      alerta: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar estado de la alerta:', error);
    return res.status(500).json({ error: 'Ocurrió un error en el servidor al actualizar la alerta.' });
  }
};

module.exports = {
  getPendingAlerts,
  updateAlertStatus
};
