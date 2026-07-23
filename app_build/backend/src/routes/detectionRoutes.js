const express = require('express');
const router = express.Router();
const detectionController = require('../controllers/detectionController');

// Route for camera detections (POST /api/detecciones)
router.post('/', express.json(), detectionController.createDetection);

module.exports = router;
