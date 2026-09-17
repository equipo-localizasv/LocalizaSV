const express = require('express');
const router = express.Router();
const biometriaController = require('../controllers/biometriaController');
const upload = require('../middlewares/uploadMiddleware');

// Escanear rostro en tiempo real usando InsightFace
router.post('/scan', upload.single('foto'), biometriaController.scanFace);

// Cotejo forense 1:1 entre dos rostros
router.post('/compare', express.json(), biometriaController.compareFaces);

// Búsqueda biométrica 1:N en toda la base de datos de casos
router.post('/search', upload.single('foto'), biometriaController.searchBiometricDatabase);

// Diagnóstico de calidad, pose y recomendaciones
router.post('/diagnostico', upload.single('foto'), biometriaController.diagnoseFaceQuality);

module.exports = router;
