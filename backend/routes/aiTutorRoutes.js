const express = require('express');
const router = express.Router();
const aiTutorController = require('../controllers/aiTutorController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.put('/topics/:topicId/outline', aiTutorController.upsertOutline);
router.post('/courses/:courseId/generate', aiTutorController.generateCoursePackage);
router.get('/courses/:courseId/generate-status', aiTutorController.getGenerationStatus);
router.get('/courses/:courseId/lectures', aiTutorController.listLectures);
router.get('/topics/:topicId/package', aiTutorController.getLecturePackage);

router.post('/topics/:topicId/start', aiTutorController.startSession);
router.get('/sessions/:sessionId', aiTutorController.getSessionState);
router.post('/sessions/:sessionId/next', aiTutorController.getNextChunk);
router.post('/sessions/:sessionId/restart', aiTutorController.restartSession);
router.post('/sessions/:sessionId/pause', aiTutorController.pauseSession);
router.post('/sessions/:sessionId/resume', aiTutorController.resumeSession);
router.post('/sessions/:sessionId/questions', aiTutorController.submitQuestion);

router.get('/lectures/:lectureId/flashcards', aiTutorController.getFlashcards);
router.get('/lectures/:lectureId/quiz', aiTutorController.getQuiz);
router.post('/lectures/:lectureId/quiz/submit', aiTutorController.submitQuiz);

router.post('/audio/transcribe', aiTutorController.audioUploadMiddleware, aiTutorController.transcribeAudio);
router.post('/audio/speak', aiTutorController.speakText);
router.get('/smoke-test', aiTutorController.smokeTest);

module.exports = router;
