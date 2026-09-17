const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Get all cases (public feed)
router.get('/', caseController.getCases);

// Get single case details (public view)
router.get('/:id', caseController.getCaseById);

// Create a missing person report (protected, with photo upload)
router.post('/', authMiddleware, upload.single('foto'), caseController.createCase);

// Update case status (protected, restricted to owner)
router.put('/:id/estado', authMiddleware, express.json(), caseController.updateCaseStatus);

// Tarea 5: Aceptar búsqueda de caso (protected)
router.put('/:id/aceptar', authMiddleware, caseController.acceptSearch);

// Tarea 6: Consultar estado de rescate de un caso (public view)
router.get('/:id/estado', caseController.getRescueStatus);

module.exports = router;

