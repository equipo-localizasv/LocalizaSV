const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middlewares/authMiddleware');

// Get all pending alerts (protected)
router.get('/pendientes', authMiddleware, alertController.getPendingAlerts);

// Update alert status (protected)
router.put('/:id', authMiddleware, express.json(), alertController.updateAlertStatus);

module.exports = router;
