const fs = require('fs');
const path = require('path');
const {
  sequelize,
  Course,
  Topic,
  Material,
  Enrollment,
  Progress,
  AIOutline,
  AILecture,
  AILectureSection,
  AISlideOutline,
  AIVisualSuggestion,
  AIFlashcard,
  AIQuiz,
  AIQuizQuestion,
  AITutorSession,
  AITutorMessage,
  AIStudentProgress,
  AIAudioAsset
} = require('../models');
const openaiService = require('./openaiService');

const AUDIO_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'ai-audio');

function validateLecturePackage(candidate) {
  const errors = [];

  if (!candidate || typeof candidate !== 'object') {
    return ['Lecture package is not an object'];
  }

  if (!candidate.title) errors.push('title is required');
  if (!candidate.summary) errors.push('summary is required');
  if (!candidate.teachingScript) errors.push('teachingScript is required');
  if (!Number.isInteger(candidate.estimatedDurationMinutes)) errors.push('estimatedDurationMinutes must be an integer');
  if (!Array.isArray(candidate.sections) || candidate.sections.length === 0) errors.push('sections must be a non-empty array');
  if (!Array.isArray(candidate.slideOutline)) errors.push('slideOutline must be an array');
  if (!Array.isArray(candidate.flashcards)) errors.push('flashcards must be an array');
  if (!candidate.quiz || !Array.isArray(candidate.quiz.questions) || candidate.quiz.questions.length === 0) {
    errors.push('quiz.questions must be a non-empty array');
  }

  return errors;
}

function normalizeLecturePackage(rawPackage, topicTitle) {
  const sections = Array.isArray(rawPackage.sections) ? rawPackage.sections : [];
  const normalizedSections = sections.map((section, sectionIndex) => {
    const explanation = `${section?.explanation || ''}`.trim();
    const chunks = Array.isArray(section?.chunks) && section.chunks.length > 0
      ? section.chunks.filter(Boolean).map((chunk) => `${chunk}`.trim()).filter(Boolean)
      : explanation
          .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z])/)
          .map((chunk) => chunk.trim())
          .filter(Boolean)
          .slice(0, 4);

    return {
      title: `${section?.title || `${topicTitle} Section ${sectionIndex + 1}`}`.trim(),
      summary: `${section?.summary || explanation || 'Core concept review.'}`.trim(),
      explanation,
      examples: Array.isArray(section?.examples) ? section.examples.map(String).filter(Boolean) : [],
      visualSuggestion: `${section?.visualSuggestion || ''}`.trim(),
      whiteboardSuggestion: `${section?.whiteboardSuggestion || ''}`.trim(),
      slideBullets: Array.isArray(section?.slideBullets) ? section.slideBullets.map(String).filter(Boolean) : [],
      chunks: chunks.length > 0 ? chunks : [explanation || `${topicTitle} overview.`]
    };
  });

  const flashcards = Array.isArray(rawPackage.flashcards) ? rawPackage.flashcards : [];
  const quizQuestions = Array.isArray(rawPackage?.quiz?.questions) ? rawPackage.quiz.questions : [];
  const slideOutline = Array.isArray(rawPackage.slideOutline) ? rawPackage.slideOutline : [];

  return {
    title: `${rawPackage.title || topicTitle}`.trim(),
    summary: `${rawPackage.summary || `Lecture covering ${topicTitle}.`}`.trim(),
    estimatedDurationMinutes: Number.isInteger(rawPackage.estimatedDurationMinutes) ? rawPackage.estimatedDurationMinutes : 10,
    teachingScript: `${rawPackage.teachingScript || normalizedSections.map((section) => section.explanation).join('\n\n')}`.trim(),
    sections: normalizedSections,
    slideOutline: slideOutline.map((slide, slideIndex) => ({
      title: `${slide?.title || `Slide ${slideIndex + 1}`}`.trim(),
      bullets: Array.isArray(slide?.bullets) ? slide.bullets.map(String).filter(Boolean) : [],
      notes: `${slide?.notes || ''}`.trim()
    })),
    flashcards: flashcards.map((card, cardIndex) => ({
      front: `${card?.front || `Flashcard ${cardIndex + 1}`}`.trim(),
      back: `${card?.back || ''}`.trim()
    })).filter((card) => card.front && card.back),
    quiz: {
      instructions: `${rawPackage?.quiz?.instructions || 'Answer all questions, then submit to unlock the next topic.'}`.trim(),
      passingThreshold: Number.isInteger(rawPackage?.quiz?.passingThreshold) ? rawPackage.quiz.passingThreshold : 70,
      questions: quizQuestions.map((question, questionIndex) => {
        const options = Array.isArray(question?.options) ? question.options.map(String).filter(Boolean).slice(0, 4) : [];
        while (options.length < 4) {
          options.push(`Option ${options.length + 1}`);
        }

        let correctAnswer = Number.isInteger(question?.correctAnswer) ? question.correctAnswer : 0;
        if (correctAnswer < 0 || correctAnswer > 3) {
          correctAnswer = 0;
        }

        return {
          prompt: `${question?.prompt || `Question ${questionIndex + 1}`}`.trim(),
          options,
          correctAnswer,
          explanation: `${question?.explanation || ''}`.trim()
        };
      }).filter((question) => question.prompt)
    }
  };
}

