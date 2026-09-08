const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const contentFilterMiddleware = require('../middlewares/contentFilterMiddleware');

// User Registration with single selfie upload
router.post('/register', upload.single('selfie'), authController.register);

// User Login
router.post('/login', express.json(), authController.login);

// Get currently logged-in user profile details (protected)
router.get('/me', authMiddleware, authController.getMe);

// Update user profile (protected, with text/image filtering)
router.put('/profile', authMiddleware, upload.single('selfie'), contentFilterMiddleware, authController.updateProfile);

module.exports = router;
