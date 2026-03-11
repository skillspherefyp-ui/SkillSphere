const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AIVisualSuggestion = sequelize.define('AIVisualSuggestion', {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  suggestion: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  visualMode: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'diagram'
  },
  visualQuery: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  caption: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  structuredData: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
  }
}, {
  tableName: 'ai_visual_suggestions'
});

module.exports = AIVisualSuggestion;
