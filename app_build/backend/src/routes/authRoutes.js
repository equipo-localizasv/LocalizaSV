const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { register, login, getMe, updateProfile, forgotPassword, resetPassword } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, 'selfie-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('El archivo subido debe ser una imagen válida (JPG, PNG, JPEG).'), false);
    }
};

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, 
    fileFilter
});

router.post('/register', upload.single('selfie'), register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authMiddleware, getMe);
router.put('/profile', authMiddleware, upload.single('selfie'), updateProfile);

module.exports = router;
