const fs = require('fs');
const path = require('path');
const os = require('os');
const multer = require('multer');
const { Topic, AILecture, AIOutline } = require('../models');
const aiTutorService = require('../services/aiTutorService');
const openaiService = require('../services/openaiService');

const upload = multer({ storage: multer.memoryStorage() });
const VALID_AUDIO_ASSET_TYPES = new Set(['lecture_chunk', 'qa_answer']);

function parseOptionalInteger(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function logBadRequest(scope, req, error, extra = {}) {
  console.error(`[AI Tutor] ${scope} failed`, {
    userId: req.user?.id || null,
    route: req.originalUrl,
    method: req.method,
    message: error?.message || error,
    ...extra
  });
}

exports.audioUploadMiddleware = upload.single('audio');

exports.upsertOutline = async (req, res) => {
  try {
    const { topicId } = req.params;
    const topic = await Topic.findByPk(topicId);

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    await aiTutorService.canManageCourse(req.user, topic.courseId);

    const outlineText = req.body.outlineText?.trim();
    if (!outlineText) {
      return res.status(400).json({ error: 'outlineText is required' });
    }

    const [outline] = await AIOutline.findOrCreate({
      where: { topicId: topic.id },
      defaults: {
        courseId: topic.courseId,
        topicId: topic.id,
        adminId: req.user.id,
        outlineText,
        sourceMaterials: [],
        status: 'draft'
      }
    });

    await outline.update({
      adminId: req.user.id,
      outlineText
    });

    const result = { topicId: topic.id, topicTitle: topic.title, status: 'updated' };
    res.json({ success: true, result });
  } catch (error) {
    console.error('Upsert AI outline error:', error);
    res.status(error.message.includes('permission') ? 403 : 400).json({ error: error.message || 'Internal server error' });
  }
};

exports.generateCoursePackage = async (req, res) => {
  try {
    const replaceExisting = req.body?.replaceExisting === true;
    const generation = await aiTutorService.startCourseGeneration(req.params.courseId, req.user, {
      replaceExisting,
    });

    res.status(202).json({
      success: true,
      accepted: true,
      alreadyRunning: generation.alreadyRunning,
      courseId: generation.courseId,
      startedAt: generation.startedAt,
      replaceExisting,
      message: generation.alreadyRunning
        ? 'AI lecture generation is already in progress for this course.'
        : replaceExisting
          ? 'Previous AI lecture packages were cleared. Fresh AI generation has started.'
          : 'AI lecture generation has started. You can track progress from the admin screen.'
    });
  } catch (error) {
    logBadRequest('generateCoursePackage', req, error, {
      courseId: req.params.courseId,
      replaceExisting: req.body?.replaceExisting === true,
    });
    res.status(error.message.includes('permission') ? 403 : 400).json({ error: error.message || 'Internal server error' });
  }
};

exports.getGenerationStatus = async (req, res) => {
  try {
    await aiTutorService.canManageCourse(req.user, req.params.courseId);
    const status = await aiTutorService.getCourseGenerationStatus(req.params.courseId);
    res.json(status);
  } catch (error) {
    console.error('Get AI generation status error:', error);
    res.status(error.message.includes('permission') ? 403 : 400).json({ error: error.message || 'Internal server error' });
  }
};

exports.listLectures = async (req, res) => {
  try {
    const lectures = await AILecture.findAll({
      where: req.query.topicId
        ? { courseId: req.params.courseId, topicId: req.query.topicId }
        : { courseId: req.params.courseId },
      include: [{ model: Topic, as: 'topic' }],
      order: [['createdAt', 'ASC']]
    });

    res.json({ success: true, lectures });
  } catch (error) {
    console.error('List AI lectures error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getLecturePackage = async (req, res) => {
  try {
    const lecture = await aiTutorService.getLectureByTopicId(req.params.topicId);
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture package not found' });
    }

    res.json({ success: true, lecture });
  } catch (error) {
    console.error('Get AI lecture package error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.startSession = async (req, res) => {
  try {
    const payload = await aiTutorService.startTutorSession(
      req.user.id,
      req.params.topicId,
      req.body.voiceModeEnabled
    );

    res.status(201).json({
      success: true,
      session: payload.session,
      lecture: payload.lecture,
      progress: payload.progress,
      chunk: payload.chunk
    });
  } catch (error) {
    logBadRequest('startSession', req, error, {
      topicId: req.params.topicId,
      voiceModeEnabled: Boolean(req.body?.voiceModeEnabled)
    });
    res.status(error.message.includes('enrolled') ? 403 : 400).json({ error: error.message || 'Internal server error' });
  }
};

exports.getSessionState = async (req, res) => {
  try {
    const state = await aiTutorService.getSessionState(req.params.sessionId, req.user.id);
    res.json({ success: true, ...state });
  } catch (error) {
    console.error('Get AI tutor session state error:', error);
    res.status(404).json({ error: error.message || 'Internal server error' });
  }
};

exports.getNextChunk = async (req, res) => {
  try {
    const result = await aiTutorService.getNextLectureChunk(req.params.sessionId, req.user.id);
    res.json({ success: true, ...result });
  } catch (error) {
    logBadRequest('getNextChunk', req, error, {
      sessionId: req.params.sessionId
    });
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
};

exports.restartSession = async (req, res) => {
  try {
    const result = await aiTutorService.restartTutorSession(req.params.sessionId, req.user.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Restart AI tutor session error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
};

exports.pauseSession = async (req, res) => {
  try {
    const session = await aiTutorService.setSessionPaused(req.params.sessionId, req.user.id, true, {
      pauseReason: req.body.pauseReason,
      resumeLeadIn: req.body.resumeLeadIn,
    });
    res.json({ success: true, session });
  } catch (error) {
    logBadRequest('pauseSession', req, error, {
      sessionId: req.params.sessionId,
      pauseReason: req.body?.pauseReason || null
    });
    res.status(404).json({ error: error.message || 'Internal server error' });
  }
};

exports.resumeSession = async (req, res) => {
  try {
    await aiTutorService.setSessionPaused(req.params.sessionId, req.user.id, false);
    const state = await aiTutorService.getSessionState(req.params.sessionId, req.user.id);
    res.json({ success: true, ...state });
  } catch (error) {
    console.error('Resume AI tutor session error:', error);
    res.status(404).json({ error: error.message || 'Internal server error' });
  }
};

exports.submitQuestion = async (req, res) => {
  const question = req.body.question?.trim();
  try {
    if (!question) {
      return res.status(400).json({ error: 'question is required' });
    }

    const result = await aiTutorService.submitQuestion(req.params.sessionId, req.user.id, question);
    res.json({ success: true, ...result });
  } catch (error) {
    logBadRequest('submitQuestion', req, error, {
      sessionId: req.params.sessionId,
      questionLength: question?.length || 0
    });
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
};

exports.getFlashcards = async (req, res) => {
  try {
    const flashcards = await aiTutorService.getFlashcards(req.params.lectureId);
    res.json({ success: true, flashcards });
  } catch (error) {
    console.error('Get AI flashcards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getQuiz = async (req, res) => {
  try {
    const quiz = await aiTutorService.getQuiz(req.params.lectureId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const sanitizedQuiz = {
      ...quiz.toJSON(),
      questions: (quiz.questions || [])
        .slice()
        .sort((a, b) => a.questionIndex - b.questionIndex)
        .map((question) => ({
        id: question.id,
        questionIndex: question.questionIndex,
        prompt: question.prompt,
        options: question.options
      }))
    };

    res.json({ success: true, quiz: sanitizedQuiz });
  } catch (error) {
    console.error('Get AI quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const result = await aiTutorService.submitQuiz(req.params.lectureId, req.user.id, req.body.answers || {});
    res.json({ success: true, result });
  } catch (error) {
    console.error('Submit AI quiz error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
};

exports.transcribeAudio = async (req, res) => {
  let tempFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'audio file is required' });
    }

    const extension = path.extname(req.file.originalname || '') || '.webm';
    tempFilePath = path.join(os.tmpdir(), `skillsphere-ai-${Date.now()}${extension}`);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    const transcript = await openaiService.transcribeAudio(tempFilePath);
    res.json({ success: true, transcript });
  } catch (error) {
    logBadRequest('transcribeAudio', req, error, {
      originalName: req.file?.originalname || null,
      mimeType: req.file?.mimetype || null,
      size: req.file?.size || 0
    });
    res.status(400).json({ error: error.message || 'Internal server error' });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
};

exports.speakText = async (req, res) => {
  try {
    const text = req.body.text?.trim();
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    const requestedAssetType = `${req.body.assetType || 'lecture_chunk'}`.trim();
    const assetType = VALID_AUDIO_ASSET_TYPES.has(requestedAssetType)
      ? requestedAssetType
      : 'lecture_chunk';
    if (assetType !== requestedAssetType) {
      console.warn('Normalizing unsupported AI speech assetType:', requestedAssetType);
    }

    const lectureId = parseOptionalInteger(req.body.lectureId);
    const sessionId = parseOptionalInteger(req.body.sessionId);

    const asset = await aiTutorService.getOrCreateAudioAsset({
      lectureId,
      sessionId,
      assetType,
      text
    });

    res.json({ success: true, asset });
  } catch (error) {
    logBadRequest('speakText', req, error, {
      lectureId: parseOptionalInteger(req.body?.lectureId),
      sessionId: parseOptionalInteger(req.body?.sessionId),
      assetType: req.body?.assetType || null,
      textLength: `${req.body?.text || ''}`.trim().length
    });
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
};

exports.smokeTest = async (req, res) => {
  try {
    const response = await openaiService.smokeTest();
    res.json({ success: true, response });
  } catch (error) {
    console.error('OpenAI smoke test error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