function getOutlineText(topic, materials) {
  const materialLines = (materials || []).map((material, index) => {
    return `${index + 1}. ${material.title || material.fileName || material.uri || 'Material'}${material.description ? ` - ${material.description}` : ''}`;
  });

  return [
    `Topic: ${topic.title}`,
    materialLines.length > 0 ? `Supporting materials:\n${materialLines.join('\n')}` : 'Supporting materials: none'
  ].join('\n\n');
}

async function canManageCourse(user, courseId) {
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  const isSuperAdmin = user.role === 'superadmin';
  const isOwner = course.userId === user.id;
  const canManageAll = user.permissions?.canManageAllCourses === true;

  if (!isSuperAdmin && !isOwner && !canManageAll) {
    throw new Error('You do not have permission to manage AI content for this course');
  }

  return course;
}

async function persistLecturePackage({
  course,
  topic,
  outline,
  normalizedPackage,
  modelName,
  nextTopicId
}) {
  return sequelize.transaction(async (transaction) => {
    let lecture = await AILecture.findOne({
      where: { topicId: topic.id },
      transaction
    });

    if (!lecture) {
      lecture = await AILecture.create({
        courseId: course.id,
        topicId: topic.id,
        outlineId: outline.id,
        title: normalizedPackage.title,
        summary: normalizedPackage.summary,
        estimatedDurationMinutes: normalizedPackage.estimatedDurationMinutes,
        teachingScript: normalizedPackage.teachingScript,
        preparationNotes: {
          generatedAt: new Date().toISOString(),
          sections: normalizedPackage.sections.length,
          flashcards: normalizedPackage.flashcards.length
        },
        passingThreshold: normalizedPackage.quiz.passingThreshold,
        nextTopicId,
        generationModel: modelName,
        status: 'ready',
        errorMessage: null
      }, { transaction });
    } else {
      await lecture.update({
        courseId: course.id,
        outlineId: outline.id,
        title: normalizedPackage.title,
        summary: normalizedPackage.summary,
        estimatedDurationMinutes: normalizedPackage.estimatedDurationMinutes,
        teachingScript: normalizedPackage.teachingScript,
        preparationNotes: {
          generatedAt: new Date().toISOString(),
          sections: normalizedPackage.sections.length,
          flashcards: normalizedPackage.flashcards.length
        },
        passingThreshold: normalizedPackage.quiz.passingThreshold,
        nextTopicId,
        generationModel: modelName,
        status: 'ready',
        errorMessage: null
      }, { transaction });
    }

    const existingQuiz = await AIQuiz.findOne({
      where: { lectureId: lecture.id },
      transaction
    });

    if (existingQuiz) {
      await AIQuizQuestion.destroy({ where: { quizId: existingQuiz.id }, transaction });
      await AIQuiz.destroy({ where: { id: existingQuiz.id }, transaction });
    }

    await Promise.all([
      AILectureSection.destroy({ where: { lectureId: lecture.id }, transaction }),
      AISlideOutline.destroy({ where: { lectureId: lecture.id }, transaction }),
      AIVisualSuggestion.destroy({ where: { lectureId: lecture.id }, transaction }),
      AIFlashcard.destroy({ where: { lectureId: lecture.id }, transaction })
    ]);

    const sectionRows = [];
    normalizedPackage.sections.forEach((section, sectionIndex) => {
      section.chunks.forEach((chunkText, chunkIndex) => {
        sectionRows.push({
          lectureId: lecture.id,
          sectionIndex,
          chunkIndex,
          title: section.title,
          summary: section.summary,
          chunkText,
          examples: section.examples,
          visualSuggestion: section.visualSuggestion,
          whiteboardSuggestion: section.whiteboardSuggestion,
          slideBullets: section.slideBullets
        });
      });
    });

    if (sectionRows.length > 0) {
      await AILectureSection.bulkCreate(sectionRows, { transaction });
    }

    const slideRows = normalizedPackage.slideOutline.map((slide, slideIndex) => ({
      lectureId: lecture.id,
      slideIndex,
      title: slide.title,
      bullets: slide.bullets,
      notes: slide.notes
    }));
    if (slideRows.length > 0) {
      await AISlideOutline.bulkCreate(slideRows, { transaction });
    }

    const visualRows = normalizedPackage.sections.map((section, sectionIndex) => ({
      lectureId: lecture.id,
      sectionIndex,
      title: section.title,
      suggestion: section.visualSuggestion || section.whiteboardSuggestion || `Visual aid for ${section.title}`
    }));
    if (visualRows.length > 0) {
      await AIVisualSuggestion.bulkCreate(visualRows, { transaction });
    }

    const flashcardRows = normalizedPackage.flashcards.map((card, cardIndex) => ({
      lectureId: lecture.id,
      cardIndex,
      frontText: card.front,
      backText: card.back
    }));
    if (flashcardRows.length > 0) {
      await AIFlashcard.bulkCreate(flashcardRows, { transaction });
    }

    const quiz = await AIQuiz.create({
      lectureId: lecture.id,
      passingThreshold: normalizedPackage.quiz.passingThreshold,
      instructions: normalizedPackage.quiz.instructions
    }, { transaction });

    await AIQuizQuestion.bulkCreate(normalizedPackage.quiz.questions.map((question, questionIndex) => ({
      quizId: quiz.id,
      questionIndex,
      prompt: question.prompt,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation
    })), { transaction });

    return lecture;
  });
}

