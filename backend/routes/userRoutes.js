const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Get all students
router.get('/students', userController.getAllStudents);

// Get all experts
router.get('/experts', userController.getAllExperts);

// Get user by ID
router.get('/:id', userController.getUserById);

// Toggle user active status
router.patch('/:id/toggle-status', userController.toggleUserStatus);

// Delete user
router.delete('/:id', userController.deleteUser);

module.exports = router;
