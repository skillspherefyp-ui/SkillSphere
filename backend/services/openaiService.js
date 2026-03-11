const fs = require('fs');
const crypto = require('crypto');
const OpenAI = require('openai');

let openaiClient = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  return openaiClient;
}

function getJsonFromCompletion(completion) {
  const content = completion?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty response');
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse OpenAI JSON response: ${error.message}`);
  }
}

async function generateLecturePackage({
  course,
  topic,
  materials,
  priorTopics,
  nextTopicTitle,
  outlineText
}) {
  const client = getClient();
  const model = process.env.OPENAI_MODEL_LECTURE;

  if (!model) {
    throw new Error('OPENAI_MODEL_LECTURE is not configured');
  }

  const schemaDescription = {
    title: 'string',
    summary: 'string',
    estimatedDurationMinutes: 'integer',
    teachingScript: 'string',
    slideOutline: [
      {
        title: 'string',
        bullets: ['string'],
        notes: 'string'
      }
    ],
    sections: [
      {
        title: 'string',
        summary: 'string',
        learningObjective: 'string',
        explanation: 'string',
        examples: ['string'],
        visualSuggestion: 'string',
        whiteboardSuggestion: 'string',
        slideBullets: ['string'],
        chunks: [
          {
            title: 'string',
            learning_objective: 'string',
            spoken_explanation: 'string',
            whiteboard_explanation: 'string',
            slide_bullets: ['string'],
            key_terms: ['string'],
            examples: ['string'],
            analogy_if_helpful: 'string',
            visual_mode: 'none | slide | whiteboard | diagram | flowchart | comparison_table | mixed',
            visual_query: 'string',
            visual_caption: 'string',
            teaching_sequence: ['speak', 'slide', 'diagram', 'whiteboard', 'visual'],
            difficulty_level: 'introductory | intermediate | advanced',
            estimated_duration_seconds: 'integer',
            checkpoint_question_if_any: 'string'
          }
        ]
      }
    ],
    flashcards: [
      {
        front: 'string',
        back: 'string'
      }
    ],
    quiz: {
      instructions: 'string',
      passingThreshold: 'integer',
      questions: [
        {
          prompt: 'string',
          options: ['string', 'string', 'string', 'string'],
          correctAnswer: 'integer 0-3',
          explanation: 'string'
        }
      ]
    }
  };

  const prompt = `
You are preparing a production-ready stored lecture package for a tutoring system.
Return valid JSON only. Do not wrap in markdown. Follow this schema exactly:
${JSON.stringify(schemaDescription, null, 2)}

Constraints:
- Produce a complete lecture package for one topic.
- Make explanations clear, accurate, teacher-like, and directly tied to the topic.
- Generate 3 to 6 sections.
- Generate 2 to 4 chunks per section for incremental delivery.
- Each chunk should be rich enough for a tutor to explain conceptually, not just read headings.
- Every chunk must contain a real spoken explanation in full sentences.
- Use visual_mode deliberately. Choose whiteboard, slide, diagram, flowchart, comparison_table, mixed, or none based on the concept.
- Use teaching_sequence to decide the order of teaching actions for that chunk.
- Include examples, key terms, and analogy_if_helpful when they make the explanation stronger.
- Include checkpoint_question_if_any whenever the learner should pause and self-check.
- Generate 4 to 8 flashcards.
- Generate 4 to 6 multiple choice questions with exactly 4 options each.
- Ensure correctAnswer is a zero-based option index.
- Use the next topic only as unlock context, not as lecture content.

Course:
${JSON.stringify({
    name: course.name,
    description: course.description,
    level: course.level,
    language: course.language,
    duration: course.duration
  }, null, 2)}

Topic:
${JSON.stringify({
    title: topic.title,
    outlineText,
    priorTopics,
    nextTopicTitle,
    materials
  }, null, 2)}
`;

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You generate strict JSON lecture packages for an educational tutoring platform.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]
  });

  return {
    model,
    package: getJsonFromCompletion(completion)
  };
}

async function repairLecturePackage(rawJsonText, validationErrors) {
  const client = getClient();
  const model = process.env.OPENAI_MODEL_LECTURE;

  const completion = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Repair invalid JSON lecture packages. Return JSON only.'
      },
      {
        role: 'user',
        content: `Fix this lecture package so it matches the required shape. Validation errors: ${validationErrors.join('; ')}. Raw JSON: ${rawJsonText}`
      }
    ]
  });

  return getJsonFromCompletion(completion);
}

async function answerLectureQuestion({
  lectureTitle,
  lectureSummary,
  currentChunk,
  currentSection,
  recentMessages,
  question
}) {
  const client = getClient();
  const model = process.env.OPENAI_MODEL_QA;

  if (!model) {
    throw new Error('OPENAI_MODEL_QA is not configured');
  }

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: 'You are an AI tutor answering in-context lecture questions. Stay focused on the active lecture, answer clearly, and connect the answer back to the lecture.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          lectureTitle,
          lectureSummary,
          currentSection,
          currentChunk,
          recentMessages,
          question
        })
      }
    ]
  });

  const answer = completion?.choices?.[0]?.message?.content?.trim();
  if (!answer) {
    throw new Error('OpenAI returned an empty lecture Q&A response');
  }

  return {
    model,
    answer
  };
}

async function answerGeneralChat({
  message,
  chatHistory = [],
  userContext = {}
}) {
  const client = getClient();
  const model = process.env.OPENAI_MODEL_QA;

  if (!model) {
    throw new Error('OPENAI_MODEL_QA is not configured');
  }

  const recentHistory = chatHistory.slice(-12).map((entry) => ({
    role: entry.sender === 'user' ? 'user' : 'assistant',
    content: entry.content
  }));

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content: 'You are SkillSphere AI, a calm, professional, general academic assistant for students. Answer clearly, be practical, admit uncertainty when needed, and use concise structure when it helps.'
      },
      {
        role: 'system',
        content: JSON.stringify({
          userContext: {
            id: userContext.id,
            name: userContext.name,
            role: userContext.role
          }
        })
      },
      ...recentHistory,
      {
        role: 'user',
        content: message
      }
    ]
  });

  const answer = completion?.choices?.[0]?.message?.content?.trim();
  if (!answer) {
    throw new Error('OpenAI returned an empty general chat response');
  }

  return {
    model,
    answer
  };
}

async function synthesizeSpeech(text, outputPath) {
  const client = getClient();
  const model = process.env.OPENAI_TTS_MODEL;

  if (!model) {
    throw new Error('OPENAI_TTS_MODEL is not configured');
  }

  const response = await client.audio.speech.create({
    model,
    voice: 'alloy',
    format: 'mp3',
    input: text
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(require('path').dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);

  return {
    model,
    buffer
  };
}

async function transcribeAudio(tempFilePath) {
  const client = getClient();
  const model = process.env.OPENAI_STT_MODEL;

  if (!model) {
    throw new Error('OPENAI_STT_MODEL is not configured');
  }

  const response = await client.audio.transcriptions.create({
    model,
    file: fs.createReadStream(tempFilePath)
  });

  return {
    model,
    text: response?.text?.trim() || ''
  };
}

async function smokeTest() {
  const client = getClient();
  const model = process.env.OPENAI_MODEL_QA || process.env.OPENAI_MODEL_LECTURE;

  if (!model) {
    throw new Error('OPENAI_MODEL_QA or OPENAI_MODEL_LECTURE must be configured');
  }

  const completion = await client.chat.completions.create({
    model,
    temperature: 0,
    max_tokens: 16,
    messages: [
      { role: 'system', content: 'Reply with exactly: OK' },
      { role: 'user', content: 'Ping' }
    ]
  });

  return completion?.choices?.[0]?.message?.content?.trim();
}

function createAudioCacheKey(parts) {
  return crypto.createHash('sha1').update(parts.join('|')).digest('hex');
}

module.exports = {
  generateLecturePackage,
  repairLecturePackage,
  answerLectureQuestion,
  answerGeneralChat,
  synthesizeSpeech,
  transcribeAudio,
  smokeTest,
  createAudioCacheKey
};
