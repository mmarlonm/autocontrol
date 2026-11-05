const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', AuthController.register);
router.post('/signup', AuthController.register); // Alias
router.post('/login', AuthController.login);
router.get('/profile', authMiddleware, AuthController.getProfile);
router.post('/fcm-token', authMiddleware, AuthController.updateFcmToken);
router.put('/fcm-token', authMiddleware, AuthController.updateFcmToken);

module.exports = router;
