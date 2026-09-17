const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');

// Get all active alerts (used by Authority panel)
router.get('/activas', alertController.getActiveAlerts);

// Get all pending alerts (used by Moderator panel)
router.get('/pendientes', alertController.getPendingAlerts);

// Update alert status (restricted to Moderator and Authority)
router.put('/:id', authMiddleware, roleMiddleware(['moderador', 'autoridad']), express.json(), alertController.updateAlertStatus);

module.exports = router;
