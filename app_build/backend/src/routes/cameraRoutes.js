const express = require('express');
const router = express.Router();
const cameraController = require('../controllers/cameraController');
const authMiddleware = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/authMiddleware');

// Rutas de cámaras
router.get('/', cameraController.getCameras);
router.post('/', cameraController.createCamera);
router.post('/:id/control', cameraController.controlCamera);
router.get('/:id/snapshot', cameraController.proxySnapshot);
router.delete('/:id', cameraController.deleteCamera);

module.exports = router;
