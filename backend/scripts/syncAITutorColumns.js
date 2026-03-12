require('dotenv').config();
const { sequelize } = require('../config/database');

const AI_TUTOR_SCHEMA = {
  ai_course_outlines: [
    { name: 'courseId', sql: 'ADD COLUMN `courseId` INT NOT NULL' },
    { name: 'topicId', sql: 'ADD COLUMN `topicId` INT NOT NULL' },
    { name: 'adminId', sql: 'ADD COLUMN `adminId` INT NULL' },
    { name: 'outlineText', sql: 'ADD COLUMN `outlineText` LONGTEXT NOT NULL' },
    { name: 'sourceMaterials', sql: "ADD COLUMN `sourceMaterials` JSON NOT NULL DEFAULT ('[]')" },
    { name: 'status', sql: "ADD COLUMN `status` ENUM('draft','processing','ready','failed') NOT NULL DEFAULT 'draft'" },
    { name: 'errorMessage', sql: 'ADD COLUMN `errorMessage` TEXT NULL' },
  ],
  ai_lectures: [
    { name: 'courseId', sql: 'ADD COLUMN `courseId` INT NOT NULL' },
    { name: 'topicId', sql: 'ADD COLUMN `topicId` INT NOT NULL' },
    { name: 'outlineId', sql: 'ADD COLUMN `outlineId` INT NULL' },
    { name: 'title', sql: 'ADD COLUMN `title` VARCHAR(255) NOT NULL' },
    { name: 'summary', sql: 'ADD COLUMN `summary` LONGTEXT NOT NULL' },
    { name: 'estimatedDurationMinutes', sql: 'ADD COLUMN `estimatedDurationMinutes` INT NOT NULL DEFAULT 10' },
    { name: 'teachingScript', sql: 'ADD COLUMN `teachingScript` LONGTEXT NOT NULL' },
    { name: 'preparationNotes', sql: "ADD COLUMN `preparationNotes` JSON NOT NULL DEFAULT ('{}')" },
    { name: 'passingThreshold', sql: 'ADD COLUMN `passingThreshold` INT NOT NULL DEFAULT 70' },
    { name: 'nextTopicId', sql: 'ADD COLUMN `nextTopicId` INT NULL' },
    { name: 'generationModel', sql: 'ADD COLUMN `generationModel` VARCHAR(255) NULL' },
    { name: 'status', sql: "ADD COLUMN `status` ENUM('draft','processing','ready','failed') NOT NULL DEFAULT 'draft'" },
    { name: 'errorMessage', sql: 'ADD COLUMN `errorMessage` TEXT NULL' },
  ],
  ai_lecture_sections: [
    { name: 'lectureId', sql: 'ADD COLUMN `lectureId` INT NOT NULL' },
    { name: 'sectionIndex', sql: 'ADD COLUMN `sectionIndex` INT NOT NULL' },
    { name: 'chunkIndex', sql: 'ADD COLUMN `chunkIndex` INT NOT NULL DEFAULT 0' },
    { name: 'title', sql: 'ADD COLUMN `title` VARCHAR(255) NOT NULL' },
    { name: 'summary', sql: 'ADD COLUMN `summary` TEXT NOT NULL' },
    { name: 'chunkText', sql: 'ADD COLUMN `chunkText` LONGTEXT NOT NULL' },
    { name: 'learningObjective', sql: 'ADD COLUMN `learningObjective` TEXT NULL' },
    { name: 'spokenExplanation', sql: 'ADD COLUMN `spokenExplanation` LONGTEXT NULL' },
    { name: 'whiteboardExplanation', sql: 'ADD COLUMN `whiteboardExplanation` LONGTEXT NULL' },
    { name: 'keyTerms', sql: "ADD COLUMN `keyTerms` JSON NOT NULL DEFAULT ('[]')" },
    { name: 'examples', sql: "ADD COLUMN `examples` JSON NOT NULL DEFAULT ('[]')" },
    { name: 'analogyIfHelpful', sql: 'ADD COLUMN `analogyIfHelpful` TEXT NULL' },
    { name: 'visualMode', sql: "ADD COLUMN `visualMode` VARCHAR(255) NOT NULL DEFAULT 'none'" },
    { name: 'visualQuery', sql: 'ADD COLUMN `visualQuery` TEXT NULL' },
    { name: 'visualCaption', sql: 'ADD COLUMN `visualCaption` TEXT NULL' },
    { name: 'visualSuggestion', sql: 'ADD COLUMN `visualSuggestion` TEXT NULL' },
    { name: 'whiteboardSuggestion', sql: 'ADD COLUMN `whiteboardSuggestion` TEXT NULL' },
    { name: 'slideBullets', sql: "ADD COLUMN `slideBullets` JSON NOT NULL DEFAULT ('[]')" },
    { name: 'teachingSequence', sql: "ADD COLUMN `teachingSequence` JSON NOT NULL DEFAULT ('[]')" },
    { name: 'difficultyLevel', sql: 'ADD COLUMN `difficultyLevel` VARCHAR(255) NULL' },
    { name: 'estimatedDurationSeconds', sql: 'ADD COLUMN `estimatedDurationSeconds` INT NOT NULL DEFAULT 45' },
    { name: 'checkpointQuestion', sql: 'ADD COLUMN `checkpointQuestion` TEXT NULL' },
    { name: 'visualData', sql: "ADD COLUMN `visualData` JSON NOT NULL DEFAULT ('{}')" },
  ],
  ai_slide_outlines: [
    { name: 'lectureId', sql: 'ADD COLUMN `lectureId` INT NOT NULL' },
    { name: 'slideIndex', sql: 'ADD COLUMN `slideIndex` INT NOT NULL' },
    { name: 'title', sql: 'ADD COLUMN `title` VARCHAR(255) NOT NULL' },
    { name: 'bullets', sql: "ADD COLUMN `bullets` JSON NOT NULL DEFAULT ('[]')" },
    { name: 'notes', sql: 'ADD COLUMN `notes` TEXT NULL' },
  ],
  ai_visual_suggestions: [
    { name: 'lectureId', sql: 'ADD COLUMN `lectureId` INT NOT NULL' },
    { name: 'sectionIndex', sql: 'ADD COLUMN `sectionIndex` INT NOT NULL' },
    { name: 'title', sql: 'ADD COLUMN `title` VARCHAR(255) NOT NULL' },
    { name: 'suggestion', sql: 'ADD COLUMN `suggestion` LONGTEXT NOT NULL' },
    { name: 'visualMode', sql: "ADD COLUMN `visualMode` VARCHAR(255) NOT NULL DEFAULT 'diagram'" },
    { name: 'visualQuery', sql: 'ADD COLUMN `visualQuery` TEXT NULL' },
    { name: 'caption', sql: 'ADD COLUMN `caption` TEXT NULL' },
    { name: 'structuredData', sql: "ADD COLUMN `structuredData` JSON NOT NULL DEFAULT ('{}')" },
  ],
  ai_flashcards: [
    { name: 'lectureId', sql: 'ADD COLUMN `lectureId` INT NOT NULL' },
    { name: 'cardIndex', sql: 'ADD COLUMN `cardIndex` INT NOT NULL' },
    { name: 'frontText', sql: 'ADD COLUMN `frontText` TEXT NOT NULL' },
    { name: 'backText', sql: 'ADD COLUMN `backText` LONGTEXT NOT NULL' },
  ],
  ai_quizzes: [
    { name: 'lectureId', sql: 'ADD COLUMN `lectureId` INT NOT NULL' },
    { name: 'passingThreshold', sql: 'ADD COLUMN `passingThreshold` INT NOT NULL DEFAULT 70' },
    { name: 'instructions', sql: 'ADD COLUMN `instructions` TEXT NULL' },
  ],
  ai_quiz_questions: [
    { name: 'quizId', sql: 'ADD COLUMN `quizId` INT NOT NULL' },
    { name: 'questionIndex', sql: 'ADD COLUMN `questionIndex` INT NOT NULL' },
    { name: 'prompt', sql: 'ADD COLUMN `prompt` TEXT NOT NULL' },
    { name: 'options', sql: "ADD COLUMN `options` JSON NOT NULL DEFAULT ('[]')" },
    { name: 'correctAnswer', sql: 'ADD COLUMN `correctAnswer` INT NOT NULL' },
    { name: 'explanation', sql: 'ADD COLUMN `explanation` TEXT NULL' },
  ],
  ai_tutor_sessions: [
    { name: 'userId', sql: 'ADD COLUMN `userId` INT NOT NULL' },
    { name: 'courseId', sql: 'ADD COLUMN `courseId` INT NOT NULL' },
    { name: 'topicId', sql: 'ADD COLUMN `topicId` INT NOT NULL' },
    { name: 'lectureId', sql: 'ADD COLUMN `lectureId` INT NOT NULL' },
    { name: 'status', sql: "ADD COLUMN `status` ENUM('in_progress','paused','lecture_completed','completed') NOT NULL DEFAULT 'in_progress'" },
    { name: 'currentSectionIndex', sql: 'ADD COLUMN `currentSectionIndex` INT NOT NULL DEFAULT 0' },
    { name: 'currentChunkIndex', sql: 'ADD COLUMN `currentChunkIndex` INT NOT NULL DEFAULT 0' },
    { name: 'voiceModeEnabled', sql: 'ADD COLUMN `voiceModeEnabled` TINYINT(1) NOT NULL DEFAULT 0' },
    { name: 'teachingState', sql: "ADD COLUMN `teachingState` JSON NOT NULL DEFAULT ('{}')" },
    { name: 'lastActivityAt', sql: 'ADD COLUMN `lastActivityAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP' },
  ],
  ai_tutor_messages: [
    { name: 'sessionId', sql: 'ADD COLUMN `sessionId` INT NOT NULL' },
    { name: 'sender', sql: "ADD COLUMN `sender` ENUM('user','ai','system') NOT NULL" },
    { name: 'messageType', sql: "ADD COLUMN `messageType` ENUM('lecture','question','answer','system') NOT NULL DEFAULT 'system'" },
    { name: 'content', sql: 'ADD COLUMN `content` LONGTEXT NOT NULL' },
    { name: 'contextSnapshot', sql: "ADD COLUMN `contextSnapshot` JSON NOT NULL DEFAULT ('{}')" },
  ],
  ai_student_progress: [
    { name: 'userId', sql: 'ADD COLUMN `userId` INT NOT NULL' },
    { name: 'courseId', sql: 'ADD COLUMN `courseId` INT NOT NULL' },
    { name: 'topicId', sql: 'ADD COLUMN `topicId` INT NOT NULL' },
    { name: 'lectureId', sql: 'ADD COLUMN `lectureId` INT NOT NULL' },
    { name: 'currentSectionIndex', sql: 'ADD COLUMN `currentSectionIndex` INT NOT NULL DEFAULT 0' },
    { name: 'currentChunkIndex', sql: 'ADD COLUMN `currentChunkIndex` INT NOT NULL DEFAULT 0' },
    { name: 'lectureCompleted', sql: 'ADD COLUMN `lectureCompleted` TINYINT(1) NOT NULL DEFAULT 0' },
    { name: 'quizPassed', sql: 'ADD COLUMN `quizPassed` TINYINT(1) NOT NULL DEFAULT 0' },
    { name: 'quizScore', sql: 'ADD COLUMN `quizScore` INT NULL' },
    { name: 'quizAttempts', sql: 'ADD COLUMN `quizAttempts` INT NOT NULL DEFAULT 0' },
    { name: 'unlockedNextTopicId', sql: 'ADD COLUMN `unlockedNextTopicId` INT NULL' },
    { name: 'lastSessionId', sql: 'ADD COLUMN `lastSessionId` INT NULL' },
  ],
  ai_audio_assets: [
    { name: 'lectureId', sql: 'ADD COLUMN `lectureId` INT NULL' },
    { name: 'sessionId', sql: 'ADD COLUMN `sessionId` INT NULL' },
    { name: 'cacheKey', sql: 'ADD COLUMN `cacheKey` VARCHAR(255) NOT NULL' },
    { name: 'assetType', sql: "ADD COLUMN `assetType` ENUM('lecture_chunk','qa_answer') NOT NULL" },
    { name: 'voice', sql: "ADD COLUMN `voice` VARCHAR(255) NOT NULL DEFAULT 'alloy'" },
    { name: 'mimeType', sql: "ADD COLUMN `mimeType` VARCHAR(255) NOT NULL DEFAULT 'audio/mpeg'" },
    { name: 'storagePath', sql: 'ADD COLUMN `storagePath` VARCHAR(255) NOT NULL' },
    { name: 'urlPath', sql: 'ADD COLUMN `urlPath` VARCHAR(255) NOT NULL' },
    { name: 'textPreview', sql: 'ADD COLUMN `textPreview` VARCHAR(255) NOT NULL' },
  ],
};

