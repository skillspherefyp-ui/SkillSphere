const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AIStudentProgress = sequelize.define('AIStudentProgress', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
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
    references: {
      model: 'topics',
      key: 'id'
    }
  },
  lectureId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'ai_lectures',
      key: 'id'
    }
  },
  currentSectionIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  currentChunkIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  lectureCompleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  quizPassed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  quizScore: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  quizAttempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  unlockedNextTopicId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'topics',
      key: 'id'
    }
  },
  lastSessionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'ai_tutor_sessions',
      key: 'id'
    }
  }
}, {
  tableName: 'ai_student_progress',
  indexes: [
    {
      unique: true,
      fields: ['userId', 'courseId', 'topicId']
    }
  ]
});

module.exports = AIStudentProgress;
