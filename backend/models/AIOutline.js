const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AIOutline = sequelize.define('AIOutline', {
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
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  outlineText: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  sourceMaterials: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
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
  tableName: 'ai_course_outlines'
});

module.exports = AIOutline;
