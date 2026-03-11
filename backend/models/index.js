const User = require('./User');
const Category = require('./Category');
const Course = require('./Course');
const Topic = require('./Topic');
const Material = require('./Material');
const Feedback = require('./Feedback');
const Enrollment = require('./Enrollment');
const Progress = require('./Progress');
const Quiz = require('./Quiz');
const QuizResult = require('./QuizResult');
const Certificate = require('./Certificate');
const CertificateTemplate = require('./CertificateTemplate');
const TemplateCourse = require('./TemplateCourse');
const Notification = require('./Notification');
const AIChatSession = require('./AIChatSession');
const AIChatMessage = require('./AIChatMessage');
const AIOutline = require('./AIOutline');
const AILecture = require('./AILecture');
const AILectureSection = require('./AILectureSection');
const AISlideOutline = require('./AISlideOutline');
const AIVisualSuggestion = require('./AIVisualSuggestion');
const AIFlashcard = require('./AIFlashcard');
const AIQuiz = require('./AIQuiz');
const AIQuizQuestion = require('./AIQuizQuestion');
const AITutorSession = require('./AITutorSession');
const AITutorMessage = require('./AITutorMessage');
const AIStudentProgress = require('./AIStudentProgress');
const AIAudioAsset = require('./AIAudioAsset');
const { sequelize } = require('../config/database');

// Define associations

// User - Course (Creator/Admin relationship)
User.hasMany(Course, { foreignKey: 'userId', as: 'courses', onDelete: 'CASCADE' });
Course.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

// Category - Course
Course.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(Course, { foreignKey: 'categoryId', as: 'courses' });

// Course - Topic
Topic.belongsTo(Course, { foreignKey: 'courseId', as: 'course', onDelete: 'CASCADE' });
Course.hasMany(Topic, { foreignKey: 'courseId', as: 'topics', onDelete: 'CASCADE' });

// Course - Material
Material.belongsTo(Course, { foreignKey: 'courseId', as: 'course', onDelete: 'CASCADE' });
Course.hasMany(Material, { foreignKey: 'courseId', as: 'materials', onDelete: 'CASCADE' });

// Topic - Material
Material.belongsTo(Topic, { foreignKey: 'topicId', as: 'topic', onDelete: 'CASCADE' });
Topic.hasMany(Material, { foreignKey: 'topicId', as: 'materials', onDelete: 'CASCADE' });

// Course - Feedback
Feedback.belongsTo(Course, { foreignKey: 'courseId', as: 'course', onDelete: 'CASCADE' });
Course.hasMany(Feedback, { foreignKey: 'courseId', as: 'feedbacks', onDelete: 'CASCADE' });

// User - Enrollment
User.hasMany(Enrollment, { foreignKey: 'userId', as: 'enrollments', onDelete: 'CASCADE' });
Enrollment.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

// Course - Enrollment
Course.hasMany(Enrollment, { foreignKey: 'courseId', as: 'enrollments', onDelete: 'CASCADE' });
Enrollment.belongsTo(Course, { foreignKey: 'courseId', as: 'course', onDelete: 'CASCADE' });

// User - Progress
User.hasMany(Progress, { foreignKey: 'userId', as: 'progress', onDelete: 'CASCADE' });
Progress.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

// Course - Progress
Course.hasMany(Progress, { foreignKey: 'courseId', as: 'progress', onDelete: 'CASCADE' });
Progress.belongsTo(Course, { foreignKey: 'courseId', as: 'course', onDelete: 'CASCADE' });

// Topic - Progress
Topic.hasMany(Progress, { foreignKey: 'topicId', as: 'progress', onDelete: 'CASCADE' });
Progress.belongsTo(Topic, { foreignKey: 'topicId', as: 'topic', onDelete: 'CASCADE' });

// Course - Quiz
Course.hasMany(Quiz, { foreignKey: 'courseId', as: 'quizzes', onDelete: 'CASCADE' });
Quiz.belongsTo(Course, { foreignKey: 'courseId', as: 'course', onDelete: 'CASCADE' });

// Topic - Quiz
Topic.hasMany(Quiz, { foreignKey: 'topicId', as: 'quizzes', onDelete: 'CASCADE' });
Quiz.belongsTo(Topic, { foreignKey: 'topicId', as: 'topic', onDelete: 'SET NULL' });

// User - QuizResult
User.hasMany(QuizResult, { foreignKey: 'userId', as: 'quizResults', onDelete: 'CASCADE' });
QuizResult.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

// Quiz - QuizResult
Quiz.hasMany(QuizResult, { foreignKey: 'quizId', as: 'results', onDelete: 'CASCADE' });
QuizResult.belongsTo(Quiz, { foreignKey: 'quizId', as: 'quiz', onDelete: 'CASCADE' });

