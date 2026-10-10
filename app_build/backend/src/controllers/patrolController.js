const db = require('../config/database');
const { broadcast } = require('../wsServer');

/**
 * Obtener listado de personal y patrullas PNC activas
 * GET /api/patrullas/activas
 */
const getActivePatrols = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, nombre, email, telefono, rol, placa_pnc, delegacion_pnc, patrulla_pnc, en_servicio, lat, lng, ultima_conexion 
       FROM usuarios 
       WHERE rol = 'autoridad'`
    );

    const patrullas = (result.rows || []).map(p => ({
      ...p,
      en_servicio: p.en_servicio !== undefined ? Boolean(p.en_servicio) : true,
      lat: p.lat || 13.6929,
      lng: p.lng || -89.2182,
      placa_pnc: p.placa_pnc || `PNC-${10000 + p.id * 137}`,
      delegacion_pnc: p.delegacion_pnc || 'Delegación San Salvador Centro',
      patrulla_pnc: p.patrulla_pnc || `Unidad Táctica PNC #${p.id}`
    }));

    return res.status(200).json(patrullas);
  } catch (error) {
    console.error('Error al listar patrullas activas:', error);
    return res.status(500).json({ error: 'Error al obtener patrullas activas.' });
  }
};

/**
 * Actualizar ubicación GPS en tiempo real de patrulla PNC
 * PUT /api/patrullas/ubicacion
 */
const updatePatrolLocation = async (req, res) => {
  const { lat, lng, en_servicio } = req.body;
  const userId = req.user.id;

  try {
    const ultimaConexion = new Date().toISOString();
    await db.query(
      `UPDATE usuarios 
       SET lat = $1, lng = $2, en_servicio = $3, ultima_conexion = $4 
       WHERE id = $5`,
      [parseFloat(lat), parseFloat(lng), en_servicio !== undefined ? Boolean(en_servicio) : true, ultimaConexion, userId]
    );

    const payload = {
      usuario_id: userId,
      nombre: req.user.nombre,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      en_servicio: en_servicio !== undefined ? Boolean(en_servicio) : true,
      timestamp: ultimaConexion
    };

    if (typeof broadcast === 'function') {
      broadcast('patrulla_ubicacion', payload);
    }

    return res.status(200).json({
      message: 'Ubicación GPS transmitida con éxito.',
      data: payload
    });
  } catch (error) {
    console.error('Error al actualizar ubicación de patrulla:', error);
    return res.status(500).json({ error: 'Error al actualizar ubicación GPS.' });
  }
};

/**
 * Reasignar o asignar patrulla a un caso de rescate
 * POST /api/patrullas/asignar
 */
const assignPatrolToCase = async (req, res) => {
  const { caso_id, usuario_id, patrulla_nombre } = req.body;

  if (!caso_id || !usuario_id) {
    return res.status(400).json({ error: 'caso_id y usuario_id de la patrulla son requeridos.' });
  }

  try {
    const fechaAceptacion = new Date().toISOString();
    const updateResult = await db.query(
      `UPDATE casos 
       SET estado = $1, usuario_asignado_id = $2, fecha_aceptacion = $3 
       WHERE id = $4 
       RETURNING *`,
      ['En Proceso de Rescate', parseInt(usuario_id), fechaAceptacion, parseInt(caso_id)]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Caso no encontrado.' });
    }

    const updatedCase = updateResult.rows[0];

    // Notificar por WebSocket a la central C4I y a las unidades tácticas
    if (typeof broadcast === 'function') {
      broadcast('patrulla_reasignada', {
        caso_id: parseInt(caso_id),
        usuario_id: parseInt(usuario_id),
        patrulla_nombre: patrulla_nombre || 'Unidad Móvil PNC',
        timestamp: fechaAceptacion
      });
      broadcast('caso_actualizado', updatedCase);
    }

    return res.status(200).json({
      message: `Patrulla asignada con éxito al caso #${caso_id}.`,
      caso: updatedCase
    });
  } catch (error) {
    console.error('Error al asignar patrulla:', error);
    return res.status(500).json({ error: 'Error interno al asignar patrulla.' });
  }
};

/**
 * Canal de Comunicación Directa / Radio Intercom entre Moderador C4I y Patrullas
 * POST /api/patrullas/llamar
 */
const initiateTacticalCall = async (req, res) => {
  const { para_usuario_id, canal, mensaje } = req.body;
  const deUsuario = req.user;

  try {
    const callData = {
      id_llamada: `CALL-${Date.now()}`,
      de_usuario_id: deUsuario.id,
      de_nombre: deUsuario.nombre,
      de_rol: deUsuario.rol,
      para_usuario_id: para_usuario_id ? parseInt(para_usuario_id) : 'todos',
      canal: canal || 'Radio Frecuencia PNC C4I - Canal Táctico 1',
      mensaje: mensaje || 'Llamada de enlace de radio iniciada.',
      fecha: new Date().toISOString(),
      estado: 'conectado'
    };

    if (typeof broadcast === 'function') {
      broadcast('llamada_tactica_intercom', callData);
    }

    return res.status(200).json({
      message: 'Canal de comunicación táctica enlazado.',
      llamada: callData
    });
  } catch (error) {
    console.error('Error en enlace táctico:', error);
    return res.status(500).json({ error: 'Error al enlazar llamada táctica.' });
  }
};

module.exports = {
  getActivePatrols,
  updatePatrolLocation,
  assignPatrolToCase,
  initiateTacticalCall
};
