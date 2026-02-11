const { Quiz, QuizResult, Course, Enrollment } = require('../models');

// Get all quizzes for a course
exports.getQuizzesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const quizzes = await Quiz.findAll({
      where: { courseId, isActive: true },
      include: [{ model: Course, as: 'course' }]
    });

    // Don't send answers to client
    const sanitizedQuizzes = quizzes.map(quiz => {
      const quizData = quiz.toJSON();
      if (quizData.questions) {
        quizData.questions = quizData.questions.map(q => ({
          id: q.id,
          question: q.question,
          options: q.options,
          // Don't include correctAnswer
        }));
      }
      return quizData;
    });

    res.json({ success: true, quizzes: sanitizedQuizzes });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get quiz by ID
exports.getQuizById = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await Quiz.findByPk(id, {
      include: [{ model: Course, as: 'course' }]
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Don't send answers to client
    const quizData = quiz.toJSON();
    if (quizData.questions) {
      quizData.questions = quizData.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
      }));
    }

    res.json({ success: true, quiz: quizData });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Submit quiz
exports.submitQuiz = async (req, res) => {
  try {
    const { quizId, answers, timeTaken } = req.body;

    if (!quizId || !answers) {
      return res.status(400).json({ error: 'Quiz ID and answers are required' });
    }

    const quiz = await Quiz.findByPk(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      where: {
        userId: req.user.id,
        courseId: quiz.courseId
      }
    });

    if (!enrollment) {
      return res.status(403).json({ error: 'You must be enrolled in this course' });
    }

    // Calculate score
    const questions = quiz.questions;
    let correctAnswers = 0;
    const totalQuestions = questions.length;

    questions.forEach(question => {
      const userAnswer = answers[question.id];
      if (userAnswer === question.correctAnswer) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = score >= (quiz.passingScore || 70);

    // Get attempt number
    const previousAttempts = await QuizResult.count({
      where: {
        userId: req.user.id,
        quizId
      }
    });

    // Save result
    const result = await QuizResult.create({
      userId: req.user.id,
      quizId,
      courseId: quiz.courseId,
      answers,
      score,
      correctAnswers,
      totalQuestions,
      passed,
      timeTaken,
      attemptNumber: previousAttempts + 1
    });

    res.status(201).json({
      success: true,
      result: {
        id: result.id,
        score,
        correctAnswers,
        totalQuestions,
        passed,
        attemptNumber: result.attemptNumber
      }
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get quiz results for authenticated student
exports.getMyQuizResults = async (req, res) => {
  try {
    const results = await QuizResult.findAll({
      where: { userId: req.user.id },
      include: [
        { model: Quiz, as: 'quiz' },
        { model: Course, as: 'course' }
      ],
      order: [['submittedAt', 'DESC']]
    });

    res.json({ success: true, results });
  } catch (error) {
    console.error('Get my quiz results error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = exports;
