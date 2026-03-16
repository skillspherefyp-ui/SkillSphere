const fs = require('fs');
const path = require('path');
const {
  sequelize,
  AIQuizQuestion,
  AIQuiz,
  AIFlashcard,
  AIVisualSuggestion,
  AISlideOutline,
  AILectureSection,
  AITutorMessage,
  AITutorSession,
  AIStudentProgress,
  AIAudioAsset,
  AILecture,
  AIOutline,
} = require('../models');

const AUDIO_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'ai-audio');

async function clearGeneratedLectures() {
  console.log('[AI Lecture Reset] Clearing generated lecture data...');

  await sequelize.transaction(async (transaction) => {
    await AIQuizQuestion.destroy({ where: {}, force: true, transaction });
    await AIQuiz.destroy({ where: {}, force: true, transaction });
    await AIFlashcard.destroy({ where: {}, force: true, transaction });
    await AIVisualSuggestion.destroy({ where: {}, force: true, transaction });
    await AISlideOutline.destroy({ where: {}, force: true, transaction });
    await AILectureSection.destroy({ where: {}, force: true, transaction });
    await AITutorMessage.destroy({ where: {}, force: true, transaction });
    await AITutorSession.destroy({ where: {}, force: true, transaction });
    await AIStudentProgress.destroy({ where: {}, force: true, transaction });
    await AIAudioAsset.destroy({ where: {}, force: true, transaction });
    await AILecture.destroy({ where: {}, force: true, transaction });

    await AIOutline.update(
      {
        status: 'draft',
        errorMessage: null,
      },
      {
        where: {},
        transaction,
      }
    );
  });

  if (fs.existsSync(AUDIO_UPLOAD_DIR)) {
    for (const entry of fs.readdirSync(AUDIO_UPLOAD_DIR)) {
      const filePath = path.join(AUDIO_UPLOAD_DIR, entry);
      try {
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      } catch (_) {}
    }
  }

  console.log('[AI Lecture Reset] Generated lecture data cleared successfully.');
}

clearGeneratedLectures()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('[AI Lecture Reset] Failed:', error);
    await sequelize.close().catch(() => null);
    process.exit(1);
  });