// Course - QuizResult
Course.hasMany(QuizResult, { foreignKey: 'courseId', as: 'quizResults', onDelete: 'CASCADE' });
QuizResult.belongsTo(Course, { foreignKey: 'courseId', as: 'course', onDelete: 'CASCADE' });

// User - Certificate
User.hasMany(Certificate, { foreignKey: 'userId', as: 'certificates', onDelete: 'CASCADE' });
Certificate.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

// Course - Certificate
Course.hasMany(Certificate, { foreignKey: 'courseId', as: 'certificates', onDelete: 'CASCADE' });
Certificate.belongsTo(Course, { foreignKey: 'courseId', as: 'course', onDelete: 'CASCADE' });

// User - Notification
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

// User - CertificateTemplate (Creator relationship)
User.hasMany(CertificateTemplate, { foreignKey: 'createdBy', as: 'certificateTemplates', onDelete: 'SET NULL' });
CertificateTemplate.belongsTo(User, { foreignKey: 'createdBy', as: 'creator', onDelete: 'SET NULL' });

// CertificateTemplate - Course (Many-to-Many through TemplateCourse)
CertificateTemplate.belongsToMany(Course, {
  through: TemplateCourse,
  foreignKey: 'templateId',
  otherKey: 'courseId',
  as: 'courses'
});
Course.belongsToMany(CertificateTemplate, {
  through: TemplateCourse,
  foreignKey: 'courseId',
  otherKey: 'templateId',
  as: 'certificateTemplates'
});

// Direct associations for TemplateCourse to access template and course
TemplateCourse.belongsTo(CertificateTemplate, { foreignKey: 'templateId', as: 'template' });
TemplateCourse.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
CertificateTemplate.hasMany(TemplateCourse, { foreignKey: 'templateId', as: 'templateCourses' });
Course.hasMany(TemplateCourse, { foreignKey: 'courseId', as: 'templateCourses' });

// User - AIChatSession
User.hasMany(AIChatSession, { foreignKey: 'userId', as: 'chatSessions', onDelete: 'CASCADE' });
AIChatSession.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

// AIChatSession - AIChatMessage
AIChatSession.hasMany(AIChatMessage, { foreignKey: 'sessionId', as: 'messages', onDelete: 'CASCADE' });
AIChatMessage.belongsTo(AIChatSession, { foreignKey: 'sessionId', as: 'session', onDelete: 'CASCADE' });

// Course / Topic - AI outline and lecture package
Course.hasMany(AIOutline, { foreignKey: 'courseId', as: 'aiOutlines', onDelete: 'CASCADE' });
AIOutline.belongsTo(Course, { foreignKey: 'courseId', as: 'course', onDelete: 'CASCADE' });
Topic.hasOne(AIOutline, { foreignKey: 'topicId', as: 'aiOutline', onDelete: 'CASCADE' });
AIOutline.belongsTo(Topic, { foreignKey: 'topicId', as: 'topic', onDelete: 'CASCADE' });
User.hasMany(AIOutline, { foreignKey: 'adminId', as: 'generatedOutlines', onDelete: 'SET NULL' });
AIOutline.belongsTo(User, { foreignKey: 'adminId', as: 'admin', onDelete: 'SET NULL' });

Course.hasMany(AILecture, { foreignKey: 'courseId', as: 'aiLectures', onDelete: 'CASCADE' });
AILecture.belongsTo(Course, { foreignKey: 'courseId', as: 'course', onDelete: 'CASCADE' });
Topic.hasOne(AILecture, { foreignKey: 'topicId', as: 'aiLecture', onDelete: 'CASCADE' });
AILecture.belongsTo(Topic, { foreignKey: 'topicId', as: 'topic', onDelete: 'CASCADE' });
AIOutline.hasOne(AILecture, { foreignKey: 'outlineId', as: 'lecture', onDelete: 'SET NULL' });
AILecture.belongsTo(AIOutline, { foreignKey: 'outlineId', as: 'outline', onDelete: 'SET NULL' });
AILecture.belongsTo(Topic, { foreignKey: 'nextTopicId', as: 'nextTopic', onDelete: 'SET NULL' });

AILecture.hasMany(AILectureSection, { foreignKey: 'lectureId', as: 'sections', onDelete: 'CASCADE' });
AILectureSection.belongsTo(AILecture, { foreignKey: 'lectureId', as: 'lecture', onDelete: 'CASCADE' });
AILecture.hasMany(AISlideOutline, { foreignKey: 'lectureId', as: 'slideOutlines', onDelete: 'CASCADE' });
AISlideOutline.belongsTo(AILecture, { foreignKey: 'lectureId', as: 'lecture', onDelete: 'CASCADE' });
AILecture.hasMany(AIVisualSuggestion, { foreignKey: 'lectureId', as: 'visualSuggestions', onDelete: 'CASCADE' });
AIVisualSuggestion.belongsTo(AILecture, { foreignKey: 'lectureId', as: 'lecture', onDelete: 'CASCADE' });
AILecture.hasMany(AIFlashcard, { foreignKey: 'lectureId', as: 'flashcards', onDelete: 'CASCADE' });
AIFlashcard.belongsTo(AILecture, { foreignKey: 'lectureId', as: 'lecture', onDelete: 'CASCADE' });

