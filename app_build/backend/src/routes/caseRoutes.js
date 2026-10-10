const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const biometriaController = require('../controllers/biometriaController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Búsqueda inversa biométrica 1:N
router.post('/reverse-search', upload.single('foto'), biometriaController.searchBiometricDatabase);

// Get all cases (public feed)
router.get('/', caseController.getCases);

// Get single case details (public view)
router.get('/:id', caseController.getCaseById);

// Get complete forensic dossier (evidences gallery, heatmap, timeline)
router.get('/:id/dossier', caseController.getCaseDossier);

// Create a missing person report (protected, with photo upload)
router.post('/', authMiddleware, upload.single('foto'), caseController.createCase);

// Update case status (protected)
router.put('/:id/estado', authMiddleware, express.json(), caseController.updateCaseStatus);

// Edit case details (protected, admin/moderator/owner)
router.put('/:id', authMiddleware, express.json(), caseController.updateCase);

// Delete case (protected, admin/moderator/owner)
router.delete('/:id', authMiddleware, caseController.deleteCase);

// Tarea 5: Aceptar búsqueda de caso (protected)
router.put('/:id/aceptar', authMiddleware, caseController.acceptSearch);

// Tarea 6: Consultar estado de rescate de un caso (public view)
router.get('/:id/estado', caseController.getRescueStatus);

module.exports = router;

