const db = require('../config/database');

/**
 * Obtener lista de cámaras y drones de vigilancia
 * GET /api/camaras
 */
const getCameras = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM camaras ORDER BY id ASC');
    return res.status(200).json(result.rows || []);
  } catch (error) {
    console.error('Error al obtener cámaras:', error);
    return res.status(500).json({ error: 'Error al consultar las cámaras del sistema.' });
  }
};

/**
 * Registrar una nueva cámara IP o dron de vigilancia
 * POST /api/camaras
 */
const createCamera = async (req, res) => {
  const { nombre, ubicacion, lat, lng, stream_url, tipo, resolucion, fps } = req.body;

  if (!nombre || !stream_url) {
    return res.status(400).json({ error: 'El nombre y la URL del stream de la cámara son obligatorios.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO camaras (nombre, ubicacion, lat, lng, stream_url, tipo, resolucion, fps, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        nombre,
        ubicacion || 'Ubicación no especificada',
        lat ? parseFloat(lat) : 13.6929,
        lng ? parseFloat(lng) : -89.2182,
        stream_url,
        tipo || 'Cámara de Seguridad',
        resolucion || '1080p FHD',
        fps ? parseInt(fps) : 30,
        'activa'
      ]
    );

    return res.status(201).json({
      message: 'Cámara conectada exitosamente.',
      camara: result.rows[0]
    });
  } catch (error) {
    console.error('Error al registrar cámara:', error);
    return res.status(500).json({ error: 'Error al registrar la cámara en el sistema.' });
  }
};

/**
 * Eliminar una cámara de la lista
 * DELETE /api/camaras/:id
 */
const deleteCamera = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM camaras WHERE id = $1', [id]);
    return res.status(200).json({ message: 'Cámara desconectada del sistema.' });
  } catch (error) {
    console.error('Error al eliminar cámara:', error);
    return res.status(500).json({ error: 'Error al eliminar la cámara.' });
  }
};

module.exports = {
  getCameras,
  createCamera,
  deleteCamera
};
