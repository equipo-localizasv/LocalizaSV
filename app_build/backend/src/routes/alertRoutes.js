const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

// Get all pending alerts
router.get('/pendientes', alertController.getPendingAlerts);

// Get active alerts for interactive map
router.get('/activas', alertController.getActiveAlerts);

// Update alert status
router.put('/:id', express.json(), alertController.updateAlertStatus);

module.exports = router;
