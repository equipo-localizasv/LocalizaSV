const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

// Get all pending alerts
router.get('/pendientes', alertController.getPendingAlerts);

// Update alert status
router.put('/:id', express.json(), alertController.updateAlertStatus);

module.exports = router;
