const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Traditional auth routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/profile', authenticateToken, authController.getProfile);

// OTP verification routes (for signup)
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.post('/complete-registration', authController.completeRegistration);

// OTP login routes (for existing users)
router.post('/send-login-otp', authController.sendLoginOTP);
router.post('/login-with-otp', authController.loginWithOTP);

// Password reset routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-signup-otp', authController.verifySignupOTP);

// Google OAuth route
router.post('/google-auth', authController.googleAuth);

module.exports = router;


