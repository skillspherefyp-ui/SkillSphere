const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LectureChatMessage = sequelize.define('LectureChatMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'courses', key: 'id' },
  },
  topicId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'topics', key: 'id' },
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  sender: {
    type: DataTypes.ENUM('user', 'ai'),
    allowNull: false,
  },
}, {
  tableName: 'lecture_chat_messages',
});

module.exports = LectureChatMessage;
