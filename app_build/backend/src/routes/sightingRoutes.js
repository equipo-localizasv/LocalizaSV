const express = require('express');
const router = express.Router();
const sightingController = require('../controllers/sightingController');
const upload = require('../middlewares/uploadMiddleware');
const optionalAuth = (req, res, next) => {
  // Permite reportar tanto autenticado como anónimo
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey_localizasv_2026');
      req.user = decoded;
    } catch (e) {
      // Ignorar error de token inválido para no bloquear reporte ciudadano
    }
  }
  next();
};

// POST /api/avistamientos
router.post(
  '/',
  optionalAuth,
  upload.single('foto'),
  sightingController.reportSighting
);

module.exports = router;
