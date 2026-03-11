const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AIQuizQuestion = sequelize.define('AIQuizQuestion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  quizId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'ai_quizzes',
      key: 'id'
    }
  },
  questionIndex: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  prompt: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  options: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  correctAnswer: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'ai_quiz_questions'
});

module.exports = AIQuizQuestion;
