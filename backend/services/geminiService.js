/**
 * Google Gemini AI Service
 * Free tier: 15 requests/minute, 1 million tokens/month
 *
 * Get your API key: https://aistudio.google.com/apikey
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// System prompt for SkillSphere learning assistant
const SYSTEM_PROMPT = `You are SkillSphere AI, a friendly and helpful learning assistant for an online education platform. Your role is to:

1. Help students understand course concepts and answer their questions
2. Provide clear, concise explanations with examples when helpful
3. Offer study tips and learning strategies
4. Encourage and motivate students in their learning journey
5. Break down complex topics into simpler parts

Guidelines:
- Keep responses concise but informative (2-4 paragraphs max)
- Use bullet points or numbered lists for clarity when appropriate
- Be encouraging and supportive
- If you don't know something, admit it and suggest where to find the answer
- Don't provide answers that could be used for cheating on exams
- Focus on helping students understand concepts, not just giving answers

Remember: You're here to help students learn and grow!`;

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
      parts: [{ text: 'Understood! I\'m SkillSphere AI, ready to help students learn and grow. How can I assist you today?' }]
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
    "I apologize, but I'm having trouble connecting right now. Please try again in a moment. In the meantime, you can review your course materials or check the FAQ section.",
    "I'm temporarily unavailable. This might be due to high demand. Please try again shortly, or explore your course content while you wait.",
    "Sorry, I couldn't process your request at the moment. Please try again in a few seconds. Remember, you can always reach out to your instructor for help too!",
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
