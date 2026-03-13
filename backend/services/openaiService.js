const fs = require('fs');
const crypto = require('crypto');
const OpenAI = require('openai');

let openaiClient = null;

function getRequestTimeoutMs(override, fallbackMs = 45000) {
  const timeout = Number(override || fallbackMs);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : fallbackMs;
}

async function withOpenAITimeout(task, label, timeoutOverride, fallbackMs) {
  const timeoutMs = getRequestTimeoutMs(timeoutOverride, fallbackMs);

  return Promise.race([
    task(),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`OpenAI ${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

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
  outlineText,
  compactMode = false,
  minimalMode = false
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

  const generationProfile = minimalMode
    ? {
        sectionRange: '2',
        chunkRange: '1',
        chunkDetail: 'compact, teacher-like, and immediately usable in the UI',
        flashcardRange: '3 to 4',
        quizRange: '3 to 4',
        modelSuffix: '-minimal'
      }
    : compactMode
      ? {
          sectionRange: '2 to 3',
          chunkRange: '1 to 2',
          chunkDetail: 'concise but still teacher-like and useful',
          flashcardRange: '4 to 5',
          quizRange: '4',
          modelSuffix: '-compact'
        }
      : {
          sectionRange: '3 to 6',
          chunkRange: '2 to 4',
          chunkDetail: 'rich enough for a tutor to explain conceptually, not just read headings',
          flashcardRange: '4 to 8',
          quizRange: '4 to 6',
          modelSuffix: ''
        };

  const trimmedOutlineText = `${outlineText || ''}`.trim().slice(0, minimalMode ? 1400 : compactMode ? 2200 : 3200);
  const summarizedMaterials = (materials || []).slice(0, minimalMode ? 4 : 6).map((material) => ({
    title: `${material?.title || ''}`.trim().slice(0, 120),
    type: material?.type || null,
    description: `${material?.description || ''}`.trim().slice(0, minimalMode ? 140 : 240)
  }));
  const summarizedPriorTopics = (priorTopics || []).slice(minimalMode ? -3 : -5);
  const compactCourseContext = {
    name: course.name,
    description: `${course.description || ''}`.trim().slice(0, minimalMode ? 220 : 420),
    level: course.level,
    language: course.language,
    duration: course.duration
  };
  const compactTopicContext = {
    title: topic.title,
    outlineText: trimmedOutlineText,
    priorTopics: summarizedPriorTopics,
    nextTopicTitle,
    materials: summarizedMaterials
  };

  const prompt = `
You are preparing a production-ready stored lecture package for a tutoring system.
Return valid JSON only. Do not wrap in markdown. Follow this schema exactly:
${JSON.stringify(schemaDescription, null, 2)}

Constraints:
- Produce a complete lecture package for one topic.
- Make explanations clear, accurate, teacher-like, and directly tied to the topic.
- Generate ${generationProfile.sectionRange} sections.
- Generate ${generationProfile.chunkRange} chunks per section for incremental delivery.
- Each chunk should be ${generationProfile.chunkDetail}.
- Every chunk must contain a real spoken explanation in full sentences.
- Use visual_mode deliberately. Choose whiteboard, slide, diagram, flowchart, comparison_table, mixed, or none based on the concept.
- Use teaching_sequence to decide the order of teaching actions for that chunk.
- Include examples, key terms, and analogy_if_helpful when they make the explanation stronger.
- Include checkpoint_question_if_any whenever the learner should pause and self-check.
- Generate ${generationProfile.flashcardRange} flashcards.
- Generate ${generationProfile.quizRange} multiple choice questions with exactly 4 options each.
- Ensure correctAnswer is a zero-based option index.
- Use the next topic only as unlock context, not as lecture content.
- Keep the JSON compact and efficient. Avoid unnecessary verbosity in long string fields.
- Prefer practical, screen-friendly content over very long paragraphs.

Course:
${JSON.stringify(compactCourseContext, null, 2)}

Topic:
${JSON.stringify(compactTopicContext, null, 2)}
`;

  const completion = await withOpenAITimeout(
    () => client.chat.completions.create({
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
    }),
    'lecture package generation',
    process.env.OPENAI_LECTURE_REQUEST_TIMEOUT_MS,
    180000
  );

  return {
    model: `${model}${generationProfile.modelSuffix}`,
    package: getJsonFromCompletion(completion)
  };
}

async function repairLecturePackage(rawJsonText, validationErrors) {
  const client = getClient();
  const model = process.env.OPENAI_MODEL_LECTURE;

  const completion = await withOpenAITimeout(
    () => client.chat.completions.create({
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
    }),
    'lecture package repair',
    process.env.OPENAI_LECTURE_REPAIR_TIMEOUT_MS,
    90000
  );

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

  const completion = await withOpenAITimeout(
    () => client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: [
            'You are an AI tutor answering in-context lecture questions.',
            'Stay focused on the active lecture and explain clearly.',
            'Use clean GitHub-flavored markdown when it helps.',
            'When comparing concepts, settings, steps, or options, prefer a markdown table.',
            'Use bullet points for lists and fenced code blocks for code.'
          ].join(' ')
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
    }),
    'lecture question answering',
    process.env.OPENAI_QA_REQUEST_TIMEOUT_MS,
    45000
  );

  const answer = completion?.choices?.[0]?.message?.content?.trim();
  if (!answer) {
    throw new Error('OpenAI returned an empty lecture Q&A response');
  }

  return {
    model,
    answer
  };
}

async function planChunkTeaching({
  lectureTitle,
  lectureSummary,
  currentChunk,
  previousChunk,
  nextChunk,
  teachingPlanSeed,
  resumeContext
}) {
  const client = getClient();
  const model = process.env.OPENAI_MODEL_TUTOR_PLANNER || process.env.OPENAI_MODEL_QA;

  if (!model) {
    throw new Error('OPENAI_MODEL_TUTOR_PLANNER or OPENAI_MODEL_QA is not configured');
  }

  const completion = await withOpenAITimeout(
    () => client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You are a lightweight micro-teaching planner for a stored lecture system.',
            'Return valid JSON only.',
            'Do not regenerate the lesson.',
            'Only decide how the current chunk should be taught like a real teacher.'
          ].join(' ')
        },
        {
          role: 'user',
          content: JSON.stringify({
            lectureTitle,
            lectureSummary,
            previousChunk,
            currentChunk,
            nextChunk,
            teachingPlanSeed,
            resumeContext,
            requiredShape: {
              teaching_mode: 'brief_explanation | deep_explanation | analogy_driven | example_first | process_flow | compare_contrast',
              transition_text: 'string',
              use_visual: 'boolean',
              visual_type: 'none | slide | whiteboard | diagram | flowchart | comparison_table | mixed',
              use_slide: 'boolean',
              use_whiteboard: 'boolean',
              use_example: 'boolean',
              use_checkpoint: 'boolean',
              checkpoint_text: 'string',
              likely_confusion_points: ['string'],
              reinforcement_points: ['string'],
              teacher_tone: ['string'],
              recommended_duration_seconds: 'integer'
            }
          })
        }
      ]
    }),
    'teaching plan generation',
    process.env.OPENAI_PLANNER_REQUEST_TIMEOUT_MS,
    45000
  );

  return {
    model,
    plan: getJsonFromCompletion(completion)
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

  const completion = await withOpenAITimeout(
    () => client.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: [
            'You are SkillSphere AI, a calm, professional, general academic assistant for students.',
            'Answer clearly, be practical, and admit uncertainty when needed.',
            'Format responses in clean GitHub-flavored markdown.',
            'Use headings sparingly, bullets for steps, and fenced code blocks for code.',
            'When comparing tools, settings, plans, or options, use a markdown table so the UI can display it cleanly.'
          ].join(' ')
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
    }),
    'general chat response',
    process.env.OPENAI_CHAT_REQUEST_TIMEOUT_MS,
    45000
  );

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

  const response = await withOpenAITimeout(
    () => client.audio.speech.create({
      model,
      voice: 'alloy',
      format: 'mp3',
      input: text
    }),
    'speech synthesis',
    process.env.OPENAI_TTS_REQUEST_TIMEOUT_MS,
    60000
  );

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

  const response = await withOpenAITimeout(
    () => client.audio.transcriptions.create({
      model,
      file: fs.createReadStream(tempFilePath)
    }),
    'audio transcription',
    process.env.OPENAI_STT_REQUEST_TIMEOUT_MS,
    60000
  );

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

  const completion = await withOpenAITimeout(
    () => client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 16,
      messages: [
        { role: 'system', content: 'Reply with exactly: OK' },
        { role: 'user', content: 'Ping' }
      ]
    }),
    'smoke test',
    process.env.OPENAI_SMOKE_TEST_TIMEOUT_MS,
    20000
  );

  return completion?.choices?.[0]?.message?.content?.trim();
}

function createAudioCacheKey(parts) {
  return crypto.createHash('sha1').update(parts.join('|')).digest('hex');
}

module.exports = {
  generateLecturePackage,
  repairLecturePackage,
  planChunkTeaching,
  answerLectureQuestion,
  answerGeneralChat,
  synthesizeSpeech,
  transcribeAudio,
  smokeTest,
  createAudioCacheKey
};
