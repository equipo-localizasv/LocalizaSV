const express = require('express');
const router = express.Router();
const cameraController = require('../controllers/cameraController');
const authMiddleware = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/authMiddleware');

// Rutas públicas o de moderación
router.get('/', cameraController.getCameras);
router.post('/', authMiddleware, roleMiddleware(['moderador', 'autoridad']), cameraController.createCamera);
router.delete('/:id', authMiddleware, roleMiddleware(['moderador', 'autoridad']), cameraController.deleteCamera);

module.exports = router;
