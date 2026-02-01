const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { authenticateToken } = require('../middleware/auth');

// Get student's certificates (requires authentication)
router.get('/my', authenticateToken, certificateController.getMyCertificates);

// Generate certificate (requires authentication)
router.post('/', authenticateToken, certificateController.generateCertificate);

// Verify certificate (public route)
router.get('/verify/:certificateNumber', certificateController.verifyCertificate);

module.exports = router;
