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
  AIChatMessage
};



