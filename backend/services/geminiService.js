/**
 * Google Gemini AI Service
 * Free tier: 15 requests/minute, 1 million tokens/month
 *
 * Get your API key: https://aistudio.google.com/apikey
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

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
 * Generate AI response using Google Gemini
 * @param {string} userMessage - The user's message
 * @param {Array} chatHistory - Previous messages in the conversation
 * @returns {Promise<string>} - AI response text
 */
async function generateResponse(userMessage, chatHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured');
    return getFallbackResponse();
  }

  try {
    // Build conversation history for context
    const contents = [];

    // Add system instruction as first user message (Gemini doesn't have system role)
    contents.push({
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Understood! I\'m SkillSphere AI, your versatile assistant. I can help you with anything - questions, coding, research, creative work, advice, and much more. What would you like to know?' }]
    });

    // Add chat history (last 10 messages for context)
    const recentHistory = chatHistory.slice(-10);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);

      // Handle rate limiting
      if (response.status === 429) {
        return "I'm receiving too many requests right now. Please wait a moment and try again.";
      }

      return getFallbackResponse();
    }

    // Extract text from response
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }

    // Check if blocked by safety filters
    if (data.candidates?.[0]?.finishReason === 'SAFETY') {
      return "I can't respond to that particular request. Please try rephrasing your question or ask something else.";
    }

    return getFallbackResponse();

  } catch (error) {
    console.error('Gemini API error:', error.message);
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
 * Check if Gemini API is configured and working
 */
async function checkHealth() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return { status: 'error', message: 'GEMINI_API_KEY not configured' };
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
        generationConfig: { maxOutputTokens: 10 }
      })
    });

    if (response.ok) {
      return { status: 'ok', message: 'Gemini API is working' };
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