async function generateCoursePackage(courseId, adminUser) {
  const course = await canManageCourse(adminUser, courseId);
  const topics = await Topic.findAll({
    where: { courseId },
    include: [{ model: Material, as: 'materials' }],
    order: [['order', 'ASC']]
  });

  if (topics.length === 0) {
    throw new Error('Add at least one topic before generating AI lecture content');
  }

  const results = [];

  for (let index = 0; index < topics.length; index += 1) {
    const topic = topics[index];
    const priorTopics = topics.slice(0, index).map((item) => item.title);
    const nextTopicTitle = topics[index + 1]?.title || null;
    const defaultOutlineText = getOutlineText(topic, topic.materials);

    const [outline] = await AIOutline.findOrCreate({
      where: { topicId: topic.id },
      defaults: {
        courseId,
        topicId: topic.id,
        adminId: adminUser.id,
        outlineText: defaultOutlineText,
        sourceMaterials: [],
        status: 'draft'
      }
    });

    const outlineText = outline.outlineText || defaultOutlineText;

    await outline.update({
      courseId,
      adminId: adminUser.id,
      outlineText,
      sourceMaterials: (topic.materials || []).map((material) => ({
        id: material.id,
        title: material.title,
        description: material.description,
        type: material.type,
        uri: material.uri
      })),
      status: 'processing',
      errorMessage: null
    });

    try {
      const generation = await openaiService.generateLecturePackage({
        course,
        topic,
        materials: (topic.materials || []).map((material) => ({
          title: material.title,
          description: material.description,
          type: material.type
        })),
        priorTopics,
        nextTopicTitle,
        outlineText
      });

      let rawPackage = generation.package;
      const validationErrors = validateLecturePackage(rawPackage);
      if (validationErrors.length > 0) {
        rawPackage = await openaiService.repairLecturePackage(JSON.stringify(rawPackage), validationErrors);
      }

      const normalized = normalizeLecturePackage(rawPackage, topic.title);
      const finalValidationErrors = validateLecturePackage(normalized);
      if (finalValidationErrors.length > 0) {
        throw new Error(`Generated lecture package is invalid: ${finalValidationErrors.join(', ')}`);
      }

      await persistLecturePackage({
        course,
        topic,
        outline,
        normalizedPackage: normalized,
        modelName: generation.model,
        nextTopicId: topics[index + 1]?.id || null
      });

      await outline.update({ status: 'ready', errorMessage: null });
      results.push({ topicId: topic.id, topicTitle: topic.title, status: 'ready' });
    } catch (error) {
      console.error(`AI generation failed for topic ${topic.id}:`, error);
      await outline.update({ status: 'failed', errorMessage: error.message });

      const existingLecture = await AILecture.findOne({ where: { topicId: topic.id } });
      if (existingLecture) {
        await existingLecture.update({ status: 'failed', errorMessage: error.message });
      }

      results.push({
        topicId: topic.id,
        topicTitle: topic.title,
        status: 'failed',
        error: error.message
      });
    }
  }

  return results;
}

