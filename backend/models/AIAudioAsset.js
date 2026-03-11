const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AIAudioAsset = sequelize.define('AIAudioAsset', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lectureId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'ai_lectures',
      key: 'id'
    }
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'ai_tutor_sessions',
      key: 'id'
    }
  },
  cacheKey: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  assetType: {
    type: DataTypes.ENUM('lecture_chunk', 'qa_answer'),
    allowNull: false
  },
  voice: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'alloy'
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'audio/mpeg'
  },
  storagePath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  urlPath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  textPreview: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'ai_audio_assets'
});

module.exports = AIAudioAsset;
