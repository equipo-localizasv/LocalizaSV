const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middlewares/authMiddleware');

// Get all pending alerts
router.get('/pendientes', alertController.getPendingAlerts);

// Get all confirmed alerts (protected by JWT auth)
router.get('/activas', authMiddleware, alertController.getConfirmedAlerts);

// Update alert status (protected by JWT auth)
router.put('/:id', authMiddleware, express.json(), alertController.updateAlertStatus);

module.exports = router;
