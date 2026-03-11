require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize, AILecture, AILectureSection, AISlideOutline, AIVisualSuggestion, AIFlashcard, AIQuiz, AIQuizQuestion, Topic } = require('../models');

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5001/api';
const ts = Date.now();
const adminCreds = { name: 'AI Tutor Admin', email: `aitutor-admin-${ts}@example.com`, password: 'TestPass123!', role: 'admin' };
const studentCreds = { name: 'AI Tutor Student', email: `aitutor-student-${ts}@example.com`, password: 'TestPass123!', role: 'student' };

async function request(pathname, options = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, options);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${pathname} failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

function authHeader(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

(async () => {
  const report = {};
  try {
    const adminRegister = await request('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adminCreds) });
    const studentRegister = await request('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(studentCreds) });
    report.adminUserId = adminRegister.user.id;
    report.studentUserId = studentRegister.user.id;

    const categories = await request('/categories');
    let categoryId = categories.categories?.[0]?.id;
    if (!categoryId) {
      const category = await request('/categories', {
        method: 'POST',
        headers: authHeader(adminRegister.token),
        body: JSON.stringify({ name: `AI Tutor Category ${ts}` })
      });
      categoryId = category.category.id;
    }
    report.categoryId = categoryId;

    const course = await request('/courses', {
      method: 'POST',
      headers: authHeader(adminRegister.token),
      body: JSON.stringify({
        name: `AI Tutor Course ${ts}`,
        description: 'Course for AI tutor integration verification.',
        level: 'Beginner',
        language: 'English',
        categoryId,
        duration: '2 hours'
      })
    });
    report.courseId = course.course.id;

    const topic1 = await request('/topics', {
      method: 'POST',
      headers: authHeader(adminRegister.token),
      body: JSON.stringify({ courseId: course.course.id, title: 'Variables and data types', materials: [] })
    });
    const topic2 = await request('/topics', {
      method: 'POST',
      headers: authHeader(adminRegister.token),
      body: JSON.stringify({ courseId: course.course.id, title: 'Control flow basics', materials: [] })
    });
    report.topicIds = [topic1.topic.id, topic2.topic.id];

    const outlineSave = await request(`/ai-tutor/topics/${topic1.topic.id}/outline`, {
      method: 'PUT',
      headers: authHeader(adminRegister.token),
      body: JSON.stringify({ outlineText: 'Teach variables, primitive data types, type safety, and simple examples that prepare learners for conditionals.' })
    });
    report.outlineSaveStatus = outlineSave.result.status;

    const generation = await request(`/ai-tutor/courses/${course.course.id}/generate`, {
      method: 'POST',
      headers: authHeader(adminRegister.token),
      body: JSON.stringify({})
    });
    report.generationSummary = generation.summary;

    const lecture1 = await AILecture.findOne({ where: { topicId: topic1.topic.id } });
    const lecture2 = await AILecture.findOne({ where: { topicId: topic2.topic.id } });
    if (!lecture1 || !lecture2) {
      throw new Error('Lecture rows were not persisted for both topics');
    }

    const quizRow = await AIQuiz.findOne({ where: { lectureId: lecture1.id }, include: [{ model: AIQuizQuestion, as: 'questions' }] });
    report.persistence = {
      lectureCount: await AILecture.count({ where: { courseId: course.course.id } }),
      sectionCount: await AILectureSection.count({ where: { lectureId: lecture1.id } }),
      slideCount: await AISlideOutline.count({ where: { lectureId: lecture1.id } }),
      visualCount: await AIVisualSuggestion.count({ where: { lectureId: lecture1.id } }),
      flashcardCount: await AIFlashcard.count({ where: { lectureId: lecture1.id } }),
      quizCount: await AIQuiz.count({ where: { lectureId: lecture1.id } }),
      quizQuestionCount: quizRow.questions.length
    };

    const enroll = await request('/enrollments', {
      method: 'POST',
      headers: authHeader(studentRegister.token),
      body: JSON.stringify({ courseId: course.course.id })
    });
    report.enrollmentId = enroll.enrollment.id;

    const startSession = await request(`/ai-tutor/topics/${topic1.topic.id}/start`, {
      method: 'POST',
      headers: authHeader(studentRegister.token),
      body: JSON.stringify({ voiceModeEnabled: false })
    });
    report.startChunk = { sectionIndex: startSession.chunk.sectionIndex, chunkIndex: startSession.chunk.chunkIndex };

    const nextChunk = await request(`/ai-tutor/sessions/${startSession.session.id}/next`, {
      method: 'POST',
      headers: authHeader(studentRegister.token),
      body: JSON.stringify({})
    });
    report.nextChunk = { sectionIndex: nextChunk.chunk.sectionIndex, chunkIndex: nextChunk.chunk.chunkIndex };

    await request(`/ai-tutor/sessions/${startSession.session.id}/pause`, {
      method: 'POST',
      headers: authHeader(studentRegister.token),
      body: JSON.stringify({})
    });
    const resumed = await request(`/ai-tutor/sessions/${startSession.session.id}/resume`, {
      method: 'POST',
      headers: authHeader(studentRegister.token),
      body: JSON.stringify({})
    });
    report.resumeChunk = { sectionIndex: resumed.chunk.sectionIndex, chunkIndex: resumed.chunk.chunkIndex };

    const qa = await request(`/ai-tutor/sessions/${startSession.session.id}/questions`, {
      method: 'POST',
      headers: authHeader(studentRegister.token),
      body: JSON.stringify({ question: 'How should I explain the difference between a variable name and the value stored inside it?' })
    });
    report.questionAnswered = qa.aiMessage.content.length > 0;

    const flashcards = await request(`/ai-tutor/lectures/${lecture1.id}/flashcards`, {
      method: 'GET',
      headers: authHeader(studentRegister.token)
    });
    report.flashcardsFetched = flashcards.flashcards.length;
    report.flashcardExportPreviewBytes = Buffer.byteLength(JSON.stringify(flashcards.flashcards.map((card) => ({ front: card.frontText, back: card.backText })), null, 2));

    const speech = await request('/ai-tutor/audio/speak', {
      method: 'POST',
      headers: authHeader(studentRegister.token),
      body: JSON.stringify({ lectureId: lecture1.id, sessionId: startSession.session.id, assetType: 'qa_answer', text: 'Variables store values for later use.' })
    });
    report.ttsAssetUrl = speech.asset.urlPath;

    const audioBuffer = fs.readFileSync(speech.asset.storagePath);
    const form = new FormData();
    form.append('audio', new Blob([audioBuffer], { type: 'audio/mpeg' }), path.basename(speech.asset.storagePath));
    const transcribeRes = await fetch(`${baseUrl}/ai-tutor/audio/transcribe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentRegister.token}` },
      body: form
    });
    const transcribeJson = await transcribeRes.json();
    if (!transcribeRes.ok) {
      throw new Error(`audio/transcribe failed: ${JSON.stringify(transcribeJson)}`);
    }
    report.transcript = transcribeJson.transcript.text;

    const quiz = await request(`/ai-tutor/lectures/${lecture1.id}/quiz`, {
      method: 'GET',
      headers: authHeader(studentRegister.token)
    });
    report.quizQuestions = quiz.quiz.questions.length;

    const failAnswers = {};
    const passAnswers = {};
    for (const q of quizRow.questions) {
      passAnswers[q.id] = q.correctAnswer;
      failAnswers[q.id] = (q.correctAnswer + 1) % 4;
    }

    const failSubmit = await request(`/ai-tutor/lectures/${lecture1.id}/quiz/submit`, {
      method: 'POST',
      headers: authHeader(studentRegister.token),
      body: JSON.stringify({ answers: failAnswers })
    });
    const passSubmit = await request(`/ai-tutor/lectures/${lecture1.id}/quiz/submit`, {
      method: 'POST',
      headers: authHeader(studentRegister.token),
      body: JSON.stringify({ answers: passAnswers })
    });
    report.failResult = failSubmit.result;
    report.passResult = passSubmit.result;

    const unlockedTopic = await Topic.findByPk(topic2.topic.id);
    report.topic2Status = unlockedTopic.status;
    report.topic2Completed = unlockedTopic.completed;

    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error('FLOW_TEST_ERROR');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
