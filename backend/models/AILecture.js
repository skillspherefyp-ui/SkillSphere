const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AILecture = sequelize.define('AILecture', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'courses',
      key: 'id'
    }
  },
  topicId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'topics',
      key: 'id'
    }
  },
  outlineId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'ai_course_outlines',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  summary: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  estimatedDurationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10
  },
  teachingScript: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  preparationNotes: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
  },
  passingThreshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 70
  },
  nextTopicId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'topics',
      key: 'id'
    }
  },
  generationModel: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'processing', 'ready', 'failed'),
    allowNull: false,
    defaultValue: 'draft'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'ai_lectures'
});

module.exports = AILecture;