AILecture.hasOne(AIQuiz, { foreignKey: 'lectureId', as: 'aiQuiz', onDelete: 'CASCADE' });
AIQuiz.belongsTo(AILecture, { foreignKey: 'lectureId', as: 'lecture', onDelete: 'CASCADE' });
AIQuiz.hasMany(AIQuizQuestion, { foreignKey: 'quizId', as: 'questions', onDelete: 'CASCADE' });
AIQuizQuestion.belongsTo(AIQuiz, { foreignKey: 'quizId', as: 'quiz', onDelete: 'CASCADE' });

User.hasMany(AITutorSession, { foreignKey: 'userId', as: 'aiTutorSessions', onDelete: 'CASCADE' });
AITutorSession.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
Course.hasMany(AITutorSession, { foreignKey: 'courseId', as: 'aiTutorSessions', onDelete: 'CASCADE' });
AITutorSession.belongsTo(Course, { foreignKey: 'courseId', as: 'course', onDelete: 'CASCADE' });
Topic.hasMany(AITutorSession, { foreignKey: 'topicId', as: 'aiTutorSessions', onDelete: 'CASCADE' });
AITutorSession.belongsTo(Topic, { foreignKey: 'topicId', as: 'topic', onDelete: 'CASCADE' });
AILecture.hasMany(AITutorSession, { foreignKey: 'lectureId', as: 'sessions', onDelete: 'CASCADE' });
AITutorSession.belongsTo(AILecture, { foreignKey: 'lectureId', as: 'lecture', onDelete: 'CASCADE' });

AITutorSession.hasMany(AITutorMessage, { foreignKey: 'sessionId', as: 'messages', onDelete: 'CASCADE' });
AITutorMessage.belongsTo(AITutorSession, { foreignKey: 'sessionId', as: 'session', onDelete: 'CASCADE' });

User.hasMany(AIStudentProgress, { foreignKey: 'userId', as: 'aiProgress', onDelete: 'CASCADE' });
AIStudentProgress.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
Course.hasMany(AIStudentProgress, { foreignKey: 'courseId', as: 'aiProgress', onDelete: 'CASCADE' });
AIStudentProgress.belongsTo(Course, { foreignKey: 'courseId', as: 'course', onDelete: 'CASCADE' });
Topic.hasMany(AIStudentProgress, { foreignKey: 'topicId', as: 'aiProgress', onDelete: 'CASCADE' });
AIStudentProgress.belongsTo(Topic, { foreignKey: 'topicId', as: 'topic', onDelete: 'CASCADE' });
AILecture.hasMany(AIStudentProgress, { foreignKey: 'lectureId', as: 'progressRecords', onDelete: 'CASCADE' });
AIStudentProgress.belongsTo(AILecture, { foreignKey: 'lectureId', as: 'lecture', onDelete: 'CASCADE' });
AITutorSession.hasMany(AIStudentProgress, { foreignKey: 'lastSessionId', as: 'progressRecords', onDelete: 'SET NULL' });
AIStudentProgress.belongsTo(AITutorSession, { foreignKey: 'lastSessionId', as: 'lastSession', onDelete: 'SET NULL' });
AIStudentProgress.belongsTo(Topic, { foreignKey: 'unlockedNextTopicId', as: 'unlockedNextTopic', onDelete: 'SET NULL' });

AILecture.hasMany(AIAudioAsset, { foreignKey: 'lectureId', as: 'audioAssets', onDelete: 'CASCADE' });
AIAudioAsset.belongsTo(AILecture, { foreignKey: 'lectureId', as: 'lecture', onDelete: 'CASCADE' });
AITutorSession.hasMany(AIAudioAsset, { foreignKey: 'sessionId', as: 'audioAssets', onDelete: 'CASCADE' });
AIAudioAsset.belongsTo(AITutorSession, { foreignKey: 'sessionId', as: 'session', onDelete: 'CASCADE' });

module.exports = {
  sequelize,
  User,
  Category,
  Course,
  Topic,
  Material,
  Feedback,
  Enrollment,
  Progress,
  Quiz,
  QuizResult,
  Certificate,
  CertificateTemplate,
  TemplateCourse,
  Notification,
  AIChatSession,
  AIChatMessage,
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
};

