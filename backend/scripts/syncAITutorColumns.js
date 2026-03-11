require('dotenv').config();
const {
  sequelize,
  AIOutline,
  AILecture,
  AILectureSection,
  AISlideOutline,
  AIVisualSuggestion,
  AIFlashcard,
  AIQuiz,
  AIQuizQuestion,
  AITutorSession,
  AITutorMessage,
  AIStudentProgress,
  AIAudioAsset,
} = require('../models');

const AI_TUTOR_MODELS = [
  AIOutline,
  AILecture,
  AILectureSection,
  AISlideOutline,
  AIVisualSuggestion,
  AIFlashcard,
  AIQuiz,
  AIQuizQuestion,
  AITutorSession,
  AITutorMessage,
  AIStudentProgress,
  AIAudioAsset,
];

function buildColumnDefinition(attribute) {
  const definition = {
    type: attribute.type,
    allowNull: attribute.allowNull,
  };

  if (attribute.defaultValue !== undefined) {
    definition.defaultValue = attribute.defaultValue;
  }

  if (attribute.unique) {
    definition.unique = attribute.unique;
  }

  if (attribute.references) {
    definition.references = attribute.references;
    if (attribute.onDelete) definition.onDelete = attribute.onDelete;
    if (attribute.onUpdate) definition.onUpdate = attribute.onUpdate;
  }

  return definition;
}

async function syncModelColumns(queryInterface, model) {
  const tableName = model.getTableName();
  const modelName = model.name;
  let existingColumns;

  try {
    existingColumns = await queryInterface.describeTable(tableName);
  } catch (error) {
    if (error.original?.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/i.test(error.message || '')) {
      console.log(`[AI Tutor Schema] Table ${tableName} does not exist yet. Skipping additive column sync and letting sequelize.sync create it.`);
      return [];
    }
    throw error;
  }

  const addedColumns = [];

  for (const [attributeName, attribute] of Object.entries(model.rawAttributes)) {
    if (attributeName === 'createdAt' || attributeName === 'updatedAt') {
      continue;
    }

    const columnName = attribute.field || attributeName;
    if (existingColumns[columnName]) {
      continue;
    }

    console.log(`[AI Tutor Schema] Adding ${tableName}.${columnName} for model ${modelName}...`);
    await queryInterface.addColumn(tableName, columnName, buildColumnDefinition(attribute));
    addedColumns.push(columnName);
  }

  if (addedColumns.length === 0) {
    console.log(`[AI Tutor Schema] ${tableName} already up to date.`);
  } else {
    console.log(`[AI Tutor Schema] Added columns for ${tableName}: ${addedColumns.join(', ')}`);
  }

  return addedColumns;
}

async function syncAITutorColumns() {
  const queryInterface = sequelize.getQueryInterface();
  const summary = {};

  for (const model of AI_TUTOR_MODELS) {
    summary[model.getTableName()] = await syncModelColumns(queryInterface, model);
  }

  return summary;
}

if (require.main === module) {
  syncAITutorColumns()
    .then(async (summary) => {
      console.log('[AI Tutor Schema] Column sync summary:', JSON.stringify(summary, null, 2));
      await sequelize.close();
    })
    .catch(async (error) => {
      console.error('[AI Tutor Schema] Failed to sync AI Tutor columns:', error);
      await sequelize.close();
      process.exitCode = 1;
    });
}

module.exports = syncAITutorColumns;
