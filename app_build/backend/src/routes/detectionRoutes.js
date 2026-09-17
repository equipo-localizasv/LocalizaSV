const express = require('express');
const router = express.Router();
const detectionController = require('../controllers/detectionController');
const upload = require('../middlewares/uploadMiddleware');

// Route for camera detections (POST /api/detecciones)
// Accepts multipart/form-data with 'imagen' or 'foto', or standard JSON body
router.post(
  '/',
  upload.fields([{ name: 'imagen', maxCount: 1 }, { name: 'foto', maxCount: 1 }]),
  detectionController.createDetection
);

module.exports = router;