async function getLectureByTopicId(topicId) {
  return AILecture.findOne({
    where: { topicId },
    include: [
      { model: AILectureSection, as: 'sections' },
      { model: AISlideOutline, as: 'slideOutlines' },
      { model: AIVisualSuggestion, as: 'visualSuggestions' },
      { model: AIFlashcard, as: 'flashcards' },
      {
        model: AIQuiz,
        as: 'aiQuiz',
        include: [{ model: AIQuizQuestion, as: 'questions' }]
      },
      { model: Topic, as: 'topic' },
      { model: Topic, as: 'nextTopic' }
    ]
  });
}

function mapLectureChunk(lecture, sectionIndex, chunkIndex) {
  const sections = (lecture.sections || []).slice().sort((a, b) => {
    if (a.sectionIndex === b.sectionIndex) {
      return a.chunkIndex - b.chunkIndex;
    }
    return a.sectionIndex - b.sectionIndex;
  });

  const chunk = sections.find((item) => item.sectionIndex === sectionIndex && item.chunkIndex === chunkIndex);
  if (!chunk) {
    return null;
  }

  return {
    id: chunk.id,
    sectionIndex: chunk.sectionIndex,
    chunkIndex: chunk.chunkIndex,
    title: chunk.title,
    summary: chunk.summary,
    text: chunk.chunkText,
    examples: chunk.examples,
    visualSuggestion: chunk.visualSuggestion,
    whiteboardSuggestion: chunk.whiteboardSuggestion,
    slideBullets: chunk.slideBullets
  };
}

function getNextChunkPointer(lecture, currentSectionIndex, currentChunkIndex) {
  const ordered = (lecture.sections || []).slice().sort((a, b) => {
    if (a.sectionIndex === b.sectionIndex) {
      return a.chunkIndex - b.chunkIndex;
    }
    return a.sectionIndex - b.sectionIndex;
  });

  const currentPosition = ordered.findIndex((item) => item.sectionIndex === currentSectionIndex && item.chunkIndex === currentChunkIndex);
  if (currentPosition === -1) {
    return ordered[0]
      ? { sectionIndex: ordered[0].sectionIndex, chunkIndex: ordered[0].chunkIndex, hasMore: true }
      : { hasMore: false };
  }

  const nextChunk = ordered[currentPosition + 1];
  if (!nextChunk) {
    return { hasMore: false };
  }

  return {
    sectionIndex: nextChunk.sectionIndex,
    chunkIndex: nextChunk.chunkIndex,
    hasMore: true
  };
}

async function ensureStudentEnrollment(userId, courseId) {
  const enrollment = await Enrollment.findOne({
    where: { userId, courseId }
  });

  if (!enrollment) {
    throw new Error('You must be enrolled in this course');
  }

  return enrollment;
}

