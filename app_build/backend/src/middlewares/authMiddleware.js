const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Formato de token inválido.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey_localizasv_2026');
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token inválido o expirado.' });
  }
};

const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Acceso no autenticado.' });
    }
    const userRole = (req.user.rol || 'ciudadano').toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());
    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        error: `Acceso restringido. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}.`
      });
    }
    next();
  };
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.roleMiddleware = roleMiddleware;
