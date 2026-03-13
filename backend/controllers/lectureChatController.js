const { LectureChatMessage, Course, Topic } = require('../models');
const openaiService = require('../services/openaiService');

exports.getHistory = async (req, res) => {
  try {
    const { courseId, topicId } = req.params;
    const userId = req.user.id;

    const messages = await LectureChatMessage.findAll({
      where: { userId, courseId, topicId },
      order: [['createdAt', 'ASC']],
      limit: 100,
    });

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Lecture chat getHistory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { courseId, topicId } = req.params;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const userMessage = await LectureChatMessage.create({
      userId,
      courseId,
      topicId,
      content: content.trim(),
      sender: 'user',
    });

    const [course, topic] = await Promise.all([
      Course.findByPk(courseId, { attributes: ['name'] }),
      Topic.findByPk(topicId, { attributes: ['title'] }),
    ]);

    const lectureTitle = `${course?.name || 'Course'} - ${topic?.title || 'Topic'}`;
    const lectureSummary = `Help the student understand the topic "${topic?.title || 'this topic'}" from the course "${course?.name || 'this course'}". Stay educational, clear, and topic-aware.`;
    const currentSection = topic?.title || 'Current topic';
    const currentChunk = {
      title: topic?.title || 'Current topic',
      spoken_explanation: lectureSummary,
      examples: [],
      key_terms: []
    };

    const historyRows = await LectureChatMessage.findAll({
      where: { userId, courseId, topicId },
      order: [['createdAt', 'DESC']],
      limit: 21,
    });

    const chatHistory = historyRows
      .reverse()
      .filter(m => m.id !== userMessage.id)
      .map(m => ({ sender: m.sender, content: m.content }));

    let aiContent;
    try {
      const response = await openaiService.answerLectureQuestion({
        lectureTitle,
        lectureSummary,
        currentChunk,
        currentSection,
        recentMessages: chatHistory,
        question: content.trim()
      });
      aiContent = response.answer;
    } catch (error) {
      console.error('OpenAI lecture answer error:', error);
      aiContent = "I'm having trouble reaching the lecture AI right now. Please try again in a moment.";
    }

    const aiMessage = await LectureChatMessage.create({
      userId,
      courseId,
      topicId,
      content: aiContent,
      sender: 'ai',
    });

    res.status(201).json({ success: true, userMessage, aiMessage });
  } catch (error) {
    console.error('Lecture chat sendMessage error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.clearHistory = async (req, res) => {
  try {
    const { courseId, topicId } = req.params;
    const userId = req.user.id;

    await LectureChatMessage.destroy({ where: { userId, courseId, topicId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Lecture chat clearHistory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
