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

module.exports = router;
