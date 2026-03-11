const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AILectureSection = sequelize.define('AILectureSection', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lectureId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'ai_lectures',
      key: 'id'
    }
  },
  sectionIndex: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  chunkIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  chunkText: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  examples: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  visualSuggestion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  whiteboardSuggestion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  slideBullets: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  }
}, {
  tableName: 'ai_lecture_sections',
  indexes: [
    {
      fields: ['lectureId', 'sectionIndex', 'chunkIndex']
    }
  ]
});

module.exports = AILectureSection;
