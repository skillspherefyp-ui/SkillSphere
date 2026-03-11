const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AIFlashcard = sequelize.define('AIFlashcard', {
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
  cardIndex: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  frontText: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  backText: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  }
}, {
  tableName: 'ai_flashcards'
});

module.exports = AIFlashcard;