async function startTutorSession(userId, topicId, voiceModeEnabled) {
  const lecture = await getLectureByTopicId(topicId);
  if (!lecture || lecture.status !== 'ready') {
    throw new Error('Lecture package is not ready for this topic');
  }

  await ensureStudentEnrollment(userId, lecture.courseId);

  const [progress] = await AIStudentProgress.findOrCreate({
    where: {
      userId,
      courseId: lecture.courseId,
      topicId: lecture.topicId
    },
    defaults: {
      lectureId: lecture.id,
      currentSectionIndex: 0,
      currentChunkIndex: 0
    }
  });

  let session = await AITutorSession.findOne({
    where: {
      userId,
      topicId,
      status: ['in_progress', 'paused', 'lecture_completed']
    },
    order: [['updatedAt', 'DESC']]
  });

  if (!session) {
    session = await AITutorSession.create({
      userId,
      courseId: lecture.courseId,
      topicId,
      lectureId: lecture.id,
      currentSectionIndex: progress.currentSectionIndex,
      currentChunkIndex: progress.currentChunkIndex,
      status: progress.lectureCompleted ? 'lecture_completed' : 'in_progress',
      voiceModeEnabled: Boolean(voiceModeEnabled),
      lastActivityAt: new Date()
    });
  } else {
    await session.update({
      lectureId: lecture.id,
      voiceModeEnabled: Boolean(voiceModeEnabled),
      currentSectionIndex: progress.currentSectionIndex,
      currentChunkIndex: progress.currentChunkIndex,
      lastActivityAt: new Date()
    });
  }

  await progress.update({
    lectureId: lecture.id,
    lastSessionId: session.id
  });

  const chunk = mapLectureChunk(lecture, session.currentSectionIndex, session.currentChunkIndex) || mapLectureChunk(lecture, 0, 0);

  return {
    session,
    lecture,
    progress,
    chunk
  };
}

async function getSessionState(sessionId, userId) {
  const session = await AITutorSession.findOne({
    where: { id: sessionId, userId },
    include: [{
      model: AITutorMessage,
      as: 'messages',
      separate: true,
      limit: 20,
      order: [['createdAt', 'ASC']]
    }]
  });

  if (!session) {
    throw new Error('Tutor session not found');
  }

  const lecture = await getLectureByTopicId(session.topicId);
  const chunk = lecture ? mapLectureChunk(lecture, session.currentSectionIndex, session.currentChunkIndex) : null;
  const progress = await AIStudentProgress.findOne({
    where: {
      userId,
      courseId: session.courseId,
      topicId: session.topicId
    }
  });

  return {
    session,
    lecture,
    progress,
    chunk
  };
}

async function setSessionPaused(sessionId, userId, paused) {
  const session = await AITutorSession.findOne({
    where: { id: sessionId, userId }
  });

  if (!session) {
    throw new Error('Tutor session not found');
  }

  await session.update({
    status: paused ? 'paused' : (session.status === 'lecture_completed' ? 'lecture_completed' : 'in_progress'),
    lastActivityAt: new Date()
  });

  return session;
}

async function getNextLectureChunk(sessionId, userId) {
  const session = await AITutorSession.findOne({
    where: { id: sessionId, userId }
  });

  if (!session) {
    throw new Error('Tutor session not found');
  }

  const lecture = await getLectureByTopicId(session.topicId);
  if (!lecture) {
    throw new Error('Lecture package not found');
  }

  const pointer = getNextChunkPointer(lecture, session.currentSectionIndex, session.currentChunkIndex);
  if (!pointer.hasMore) {
    await session.update({
      status: 'lecture_completed',
      lastActivityAt: new Date()
    });

    const [progress] = await AIStudentProgress.findOrCreate({
      where: {
        userId,
        courseId: session.courseId,
        topicId: session.topicId
      },
      defaults: { lectureId: session.lectureId }
    });

    await progress.update({
      lectureCompleted: true,
      currentSectionIndex: session.currentSectionIndex,
      currentChunkIndex: session.currentChunkIndex,
      lastSessionId: session.id
    });

    return { session, lectureCompleted: true, chunk: null };
  }

  await session.update({
    currentSectionIndex: pointer.sectionIndex,
    currentChunkIndex: pointer.chunkIndex,
    status: 'in_progress',
    lastActivityAt: new Date()
  });

  const [progress] = await AIStudentProgress.findOrCreate({
    where: {
      userId,
      courseId: session.courseId,
      topicId: session.topicId
    },
    defaults: { lectureId: session.lectureId }
  });

  await progress.update({
    lectureId: lecture.id,
    currentSectionIndex: pointer.sectionIndex,
    currentChunkIndex: pointer.chunkIndex,
    lastSessionId: session.id
  });

  return {
    session,
    lectureCompleted: false,
    chunk: mapLectureChunk(lecture, pointer.sectionIndex, pointer.chunkIndex)
  };
}

