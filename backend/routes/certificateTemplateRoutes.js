const express = require('express');
const router = express.Router();
const certificateTemplateController = require('../controllers/certificateTemplateController');
const { authenticateToken, requireAdmin, canManageCertificates } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Get certificate statistics
router.get('/stats', certificateTemplateController.getCertificateStats);

// Get all templates
router.get('/', certificateTemplateController.getAllTemplates);

// Get active template (default global)
router.get('/active', certificateTemplateController.getActiveTemplate);

// Get active templates per course (shows all course-specific assignments)
router.get('/active-per-course', certificateTemplateController.getActiveTemplatesPerCourse);

// Get template for a specific course
router.get('/for-course/:courseId', certificateTemplateController.getTemplateForCourse);

// Preview certificate (with or without template ID)
router.get('/preview', certificateTemplateController.previewCertificate);
router.get('/preview/:id', certificateTemplateController.previewCertificate);

// Get template by ID
router.get('/:id', certificateTemplateController.getTemplateById);

// Create new template (requires certificate management permission)
router.post('/', canManageCertificates, certificateTemplateController.createTemplate);

// Update template
router.put('/:id', canManageCertificates, certificateTemplateController.updateTemplate);

// Activate template (set as global default)
router.put('/:id/activate', canManageCertificates, certificateTemplateController.activateTemplate);

// Activate template for specific courses
router.put('/:id/activate-for-courses', canManageCertificates, certificateTemplateController.activateTemplateForCourses);

// Delete template
router.delete('/:id', canManageCertificates, certificateTemplateController.deleteTemplate);

// Upload background image
router.post('/:id/upload/background', canManageCertificates, certificateTemplateController.uploadBackground);

// Upload admin signature
router.post('/:id/upload/signature', canManageCertificates, certificateTemplateController.uploadAdminSignature);

module.exports = router;
