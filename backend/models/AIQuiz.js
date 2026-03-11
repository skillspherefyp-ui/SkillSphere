const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AIQuiz = sequelize.define('AIQuiz', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lectureId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'ai_lectures',
      key: 'id'
    }
  },
  passingThreshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 70
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'ai_quizzes'
});

module.exports = AIQuiz;
