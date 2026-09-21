const express = require('express');
const router = express.Router();
const cameraController = require('../controllers/cameraController');
const authMiddleware = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/authMiddleware');

// Rutas de cámaras
router.get('/', cameraController.getCameras);
router.post('/', cameraController.createCamera);
router.put('/:id', cameraController.updateCamera);
router.delete('/:id', cameraController.deleteCamera);
router.get('/:id/ping', cameraController.pingCamera);
router.get('/:id/stream', cameraController.proxyStream);
router.post('/:id/control', cameraController.controlCamera);
router.get('/:id/snapshot', cameraController.proxySnapshot);
router.post('/:id/autovigilancia', cameraController.toggleSurveillance);
router.get('/autovigilancia/status', cameraController.getSurveillanceStatus);
router.post('/autovigilancia/threshold', cameraController.setSurveillanceThreshold);

module.exports = router;
