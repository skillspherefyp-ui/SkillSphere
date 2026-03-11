const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AITutorMessage = sequelize.define('AITutorMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'ai_tutor_sessions',
      key: 'id'
    }
  },
  sender: {
    type: DataTypes.ENUM('user', 'ai', 'system'),
    allowNull: false
  },
  messageType: {
    type: DataTypes.ENUM('lecture', 'question', 'answer', 'system'),
    allowNull: false,
    defaultValue: 'system'
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  contextSnapshot: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
  }
}, {
  tableName: 'ai_tutor_messages'
});

module.exports = AITutorMessage;
