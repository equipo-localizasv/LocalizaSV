const express = require('express');
const router = express.Router();
const patrolController = require('../controllers/patrolController');
const authMiddleware = require('../middlewares/authMiddleware');

// Listar todas las patrullas activas
router.get('/activas', authMiddleware, patrolController.getActivePatrols);

// Actualizar GPS en tiempo real de patrulla
router.put('/ubicacion', authMiddleware, express.json(), patrolController.updatePatrolLocation);

// Reasignar / asignar patrulla a un caso
router.post('/asignar', authMiddleware, express.json(), patrolController.assignPatrolToCase);

// Enlace de llamada / radio táctico directo
router.post('/llamar', authMiddleware, express.json(), patrolController.initiateTacticalCall);

module.exports = router;