async function listExistingColumns(tableName) {
  try {
    const [rows] = await sequelize.query(`SHOW COLUMNS FROM \`${tableName}\``);
    return new Set(rows.map((row) => row.Field));
  } catch (error) {
    if (error.original?.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/i.test(error.message || '')) {
      console.log(`[AI Tutor Schema] Table ${tableName} does not exist yet. Skipping additive sync; sequelize.sync() can create it later.`);
      return null;
    }

    throw error;
  }
}

async function syncTableColumns(tableName, columns) {
  const existingColumns = await listExistingColumns(tableName);

  if (!existingColumns) {
    return [];
  }

  const missingColumns = columns.filter((column) => !existingColumns.has(column.name));

  if (missingColumns.length === 0) {
    console.log(`[AI Tutor Schema] ${tableName} already up to date.`);
    return [];
  }

  console.log(
    `[AI Tutor Schema] ${tableName} missing columns: ${missingColumns.map((column) => column.name).join(', ')}`
  );

  const addedColumns = [];
  for (const column of missingColumns) {
    const sql = `ALTER TABLE \`${tableName}\` ${column.sql}`;
    console.log(`[AI Tutor Schema] Executing: ${sql}`);
    await sequelize.query(sql);
    addedColumns.push(column.name);
  }

  console.log(`[AI Tutor Schema] Added columns for ${tableName}: ${addedColumns.join(', ')}`);
  return addedColumns;
}

async function syncAITutorColumns() {
  const summary = {};

  for (const [tableName, columns] of Object.entries(AI_TUTOR_SCHEMA)) {
    summary[tableName] = await syncTableColumns(tableName, columns);
  }

  console.log('[AI Tutor Schema] Column sync summary:', JSON.stringify(summary, null, 2));
  return summary;
}

if (require.main === module) {
  syncAITutorColumns()
    .then(async () => {
      await sequelize.close();
    })
    .catch(async (error) => {
      console.error('[AI Tutor Schema] Failed to sync AI Tutor columns:', error);
      await sequelize.close();
      process.exitCode = 1;
    });
}

module.exports = syncAITutorColumns;
module.exports.AI_TUTOR_SCHEMA = AI_TUTOR_SCHEMA;
