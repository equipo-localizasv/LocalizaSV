const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middlewares/authMiddleware');

// Get all active alerts (protected, used by Authority panel)
router.get('/activas', authMiddleware, alertController.getActiveAlerts);

// Get all pending alerts (used by Moderator panel)
router.get('/pendientes', alertController.getPendingAlerts);

// Update alert status (protected, used by Moderator panel)
router.put('/:id', authMiddleware, express.json(), alertController.updateAlertStatus);

module.exports = router;