async function submitQuestion(sessionId, userId, question) {
  const session = await AITutorSession.findOne({
    where: { id: sessionId, userId },
    include: [{
      model: AITutorMessage,
      as: 'messages',
      separate: true,
      limit: 6,
      order: [['createdAt', 'DESC']]
    }]
  });

  if (!session) {
    throw new Error('Tutor session not found');
  }

  const lecture = await getLectureByTopicId(session.topicId);
  if (!lecture) {
    throw new Error('Lecture package not found');
  }

  const currentChunk = mapLectureChunk(lecture, session.currentSectionIndex, session.currentChunkIndex);
  const sectionChunks = (lecture.sections || [])
    .filter((item) => item.sectionIndex === session.currentSectionIndex)
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map((item) => item.chunkText);

  await session.update({
    status: 'paused',
    lastActivityAt: new Date()
  });

  const userMessage = await AITutorMessage.create({
    sessionId: session.id,
    sender: 'user',
    messageType: 'question',
    content: question,
    contextSnapshot: {
      sectionIndex: session.currentSectionIndex,
      chunkIndex: session.currentChunkIndex
    }
  });

  const response = await openaiService.answerLectureQuestion({
    lectureTitle: lecture.title,
    lectureSummary: lecture.summary,
    currentChunk: currentChunk?.text || '',
    currentSection: {
      title: currentChunk?.title || lecture.title,
      chunks: sectionChunks
    },
    recentMessages: (session.messages || []).slice().reverse().map((message) => ({
      sender: message.sender,
      content: message.content
    })),
    question
  });

  const aiMessage = await AITutorMessage.create({
    sessionId: session.id,
    sender: 'ai',
    messageType: 'answer',
    content: response.answer,
    contextSnapshot: {
      sectionIndex: session.currentSectionIndex,
      chunkIndex: session.currentChunkIndex,
      model: response.model
    }
  });

  return {
    session,
    lecture,
    userMessage,
    aiMessage
  };
}

async function getFlashcards(lectureId) {
  return AIFlashcard.findAll({
    where: { lectureId },
    order: [['cardIndex', 'ASC']]
  });
}

async function getQuiz(lectureId) {
  return AIQuiz.findOne({
    where: { lectureId },
    include: [{ model: AIQuizQuestion, as: 'questions' }]
  });
}

async function recalculateEnrollmentProgress(userId, courseId) {
  const totalTopics = await Topic.count({ where: { courseId } });
  const completedTopics = await Progress.count({
    where: {
      userId,
      courseId,
      completed: true
    }
  });

  const enrollment = await Enrollment.findOne({
    where: { userId, courseId }
  });

  if (!enrollment) {
    return;
  }

  const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  await enrollment.update({
    progressPercentage,
    status: progressPercentage >= 100 ? 'completed' : progressPercentage > 0 ? 'in-progress' : 'enrolled',
    completedAt: progressPercentage >= 100 ? new Date() : null
  });
}

