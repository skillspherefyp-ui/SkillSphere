const { AIChatSession, AIChatMessage, User } = require('../models');
const geminiService = require('../services/geminiService');

// Create a new chat session
exports.createSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;

    const session = await AIChatSession.create({
      userId,
      title: title || 'New Chat',
      lastMessageAt: new Date()
    });

    // Create the initial AI welcome message
    const welcomeMessage = await AIChatMessage.create({
      sessionId: session.id,
      content: "Hello! I'm SkillSphere AI, your personal assistant. I can help you with anything:\n\n• Answer any question on any topic\n• Help with coding and programming\n• Explain concepts in any subject\n• Assist with writing and research\n• Provide advice and guidance\n• Creative ideas and brainstorming\n\nAsk me anything - I'm here to help!",
      sender: 'ai',
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      session: {
        ...session.toJSON(),
        messages: [welcomeMessage]
      }
    });
  } catch (error) {
    console.error('Create chat session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all chat sessions for user
exports.getSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await AIChatSession.findAll({
      where: { userId },
      order: [['lastMessageAt', 'DESC']],
      include: [{
        model: AIChatMessage,
        as: 'messages',
        limit: 1,
        order: [['timestamp', 'DESC']]
      }]
    });

    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Get chat sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a specific session with all messages
exports.getSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await AIChatSession.findOne({
      where: { id, userId },
      include: [{
        model: AIChatMessage,
        as: 'messages',
        order: [['timestamp', 'ASC']]
      }]
    });

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('Get chat session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Send a message to a session
exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify session belongs to user
    const session = await AIChatSession.findOne({
      where: { id, userId },
      include: [{
        model: AIChatMessage,
        as: 'messages',
        order: [['timestamp', 'ASC']],
        limit: 20 // Get last 20 messages for context
      }]
    });

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Create user message
    const userMessage = await AIChatMessage.create({
      sessionId: id,
      content: content.trim(),
      sender: 'user',
      timestamp: new Date()
    });

    // Get chat history for context (exclude the welcome message)
    const chatHistory = (session.messages || [])
      .filter(msg => msg.sender === 'user' || !msg.content.includes("I'm SkillSphere AI"))
      .map(msg => ({
        sender: msg.sender,
        content: msg.content
      }));

    // Generate AI response using Gemini
    const aiResponseContent = await geminiService.generateResponse(content.trim(), chatHistory);

    const aiMessage = await AIChatMessage.create({
      sessionId: id,
      content: aiResponseContent,
      sender: 'ai',
      timestamp: new Date()
    });

    // Update session title if it's the first user message and still has default title
    if (session.title === 'New Chat') {
      // Create a title from the first message (truncate to 50 chars)
      const newTitle = content.trim().substring(0, 50) + (content.length > 50 ? '...' : '');
      await session.update({ title: newTitle });
    }

    // Update last message timestamp
    await session.update({ lastMessageAt: new Date() });

    res.json({
      success: true,
      userMessage,
      aiMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update session title
exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title } = req.body;

    const session = await AIChatSession.findOne({
      where: { id, userId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    if (title) {
      session.title = title;
    }

    await session.save();

    res.json({ success: true, session });
  } catch (error) {
    console.error('Update chat session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a chat session
exports.deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await AIChatSession.findOne({
      where: { id, userId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Delete all messages first (due to foreign key constraint)
    await AIChatMessage.destroy({
      where: { sessionId: id }
    });

    // Delete the session
    await session.destroy();

    res.json({ success: true, message: 'Chat session deleted successfully' });
  } catch (error) {
    console.error('Delete chat session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

