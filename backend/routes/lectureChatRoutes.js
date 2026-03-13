const express = require('express');
const router = express.Router();
const lectureChatController = require('../controllers/lectureChatController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/:courseId/:topicId', lectureChatController.getHistory);
router.post('/:courseId/:topicId/messages', lectureChatController.sendMessage);
router.delete('/:courseId/:topicId', lectureChatController.clearHistory);

module.exports = router;