async function unlockNextTopicForStudent({ userId, courseId, topicId, nextTopicId }) {
  await sequelize.transaction(async (transaction) => {
    const currentTopic = await Topic.findByPk(topicId, { transaction });
    if (currentTopic && !currentTopic.completed) {
      await currentTopic.update({
        completed: true,
        status: 'unlocked'
      }, { transaction });
    }

    const [progress] = await Progress.findOrCreate({
      where: {
        userId,
        courseId,
        topicId
      },
      defaults: {
        completed: true,
        completedAt: new Date(),
        timeSpent: 0
      },
      transaction
    });

    await progress.update({
      completed: true,
      completedAt: new Date()
    }, { transaction });

    if (nextTopicId) {
      const nextTopic = await Topic.findByPk(nextTopicId, { transaction });
      if (nextTopic && nextTopic.status === 'locked') {
        await nextTopic.update({ status: 'unlocked' }, { transaction });
      }
    }
  });

  await recalculateEnrollmentProgress(userId, courseId);
  return nextTopicId ? Topic.findByPk(nextTopicId) : null;
}

async function submitQuiz(lectureId, userId, answers) {
  const lecture = await AILecture.findByPk(lectureId);
  if (!lecture) {
    throw new Error('Lecture not found');
  }

  await ensureStudentEnrollment(userId, lecture.courseId);

  const quiz = await getQuiz(lectureId);
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    throw new Error('Quiz not available for this lecture');
  }

  let correctAnswers = 0;
  const gradedQuestions = quiz.questions.map((question) => {
    const submittedAnswer = Number(answers?.[question.id]);
    const isCorrect = submittedAnswer === question.correctAnswer;
    if (isCorrect) {
      correctAnswers += 1;
    }

    return {
      id: question.id,
      submittedAnswer: Number.isInteger(submittedAnswer) ? submittedAnswer : null,
      correctAnswer: question.correctAnswer,
      isCorrect,
      explanation: question.explanation
    };
  });

  const totalQuestions = quiz.questions.length;
  const score = Math.round((correctAnswers / totalQuestions) * 100);
  const passed = score >= quiz.passingThreshold;

  const [progress] = await AIStudentProgress.findOrCreate({
    where: {
      userId,
      courseId: lecture.courseId,
      topicId: lecture.topicId
    },
    defaults: { lectureId }
  });

  await progress.update({
    lectureId,
    lectureCompleted: true,
    quizScore: score,
    quizPassed: passed,
    quizAttempts: progress.quizAttempts + 1,
    unlockedNextTopicId: passed ? lecture.nextTopicId : null
  });

  const unlockedTopic = passed
    ? await unlockNextTopicForStudent({
        userId,
        courseId: lecture.courseId,
        topicId: lecture.topicId,
        nextTopicId: lecture.nextTopicId
      })
    : null;

  return {
    score,
    passed,
    correctAnswers,
    totalQuestions,
    passingThreshold: quiz.passingThreshold,
    gradedQuestions,
    unlockedTopic
  };
}

async function getOrCreateAudioAsset({ lectureId, sessionId, assetType, text }) {
  const cacheKey = openaiService.createAudioCacheKey([`${lectureId || ''}`, `${sessionId || ''}`, assetType, text]);
  const existing = await AIAudioAsset.findOne({ where: { cacheKey } });
  if (existing && fs.existsSync(existing.storagePath)) {
    return existing;
  }

  fs.mkdirSync(AUDIO_UPLOAD_DIR, { recursive: true });
  const filename = `${cacheKey}.mp3`;
  const outputPath = path.join(AUDIO_UPLOAD_DIR, filename);

  await openaiService.synthesizeSpeech(text, outputPath);

  return AIAudioAsset.create({
    lectureId: lectureId || null,
    sessionId: sessionId || null,
    cacheKey,
    assetType,
    voice: 'alloy',
    mimeType: 'audio/mpeg',
    storagePath: outputPath,
    urlPath: `/uploads/ai-audio/${filename}`,
    textPreview: text.slice(0, 120)
  });
}

module.exports = {
  generateCoursePackage,
  getLectureByTopicId,
  startTutorSession,
  getSessionState,
  getNextLectureChunk,
  setSessionPaused,
  submitQuestion,
  getFlashcards,
  getQuiz,
  submitQuiz,
  getOrCreateAudioAsset,
  canManageCourse,
  recalculateEnrollmentProgress
};
