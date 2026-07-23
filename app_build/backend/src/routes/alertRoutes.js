const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middlewares/authMiddleware');

// Get all active alerts (public or authority)
router.get('/activas', alertController.getActiveAlerts);

// Get all pending alerts
router.get('/pendientes', alertController.getPendingAlerts);

// Update alert status (protected)
router.put('/:id', authMiddleware, express.json(), alertController.updateAlertStatus);

module.exports = router;
