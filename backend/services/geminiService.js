/**
 * Groq AI Service
 * Using Groq's OpenAI-compatible API
 *
 * Get your API key: https://console.groq.com/keys
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// System prompt for SkillSphere general-purpose AI assistant
const SYSTEM_PROMPT = `You are SkillSphere AI, a friendly, intelligent, and helpful general-purpose assistant for students. You can help with ANY topic or question - not just courses!

Your capabilities include:
1. Answering general knowledge questions on any topic
2. Helping with coding, programming, and technical problems
3. Explaining concepts in science, math, history, or any subject
4. Assisting with writing, grammar, and language
5. Providing career advice and guidance
6. Helping with daily tasks, planning, and productivity
7. Creative writing, brainstorming, and idea generation
8. Research assistance and information lookup
9. Problem-solving and logical reasoning
10. Learning tips and study strategies

Guidelines:
- Be helpful, accurate, and informative
- Keep responses clear and well-structured
- Use bullet points, code blocks, or examples when helpful
- Be friendly and conversational
- If you're unsure about something, say so honestly
- Provide detailed answers when needed, but be concise for simple questions
- You can discuss any appropriate topic - education, technology, science, arts, entertainment, etc.

Remember: You're a versatile AI assistant here to help students with ANYTHING they need!`;

/**
 * Generate AI response using Groq
 * @param {string} userMessage - The user's message
 * @param {Array} chatHistory - Previous messages in the conversation
 * @returns {Promise<string>} - AI response text
 */
async function generateResponse(userMessage, chatHistory = []) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error('GROQ_API_KEY is not configured');
    return getFallbackResponse();
  }

  try {
    // Build messages array for Groq (OpenAI-compatible format)
    const messages = [];

    // Add system message
    messages.push({
      role: 'system',
      content: SYSTEM_PROMPT
    });

    // Add chat history (last 10 messages for context)
    const recentHistory = chatHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 0.95
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq API error:', data);

      // Handle rate limiting
      if (response.status === 429) {
        return "I'm receiving too many requests right now. Please wait a moment and try again.";
      }

      return getFallbackResponse();
    }

    // Extract text from response (OpenAI format)
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    return getFallbackResponse();

  } catch (error) {
    console.error('Groq API error:', error.message);
    return getFallbackResponse();
  }
}

/**
 * Fallback responses when API is unavailable
 */
function getFallbackResponse() {
  const fallbacks = [
    "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
    "I'm temporarily unavailable due to high demand. Please try again shortly!",
    "Sorry, I couldn't process your request at the moment. Please try again in a few seconds.",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/**
 * Check if Groq API is configured and working
 */
async function checkHealth() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return { status: 'error', message: 'GROQ_API_KEY not configured' };
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10
      })
    });

    if (response.ok) {
      return { status: 'ok', message: 'Groq API is working' };
    } else {
      const data = await response.json();
      return { status: 'error', message: data.error?.message || 'API error' };
    }
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

module.exports = {
  generateResponse,
  checkHealth
};
