const { AIChatSession, AIChatMessage, User } = require('../models');

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
      content: "Hello! I'm your AI learning assistant. I can help you with:\n\n• Understanding course concepts\n• Answering questions about your lessons\n• Providing study tips and guidance\n• Explaining difficult topics\n\nHow can I help you today?",
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
      where: { id, userId }
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

    // Generate AI response (simulated for now)
    const aiResponseContent = generateAIResponse(content);

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

// Helper function to generate AI response (simulated)
function generateAIResponse(userMessage) {
  const responses = [
    "Thank you for your question! That's a great topic to explore. Based on your enrolled courses, I can help you understand this concept better. Would you like me to provide more specific examples?",
    "I understand what you're asking about. This is an important concept in your learning journey. Let me break it down for you in simpler terms.",
    "Great question! This relates to several key concepts we've covered. Here's how I would explain it: the main idea is to focus on understanding the fundamentals first, then build upon them.",
    "I'd be happy to help you with that! This is a common area where students need clarification. The key thing to remember is to practice regularly and don't hesitate to ask questions.",
    "That's an excellent question! Understanding this concept is crucial for your progress. I recommend reviewing the related materials and practicing with examples."
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}
