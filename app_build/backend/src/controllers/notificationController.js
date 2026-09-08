const db = require('../config/database');

const registerDeviceToken = async (req, res) => {
  const { token } = req.body;
  const usuario_id = req.user ? req.user.id : null;

  if (!token) {
    return res.status(400).json({ error: 'El token del dispositivo es requerido.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO tokens_fcm (usuario_id, token) 
       VALUES ($1, $2) 
       RETURNING *`,
      [usuario_id, token]
    );

    return res.status(201).json({
      message: 'Token de dispositivo registrado exitosamente.',
      token: result.rows[0]
    });
  } catch (error) {
    console.error('Error al registrar token de dispositivo:', error);
    return res.status(500).json({ error: 'Ocurrió un error en el servidor al registrar el token.' });
  }
};

module.exports = {
  registerDeviceToken
};
