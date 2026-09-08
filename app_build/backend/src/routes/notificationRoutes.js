const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');

// Registrar token del dispositivo (protegido por token JWT)
router.post('/register-token', authMiddleware, express.json(), notificationController.registerDeviceToken);

module.exports = router;
