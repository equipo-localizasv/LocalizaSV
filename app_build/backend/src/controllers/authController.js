const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
require('dotenv').config();

// Helper regex validation
const DUI_REGEX = /^\d{8}-\d$/;
const PHONE_REGEX = /^[2678]\d{3}-?\d{4}$/;

const register = async (req, res) => {
  const { nombre, dui, email, telefono, password, rol: rolBody } = req.body;

  // Check file upload
  if (!req.file) {
    return res.status(400).json({ error: 'La selfie de verificación es obligatoria.' });
  }

  const selfie_url = `/uploads/${req.file.filename}`;

  // Field validation
  if (!nombre || !dui || !email || !telefono || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  if (!DUI_REGEX.test(dui)) {
    return res.status(400).json({ error: 'El formato del DUI debe ser XXXXXXXX-X.' });
  }

  if (!PHONE_REGEX.test(telefono)) {
    return res.status(400).json({ error: 'El formato del teléfono debe ser XXXX-XXXX salvadoreño válido.' });
  }

  // Validate allowed roles (default to 'ciudadano')
  const allowedRoles = ['ciudadano', 'moderador', 'autoridad'];
  let rol = 'ciudadano';
  if (rolBody) {
    const normRole = rolBody.trim().toLowerCase();
    if (allowedRoles.includes(normRole)) {
      rol = normRole;
    } else {
      return res.status(400).json({
        error: `Rol inválido. Los roles permitidos son: ${allowedRoles.join(', ')}.`
      });
    }
  }

  try {
    // Check if user exists (DUI or Email)
    const userCheck = await db.query(
      'SELECT id FROM usuarios WHERE email = $1 OR dui = $2',
      [email, dui]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'El correo electrónico o DUI ya se encuentra registrado.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user into DB with role
    await db.query(
      `INSERT INTO usuarios (nombre, dui, email, telefono, password_hash, selfie_url, rol)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [nombre, dui, email, telefono, password_hash, selfie_url, rol]
    );

    return res.status(201).json({ 
      message: 'Usuario registrado con éxito.',
      rol 
    });
  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({ error: 'Ocurrió un error al registrar el usuario en el servidor.' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'El correo y la contraseña son obligatorios.' });
  }

  try {
    // Retrieve user
    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const user = result.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const userRole = user.rol || 'ciudadano';

    // Sign JWT with role in payload
    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email, rol: userRole },
      process.env.JWT_SECRET || 'supersecretkey_localizasv_2026',
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        dui: user.dui,
        telefono: user.telefono,
        selfie_url: user.selfie_url,
        rol: userRole
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Ocurrió un error en el servidor al intentar iniciar sesión.' });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nombre, dui, email, telefono, selfie_url, rol, created_at FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const user = result.rows[0];

    return res.status(200).json({
      ...user,
      rol: user.rol || req.user.rol || 'ciudadano'
    });
  } catch (error) {
    console.error('Error en getMe:', error);
    return res.status(500).json({ error: 'Error al obtener los datos del usuario.' });
  }
};

const updateProfile = async (req, res) => {
  const { nombre } = req.body;
  const userId = req.user.id;

  try {
    let updateQuery = 'UPDATE usuarios SET nombre = $1';
    const queryParams = [nombre];

    if (req.file) {
      const selfie_url = `/uploads/${req.file.filename}`;
      updateQuery += ', selfie_url = $2 WHERE id = $3 RETURNING id, nombre, dui, email, telefono, selfie_url, created_at';
      queryParams.push(selfie_url, userId);
    } else {
      updateQuery += ' WHERE id = $2 RETURNING id, nombre, dui, email, telefono, selfie_url, created_at';
      queryParams.push(userId);
    }

    const result = await db.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    return res.status(200).json({ message: 'Perfil actualizado con éxito.', usuario: result.rows[0] });
  } catch (error) {
    console.error('Error en updateProfile:', error);
    return res.status(500).json({ error: 'Error al actualizar el perfil.' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};
