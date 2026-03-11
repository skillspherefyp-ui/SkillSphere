const fs = require('fs');
const path = require('path');
const {
  sequelize,
  Course,
  Topic,
  Material,
  Enrollment,
  Progress,
  AIOutline,
  AILecture,
  AILectureSection,
  AISlideOutline,
  AIVisualSuggestion,
  AIFlashcard,
  AIQuiz,
  AIQuizQuestion,
  AITutorSession,
  AITutorMessage,
  AIStudentProgress,
  AIAudioAsset
} = require('../models');
const openaiService = require('./openaiService');
const aiTeachingOrchestrator = require('./aiTeachingOrchestrator');

const AUDIO_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'ai-audio');

function dedupeStrings(values) {
  return Array.from(
    new Set(
      (values || [])
        .map((value) => `${value || ''}`.trim())
        .filter(Boolean)
    )
  );
}

function splitOutlineIntoPoints(outlineText) {
  return dedupeStrings(
    `${outlineText || ''}`
      .split(/\r?\n|[.;]/)
      .map((line) => line.replace(/^[-*#\d.\s]+/, '').trim())
      .filter((line) => line.length > 3)
  );
}

function inferVisualMode(text = '') {
  const lower = `${text}`.toLowerCase();
  if (/(compare|difference|versus|vs\b)/.test(lower)) return 'comparison_table';
  if (/(process|lifecycle|sequence|steps|pipeline|chain)/.test(lower)) return 'flowchart';
  if (/(architecture|network|diagram|topology|map)/.test(lower)) return 'diagram';
  if (/(draw|sketch|annotate|whiteboard)/.test(lower)) return 'whiteboard';
  return 'slide';
}

function buildTeachingSequence(visualMode) {
  switch (visualMode) {
    case 'diagram':
      return ['speak', 'visual', 'whiteboard'];
    case 'flowchart':
      return ['speak', 'visual', 'whiteboard'];
    case 'comparison_table':
      return ['speak', 'slide', 'visual'];
    case 'whiteboard':
      return ['speak', 'whiteboard'];
    case 'mixed':
      return ['speak', 'slide', 'visual', 'whiteboard'];
    case 'slide':
      return ['speak', 'slide'];
    default:
      return ['speak'];
  }
}

function buildVisualData(visualMode, title, slideBullets, examples, analogyIfHelpful) {
  if (visualMode === 'flowchart') {
    return {
      type: 'flowchart',
      steps: (slideBullets || []).map((bullet, index) => ({
        id: `step-${index + 1}`,
        label: bullet,
      })),
    };
  }

  if (visualMode === 'comparison_table') {
    const rows = (slideBullets || []).slice(0, 4).map((bullet, index) => {
      const parts = bullet.split(':');
      return {
        left: parts[0]?.trim() || `Point ${index + 1}`,
        right: parts.slice(1).join(':').trim() || examples[index] || analogyIfHelpful || 'Key teaching note',
      };
    });

    return {
      type: 'comparison_table',
      columns: ['Concept', 'Teaching Note'],
      rows,
    };
  }

  return {
    type: visualMode === 'whiteboard' ? 'whiteboard' : 'diagram',
    nodes: (slideBullets || []).slice(0, 4).map((bullet, index) => ({
      id: `node-${index + 1}`,
      label: bullet,
      emphasis: index === 0 ? 'primary' : 'secondary',
    })),
    caption: `${title} visual map`,
  };
}

function buildFallbackLecturePackage({
  course,
  topic,
  materials,
  priorTopics,
  nextTopicTitle,
  outlineText,
  failureReason
}) {
  const materialHints = dedupeStrings(
    (materials || []).flatMap((material) => [
      material?.title,
      material?.description,
      material?.type ? `${material.type} material` : ''
    ])
  );

  const outlinePoints = splitOutlineIntoPoints(outlineText);
  const conceptPool = dedupeStrings([
    ...outlinePoints,
    ...materialHints,
    topic.title,
    `${topic.title} fundamentals`,
    `${topic.title} applications`
  ]);

  const selectedConcepts = conceptPool.slice(0, 4);
  const sections = selectedConcepts.map((concept, index) => {
    const practicalHint = materialHints[index] || materialHints[0] || `${topic.title} example`;
    const priorContext = priorTopics?.length
      ? `Connect this with earlier topics such as ${priorTopics.slice(-2).join(' and ')}.`
      : `Start from first principles so learners can build confidence quickly.`;
    const visualMode = inferVisualMode(`${concept} ${practicalHint}`);
    const sectionTitle = index === 0 ? `Introduction to ${topic.title}` : `${topic.title}: ${concept}`;
    const learningObjective = `Understand ${concept.toLowerCase()} and explain how it supports ${topic.title}.`;

    return {
      title: sectionTitle,
      summary: `Clarify ${concept.toLowerCase()} and show how it fits inside ${topic.title}.`,
      learningObjective,
      explanation: `${concept} is a core part of ${topic.title}. ${priorContext} Use plain language, define the idea, explain why it matters, and anchor it with one concrete example based on ${practicalHint}.`,
      examples: [
        `Walk through a simple example of ${concept.toLowerCase()} in practice.`,
        `Show a common mistake students make with ${concept.toLowerCase()} and correct it.`
      ],
      visualSuggestion: `Create a simple teaching visual that highlights ${concept.toLowerCase()} and its relationship to ${topic.title}.`,
      whiteboardSuggestion: `Sketch ${concept.toLowerCase()} step by step, then annotate the most important decision points.`,
      slideBullets: [
        `${concept}`,
        `Why it matters in ${topic.title}`,
        `Worked example`,
        `Common mistake to avoid`
      ],
      chunks: [
        {
          title: `${concept} overview`,
          learning_objective: learningObjective,
          spoken_explanation: `${concept} introduces one essential part of ${topic.title}. Define it clearly, explain its purpose, and connect it to the learner's real objective before moving into detail.`,
          whiteboard_explanation: `Write ${concept} at the top, branch out into its purpose, the main signal to watch for, and one worked example from ${practicalHint}.`,
          slide_bullets: [
            `${concept}`,
            `Purpose`,
            `Real-world signal`,
            `First example`
          ],
          key_terms: [concept, topic.title, 'purpose'],
          examples: [`Use ${practicalHint} to illustrate the first practical use case.`],
          analogy_if_helpful: `${concept} works like a map legend: it helps the learner interpret the rest of ${topic.title}.`,
          visual_mode: visualMode,
          visual_query: `${topic.title} ${concept} ${visualMode === 'flowchart' ? 'flowchart' : 'diagram'}`,
          visual_caption: `Overview visual for ${concept}`,
          teaching_sequence: buildTeachingSequence(visualMode),
          difficulty_level: index === 0 ? 'introductory' : 'intermediate',
          estimated_duration_seconds: 55,
          checkpoint_question_if_any: `In one sentence, what role does ${concept} play in ${topic.title}?`,
        },
        {
          title: `${concept} in action`,
          learning_objective: `Apply ${concept.toLowerCase()} to a simple scenario.`,
          spoken_explanation: `Break ${concept.toLowerCase()} into simple steps. Show how a learner should reason through it, what signal they should look for, and why each step matters.`,
          whiteboard_explanation: `Draw the sequence for ${concept.toLowerCase()} and annotate the decision points the learner must verify.`,
          slide_bullets: [
            `Step-by-step reasoning`,
            `Decision points`,
            `Expected outcome`,
            `Typical mistake`
          ],
          key_terms: [concept, 'decision point', 'outcome'],
          examples: [
            `Use ${practicalHint} as a concrete example.`,
            `Show the most common mistake and the correct fix.`
          ],
          analogy_if_helpful: '',
          visual_mode: visualMode === 'slide' ? 'whiteboard' : visualMode,
          visual_query: `${topic.title} ${concept} worked example`,
          visual_caption: `Worked example for ${concept}`,
          teaching_sequence: buildTeachingSequence(visualMode === 'slide' ? 'whiteboard' : visualMode),
          difficulty_level: 'intermediate',
          estimated_duration_seconds: 65,
          checkpoint_question_if_any: '',
        }
      ],
    };
  });

  const slideOutline = sections.map((section, index) => ({
    title: section.title,
    bullets: section.slideBullets,
    notes: index === sections.length - 1 && nextTopicTitle
      ? `Close by connecting this topic to the next topic: ${nextTopicTitle}.`
      : `Reinforce the key point, recap the example, and ask one quick check-for-understanding question.`
  }));

  const flashcards = sections.map((section, index) => ({
    front: `What is the main idea of "${section.title}"?`,
    back: section.summary
  })).concat([
    {
      front: `Why is ${topic.title} important in ${course.name}?`,
      back: `${topic.title} helps learners build practical understanding that supports progress through the course.`
    },
    {
      front: `What should a student do after learning ${topic.title}?`,
      back: nextTopicTitle
        ? `Review the examples, confirm the key terms, and move to ${nextTopicTitle}.`
        : `Review the examples and confirm the key terms until the concept feels repeatable.`
    }
  ]).slice(0, 6);

  const quizQuestions = sections.map((section, index) => ({
    prompt: `Which option best describes the goal of "${section.title}"?`,
    options: [
      `To understand ${section.summary.toLowerCase()}`,
      `To skip foundational understanding and memorize terms only`,
      `To ignore examples and move directly to the next topic`,
      `To avoid connecting the concept with the wider course`
    ],
    correctAnswer: 0,
    explanation: `${section.title} is about understanding the concept clearly, not skipping reasoning or examples.`
  })).slice(0, 4);

  if (quizQuestions.length < 4) {
    quizQuestions.push({
      prompt: `What is the best next step after completing ${topic.title}?`,
      options: [
        `Review the examples and connect them to the core idea`,
        `Delete the notes and rely only on memory`,
        `Skip the quiz and move on without checking understanding`,
        `Ignore how the concept applies in practice`
      ],
      correctAnswer: 0,
      explanation: `Review and reflection help students retain the lecture and perform better in the quiz.`
    });
  }

  return {
    title: `${topic.title}`,
    summary: `A structured lecture package for ${topic.title} in ${course.name}.`,
    estimatedDurationMinutes: Math.max(8, sections.length * 3),
    teachingScript: sections.map((section) => `${section.title}\n${section.explanation}`).join('\n\n'),
    slideOutline,
    sections,
    flashcards,
    quiz: {
      instructions: `Answer all questions before moving on. ${failureReason ? `This package was generated using the built-in fallback lecturer because the live AI service was unavailable.` : ''}`.trim(),
      passingThreshold: 70,
      questions: quizQuestions
    }
  };
}

function validateLecturePackage(candidate) {
  const errors = [];

  if (!candidate || typeof candidate !== 'object') {
    return ['Lecture package is not an object'];
  }

  if (!candidate.title) errors.push('title is required');
  if (!candidate.summary) errors.push('summary is required');
  if (!candidate.teachingScript) errors.push('teachingScript is required');
  if (!Number.isInteger(candidate.estimatedDurationMinutes)) errors.push('estimatedDurationMinutes must be an integer');
  if (!Array.isArray(candidate.sections) || candidate.sections.length === 0) errors.push('sections must be a non-empty array');
  if (!Array.isArray(candidate.slideOutline)) errors.push('slideOutline must be an array');
  if (!Array.isArray(candidate.flashcards)) errors.push('flashcards must be an array');
  if (!candidate.quiz || !Array.isArray(candidate.quiz.questions) || candidate.quiz.questions.length === 0) {
    errors.push('quiz.questions must be a non-empty array');
  }

  if (Array.isArray(candidate.sections)) {
    candidate.sections.forEach((section, index) => {
      if (!Array.isArray(section?.chunks) || section.chunks.length === 0) {
        errors.push(`sections[${index}].chunks must be a non-empty array`);
        return;
      }

      section.chunks.forEach((chunk, chunkIndex) => {
        if (typeof chunk === 'string') {
          return;
        }

        if (!chunk?.spoken_explanation && !chunk?.spokenExplanation && !chunk?.text && !chunk?.chunkText) {
          errors.push(`sections[${index}].chunks[${chunkIndex}] spoken explanation is required`);
        }
      });
    });
  }

  return errors;
}

function normalizeLecturePackage(rawPackage, topicTitle) {
  const sections = Array.isArray(rawPackage.sections) ? rawPackage.sections : [];
  const normalizedSections = sections.map((section, sectionIndex) => {
    const explanation = `${section?.explanation || ''}`.trim();
    const rawChunks = Array.isArray(section?.chunks) && section.chunks.length > 0
      ? section.chunks.filter(Boolean)
      : explanation
          .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z])/)
          .map((chunk) => chunk.trim())
          .filter(Boolean)
          .slice(0, 4);

    const normalizedChunks = rawChunks.map((chunk, chunkIndex) => {
      if (typeof chunk === 'string') {
        const visualMode = inferVisualMode(`${section?.visualSuggestion || ''} ${section?.whiteboardSuggestion || ''}`);
        const slideBullets = Array.isArray(section?.slideBullets) ? section.slideBullets.map(String).filter(Boolean) : [];
        const examples = Array.isArray(section?.examples) ? section.examples.map(String).filter(Boolean) : [];
        return {
          title: `${section?.title || `${topicTitle} Section ${sectionIndex + 1}`} - Step ${chunkIndex + 1}`.trim(),
          learningObjective: `${section?.summary || explanation || topicTitle}`.trim(),
          spokenExplanation: chunk,
          whiteboardExplanation: `${section?.whiteboardSuggestion || section?.summary || chunk}`.trim(),
          slideBullets,
          keyTerms: dedupeStrings([section?.title, topicTitle]),
          examples,
          analogyIfHelpful: '',
          visualMode,
          visualQuery: `${topicTitle} ${section?.title || ''} ${visualMode}`.trim(),
          visualCaption: `${section?.visualSuggestion || section?.summary || topicTitle}`.trim(),
          teachingSequence: buildTeachingSequence(visualMode),
          difficultyLevel: 'intermediate',
          estimatedDurationSeconds: Math.min(90, Math.max(40, chunk.length / 3)),
          checkpointQuestion: chunkIndex === rawChunks.length - 1 ? `What is the key takeaway from ${section?.title || topicTitle}?` : '',
          visualData: buildVisualData(visualMode, section?.title || topicTitle, slideBullets, examples, ''),
        };
      }

      const slideBullets = Array.isArray(chunk?.slide_bullets || chunk?.slideBullets)
        ? (chunk.slide_bullets || chunk.slideBullets).map(String).filter(Boolean)
        : Array.isArray(section?.slideBullets)
          ? section.slideBullets.map(String).filter(Boolean)
          : [];
      const examples = Array.isArray(chunk?.examples) ? chunk.examples.map(String).filter(Boolean) : Array.isArray(section?.examples) ? section.examples.map(String).filter(Boolean) : [];
      const visualMode = `${chunk?.visual_mode || chunk?.visualMode || inferVisualMode(`${chunk?.visual_query || ''} ${chunk?.visual_caption || ''} ${section?.visualSuggestion || ''}`)}`.trim() || 'slide';
      const analogy = `${chunk?.analogy_if_helpful || chunk?.analogyIfHelpful || ''}`.trim();
      return {
        title: `${chunk?.title || section?.title || `${topicTitle} Section ${sectionIndex + 1}`}`.trim(),
        learningObjective: `${chunk?.learning_objective || chunk?.learningObjective || section?.learningObjective || section?.summary || topicTitle}`.trim(),
        spokenExplanation: `${chunk?.spoken_explanation || chunk?.spokenExplanation || chunk?.chunkText || chunk?.text || explanation || topicTitle}`.trim(),
        whiteboardExplanation: `${chunk?.whiteboard_explanation || chunk?.whiteboardExplanation || section?.whiteboardSuggestion || section?.summary || ''}`.trim(),
        slideBullets,
        keyTerms: dedupeStrings(chunk?.key_terms || chunk?.keyTerms || [section?.title, topicTitle]),
        examples,
        analogyIfHelpful: analogy,
        visualMode,
        visualQuery: `${chunk?.visual_query || chunk?.visualQuery || `${topicTitle} ${section?.title || ''} ${visualMode}`}`.trim(),
        visualCaption: `${chunk?.visual_caption || chunk?.visualCaption || section?.visualSuggestion || section?.summary || topicTitle}`.trim(),
        teachingSequence: dedupeStrings(chunk?.teaching_sequence || chunk?.teachingSequence || buildTeachingSequence(visualMode)),
        difficultyLevel: `${chunk?.difficulty_level || chunk?.difficultyLevel || 'intermediate'}`.trim(),
        estimatedDurationSeconds: Number.isInteger(chunk?.estimated_duration_seconds)
          ? chunk.estimated_duration_seconds
          : Number.isInteger(chunk?.estimatedDurationSeconds)
            ? chunk.estimatedDurationSeconds
            : Math.min(90, Math.max(40, `${chunk?.spoken_explanation || chunk?.spokenExplanation || ''}`.length / 3)),
        checkpointQuestion: `${chunk?.checkpoint_question_if_any || chunk?.checkpointQuestionIfAny || chunk?.checkpointQuestion || ''}`.trim(),
        visualData: chunk?.visual_data || chunk?.visualData || buildVisualData(visualMode, chunk?.title || section?.title || topicTitle, slideBullets, examples, analogy),
      };
    });

    return {
      title: `${section?.title || `${topicTitle} Section ${sectionIndex + 1}`}`.trim(),
      summary: `${section?.summary || explanation || 'Core concept review.'}`.trim(),
      learningObjective: `${section?.learningObjective || section?.learning_objective || section?.summary || topicTitle}`.trim(),
      explanation,
      examples: Array.isArray(section?.examples) ? section.examples.map(String).filter(Boolean) : [],
      visualSuggestion: `${section?.visualSuggestion || ''}`.trim(),
      whiteboardSuggestion: `${section?.whiteboardSuggestion || ''}`.trim(),
      slideBullets: Array.isArray(section?.slideBullets) ? section.slideBullets.map(String).filter(Boolean) : [],
      chunks: normalizedChunks.length > 0 ? normalizedChunks : [{
        title: `${section?.title || topicTitle} overview`,
        learningObjective: `${section?.summary || topicTitle}`.trim(),
        spokenExplanation: explanation || `${topicTitle} overview.`,
        whiteboardExplanation: `${section?.whiteboardSuggestion || explanation || topicTitle}`.trim(),
        slideBullets: Array.isArray(section?.slideBullets) ? section.slideBullets.map(String).filter(Boolean) : [],
        keyTerms: dedupeStrings([section?.title, topicTitle]),
        examples: Array.isArray(section?.examples) ? section.examples.map(String).filter(Boolean) : [],
        analogyIfHelpful: '',
        visualMode: inferVisualMode(`${section?.visualSuggestion || ''} ${section?.whiteboardSuggestion || ''}`),
        visualQuery: `${topicTitle} ${section?.title || ''}`.trim(),
        visualCaption: `${section?.visualSuggestion || section?.summary || topicTitle}`.trim(),
        teachingSequence: ['speak', 'slide'],
        difficultyLevel: 'intermediate',
        estimatedDurationSeconds: 50,
        checkpointQuestion: '',
        visualData: {},
      }]
    };
  });

  const flashcards = Array.isArray(rawPackage.flashcards) ? rawPackage.flashcards : [];
  const quizQuestions = Array.isArray(rawPackage?.quiz?.questions) ? rawPackage.quiz.questions : [];
  const slideOutline = Array.isArray(rawPackage.slideOutline) ? rawPackage.slideOutline : [];

  return {
    title: `${rawPackage.title || topicTitle}`.trim(),
    summary: `${rawPackage.summary || `Lecture covering ${topicTitle}.`}`.trim(),
    estimatedDurationMinutes: Number.isInteger(rawPackage.estimatedDurationMinutes) ? rawPackage.estimatedDurationMinutes : 10,
    teachingScript: `${rawPackage.teachingScript || normalizedSections.map((section) => section.explanation).join('\n\n')}`.trim(),
    sections: normalizedSections,
    slideOutline: slideOutline.map((slide, slideIndex) => ({
      title: `${slide?.title || `Slide ${slideIndex + 1}`}`.trim(),
      bullets: Array.isArray(slide?.bullets) ? slide.bullets.map(String).filter(Boolean) : [],
      notes: `${slide?.notes || ''}`.trim()
    })),
    flashcards: flashcards.map((card, cardIndex) => ({
      front: `${card?.front || `Flashcard ${cardIndex + 1}`}`.trim(),
      back: `${card?.back || ''}`.trim()
    })).filter((card) => card.front && card.back),
    quiz: {
      instructions: `${rawPackage?.quiz?.instructions || 'Answer all questions, then submit to unlock the next topic.'}`.trim(),
      passingThreshold: Number.isInteger(rawPackage?.quiz?.passingThreshold) ? rawPackage.quiz.passingThreshold : 70,
      questions: quizQuestions.map((question, questionIndex) => {
        const options = Array.isArray(question?.options) ? question.options.map(String).filter(Boolean).slice(0, 4) : [];
        while (options.length < 4) {
          options.push(`Option ${options.length + 1}`);
        }

        let correctAnswer = Number.isInteger(question?.correctAnswer) ? question.correctAnswer : 0;
        if (correctAnswer < 0 || correctAnswer > 3) {
          correctAnswer = 0;
        }

        return {
          prompt: `${question?.prompt || `Question ${questionIndex + 1}`}`.trim(),
          options,
          correctAnswer,
          explanation: `${question?.explanation || ''}`.trim()
        };
      }).filter((question) => question.prompt)
    }
  };
}

function getOutlineText(topic, materials) {
  const materialLines = (materials || []).map((material, index) => {
    return `${index + 1}. ${material.title || material.fileName || material.uri || 'Material'}${material.description ? ` - ${material.description}` : ''}`;
  });

  return [
    `Topic: ${topic.title}`,
    materialLines.length > 0 ? `Supporting materials:\n${materialLines.join('\n')}` : 'Supporting materials: none'
  ].join('\n\n');
}

async function canManageCourse(user, courseId) {
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  const isSuperAdmin = user.role === 'superadmin';
  const isOwner = course.userId === user.id;
  const canManageAll = user.permissions?.canManageAllCourses === true;

  if (!isSuperAdmin && !isOwner && !canManageAll) {
    throw new Error('You do not have permission to manage AI content for this course');
  }

  return course;
}

async function persistLecturePackage({
  course,
  topic,
  outline,
  normalizedPackage,
  modelName,
  nextTopicId
}) {
  return sequelize.transaction(async (transaction) => {
    let lecture = await AILecture.findOne({
      where: { topicId: topic.id },
      transaction
    });

    if (!lecture) {
      lecture = await AILecture.create({
        courseId: course.id,
        topicId: topic.id,
        outlineId: outline.id,
        title: normalizedPackage.title,
        summary: normalizedPackage.summary,
        estimatedDurationMinutes: normalizedPackage.estimatedDurationMinutes,
        teachingScript: normalizedPackage.teachingScript,
        preparationNotes: {
          generatedAt: new Date().toISOString(),
          sections: normalizedPackage.sections.length,
          flashcards: normalizedPackage.flashcards.length
        },
        passingThreshold: normalizedPackage.quiz.passingThreshold,
        nextTopicId,
        generationModel: modelName,
        status: 'ready',
        errorMessage: null
      }, { transaction });
    } else {
      await lecture.update({
        courseId: course.id,
        outlineId: outline.id,
        title: normalizedPackage.title,
        summary: normalizedPackage.summary,
        estimatedDurationMinutes: normalizedPackage.estimatedDurationMinutes,
        teachingScript: normalizedPackage.teachingScript,
        preparationNotes: {
          generatedAt: new Date().toISOString(),
          sections: normalizedPackage.sections.length,
          flashcards: normalizedPackage.flashcards.length
        },
        passingThreshold: normalizedPackage.quiz.passingThreshold,
        nextTopicId,
        generationModel: modelName,
        status: 'ready',
        errorMessage: null
      }, { transaction });
    }

    const existingQuiz = await AIQuiz.findOne({
      where: { lectureId: lecture.id },
      transaction
    });

    if (existingQuiz) {
      await AIQuizQuestion.destroy({ where: { quizId: existingQuiz.id }, transaction });
      await AIQuiz.destroy({ where: { id: existingQuiz.id }, transaction });
    }

    await Promise.all([
      AILectureSection.destroy({ where: { lectureId: lecture.id }, transaction }),
      AISlideOutline.destroy({ where: { lectureId: lecture.id }, transaction }),
      AIVisualSuggestion.destroy({ where: { lectureId: lecture.id }, transaction }),
      AIFlashcard.destroy({ where: { lectureId: lecture.id }, transaction })
    ]);

    const sectionRows = [];
    normalizedPackage.sections.forEach((section, sectionIndex) => {
      section.chunks.forEach((chunk, chunkIndex) => {
        sectionRows.push({
          lectureId: lecture.id,
          sectionIndex,
          chunkIndex,
          title: chunk.title || section.title,
          summary: section.summary,
          chunkText: chunk.spokenExplanation,
          learningObjective: chunk.learningObjective,
          spokenExplanation: chunk.spokenExplanation,
          whiteboardExplanation: chunk.whiteboardExplanation,
          keyTerms: chunk.keyTerms,
          examples: chunk.examples,
          analogyIfHelpful: chunk.analogyIfHelpful,
          visualMode: chunk.visualMode,
          visualQuery: chunk.visualQuery,
          visualCaption: chunk.visualCaption,
          visualSuggestion: section.visualSuggestion || chunk.visualCaption,
          whiteboardSuggestion: section.whiteboardSuggestion || chunk.whiteboardExplanation,
          slideBullets: chunk.slideBullets,
          teachingSequence: chunk.teachingSequence,
          difficultyLevel: chunk.difficultyLevel,
          estimatedDurationSeconds: chunk.estimatedDurationSeconds,
          checkpointQuestion: chunk.checkpointQuestion,
          visualData: chunk.visualData
        });
      });
    });

    if (sectionRows.length > 0) {
      await AILectureSection.bulkCreate(sectionRows, { transaction });
    }

    const slideRows = normalizedPackage.slideOutline.map((slide, slideIndex) => ({
      lectureId: lecture.id,
      slideIndex,
      title: slide.title,
      bullets: slide.bullets,
      notes: slide.notes
    }));
    if (slideRows.length > 0) {
      await AISlideOutline.bulkCreate(slideRows, { transaction });
    }

    const visualRows = normalizedPackage.sections.map((section, sectionIndex) => ({
      lectureId: lecture.id,
      sectionIndex,
      title: section.title,
      suggestion: section.visualSuggestion || section.whiteboardSuggestion || `Visual aid for ${section.title}`,
      visualMode: section.chunks?.[0]?.visualMode || inferVisualMode(section.visualSuggestion),
      visualQuery: section.chunks?.[0]?.visualQuery || `${section.title} visual`,
      caption: section.chunks?.[0]?.visualCaption || section.visualSuggestion || section.summary,
      structuredData: section.chunks?.[0]?.visualData || {}
    }));
    if (visualRows.length > 0) {
      await AIVisualSuggestion.bulkCreate(visualRows, { transaction });
    }

    const flashcardRows = normalizedPackage.flashcards.map((card, cardIndex) => ({
      lectureId: lecture.id,
      cardIndex,
      frontText: card.front,
      backText: card.back
    }));
    if (flashcardRows.length > 0) {
      await AIFlashcard.bulkCreate(flashcardRows, { transaction });
    }

    const quiz = await AIQuiz.create({
      lectureId: lecture.id,
      passingThreshold: normalizedPackage.quiz.passingThreshold,
      instructions: normalizedPackage.quiz.instructions
    }, { transaction });

    await AIQuizQuestion.bulkCreate(normalizedPackage.quiz.questions.map((question, questionIndex) => ({
      quizId: quiz.id,
      questionIndex,
      prompt: question.prompt,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation
    })), { transaction });

    return lecture;
  });
}

async function generateCoursePackage(courseId, adminUser) {
  const course = await canManageCourse(adminUser, courseId);
  const topics = await Topic.findAll({
    where: { courseId },
    include: [{ model: Material, as: 'materials' }],
    order: [['order', 'ASC']]
  });

  if (topics.length === 0) {
    throw new Error('Add at least one topic before generating AI lecture content');
  }

  const results = [];

  for (let index = 0; index < topics.length; index += 1) {
    const topic = topics[index];
    const priorTopics = topics.slice(0, index).map((item) => item.title);
    const nextTopicTitle = topics[index + 1]?.title || null;
    const defaultOutlineText = getOutlineText(topic, topic.materials);

    const [outline] = await AIOutline.findOrCreate({
      where: { topicId: topic.id },
      defaults: {
        courseId,
        topicId: topic.id,
        adminId: adminUser.id,
        outlineText: defaultOutlineText,
        sourceMaterials: [],
        status: 'draft'
      }
    });

    const outlineText = outline.outlineText || defaultOutlineText;

    await outline.update({
      courseId,
      adminId: adminUser.id,
      outlineText,
      sourceMaterials: (topic.materials || []).map((material) => ({
        id: material.id,
        title: material.title,
        description: material.description,
        type: material.type,
        uri: material.uri
      })),
      status: 'processing',
      errorMessage: null
    });

    try {
      const sourceMaterials = (topic.materials || []).map((material) => ({
        title: material.title,
        description: material.description,
        type: material.type
      }));

      let normalized;
      let modelName;

      try {
        const generation = await openaiService.generateLecturePackage({
          course,
          topic,
          materials: sourceMaterials,
          priorTopics,
          nextTopicTitle,
          outlineText
        });

        let rawPackage = generation.package;
        const validationErrors = validateLecturePackage(rawPackage);
        if (validationErrors.length > 0) {
          rawPackage = await openaiService.repairLecturePackage(JSON.stringify(rawPackage), validationErrors);
        }

        normalized = normalizeLecturePackage(rawPackage, topic.title);
        const finalValidationErrors = validateLecturePackage(normalized);
        if (finalValidationErrors.length > 0) {
          throw new Error(`Generated lecture package is invalid: ${finalValidationErrors.join(', ')}`);
        }

        modelName = generation.model;
      } catch (generationError) {
        console.error(`Primary AI generation failed for topic ${topic.id}, falling back to template package:`, generationError);
        normalized = normalizeLecturePackage(
          buildFallbackLecturePackage({
            course,
            topic,
            materials: sourceMaterials,
            priorTopics,
            nextTopicTitle,
            outlineText,
            failureReason: generationError.message
          }),
          topic.title
        );
        modelName = 'fallback-template';
      }

      await persistLecturePackage({
        course,
        topic,
        outline,
        normalizedPackage: normalized,
        modelName,
        nextTopicId: topics[index + 1]?.id || null
      });

      const usedFallback = modelName === 'fallback-template';
      await outline.update({
        status: 'ready',
        errorMessage: usedFallback ? 'Primary AI generation failed; fallback lecture package was stored.' : null
      });
      results.push({
        topicId: topic.id,
        topicTitle: topic.title,
        status: 'ready',
        usedFallback,
        message: usedFallback
          ? 'Primary AI generation failed; a fallback lecture package was stored and can be used immediately.'
          : 'Lecture package generated successfully.'
      });
    } catch (error) {
      console.error(`AI generation failed for topic ${topic.id}:`, error);
      await outline.update({ status: 'failed', errorMessage: error.message });

      const existingLecture = await AILecture.findOne({ where: { topicId: topic.id } });
      if (existingLecture) {
        await existingLecture.update({ status: 'failed', errorMessage: error.message });
      }

      results.push({
        topicId: topic.id,
        topicTitle: topic.title,
        status: 'failed',
        error: error.message
      });
    }
  }

  return results;
}

async function getLectureByTopicId(topicId) {
  return AILecture.findOne({
    where: { topicId },
    include: [
      { model: AILectureSection, as: 'sections' },
      { model: AISlideOutline, as: 'slideOutlines' },
      { model: AIVisualSuggestion, as: 'visualSuggestions' },
      { model: AIFlashcard, as: 'flashcards' },
      {
        model: AIQuiz,
        as: 'aiQuiz',
        include: [{ model: AIQuizQuestion, as: 'questions' }]
      },
      { model: Topic, as: 'topic' },
      { model: Topic, as: 'nextTopic' }
    ]
  });
}

async function ensureLectureReadyForTopic(topicId) {
  let lecture = await getLectureByTopicId(topicId);
  if (lecture && lecture.status === 'ready') {
    return lecture;
  }

  const topic = await Topic.findByPk(topicId, {
    include: [{ model: Material, as: 'materials' }]
  });

  if (!topic) {
    throw new Error('Topic not found');
  }

  const course = await Course.findByPk(topic.courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  const courseTopics = await Topic.findAll({
    where: { courseId: topic.courseId },
    order: [['order', 'ASC']]
  });

  const topicIndex = courseTopics.findIndex((item) => item.id === topic.id);
  const priorTopics = topicIndex > 0 ? courseTopics.slice(0, topicIndex).map((item) => item.title) : [];
  const nextTopicId = topicIndex >= 0 ? courseTopics[topicIndex + 1]?.id || null : null;
  const nextTopicTitle = topicIndex >= 0 ? courseTopics[topicIndex + 1]?.title || null : null;
  const defaultOutlineText = getOutlineText(topic, topic.materials);

  const [outline] = await AIOutline.findOrCreate({
    where: { topicId: topic.id },
    defaults: {
      courseId: topic.courseId,
      topicId: topic.id,
      adminId: null,
      outlineText: defaultOutlineText,
      sourceMaterials: [],
      status: 'draft'
    }
  });

  const normalized = normalizeLecturePackage(
    buildFallbackLecturePackage({
      course,
      topic,
      materials: (topic.materials || []).map((material) => ({
        title: material.title,
        description: material.description,
        type: material.type
      })),
      priorTopics,
      nextTopicTitle,
      outlineText: outline.outlineText || defaultOutlineText,
      failureReason: lecture?.errorMessage || 'Lecture package was missing when the student started learning.'
    }),
    topic.title
  );

  await persistLecturePackage({
    course,
    topic,
    outline,
    normalizedPackage: normalized,
    modelName: 'fallback-template',
    nextTopicId
  });

  await outline.update({
    status: 'ready',
    errorMessage: 'Fallback lecture package was auto-generated during session start.'
  });

  lecture = await getLectureByTopicId(topicId);
  if (!lecture || lecture.status !== 'ready') {
    throw new Error('Lecture package is not ready for this topic');
  }

  return lecture;
}

function mapLectureChunk(lecture, sectionIndex, chunkIndex) {
  const sections = (lecture.sections || []).slice().sort((a, b) => {
    if (a.sectionIndex === b.sectionIndex) {
      return a.chunkIndex - b.chunkIndex;
    }
    return a.sectionIndex - b.sectionIndex;
  });

  const chunk = sections.find((item) => item.sectionIndex === sectionIndex && item.chunkIndex === chunkIndex);
  if (!chunk) {
    return null;
  }

  return {
    id: chunk.id,
    sectionIndex: chunk.sectionIndex,
    chunkIndex: chunk.chunkIndex,
    title: chunk.title,
    summary: chunk.summary,
    text: chunk.spokenExplanation || chunk.chunkText,
    learningObjective: chunk.learningObjective,
    spokenExplanation: chunk.spokenExplanation || chunk.chunkText,
    whiteboardExplanation: chunk.whiteboardExplanation || chunk.whiteboardSuggestion,
    keyTerms: chunk.keyTerms || [],
    examples: chunk.examples,
    analogyIfHelpful: chunk.analogyIfHelpful,
    visualMode: chunk.visualMode,
    visualQuery: chunk.visualQuery,
    visualCaption: chunk.visualCaption,
    visualSuggestion: chunk.visualSuggestion,
    whiteboardSuggestion: chunk.whiteboardSuggestion,
    slideBullets: chunk.slideBullets,
    teachingSequence: chunk.teachingSequence || [],
    difficultyLevel: chunk.difficultyLevel,
    estimatedDurationSeconds: chunk.estimatedDurationSeconds,
    checkpointQuestion: chunk.checkpointQuestion,
    visualData: chunk.visualData || {}
  };
}

function getVisualSuggestionForChunk(lecture, chunk) {
  return (lecture?.visualSuggestions || []).find((item) => item.sectionIndex === chunk?.sectionIndex) || null;
}

function attachTeachingDecision(lecture, session, chunk) {
  if (!chunk) {
    return null;
  }

  const delivery = aiTeachingOrchestrator.getTeachingDecision({
    lecture,
    chunk,
    session,
    visualSuggestion: getVisualSuggestionForChunk(lecture, chunk)
  });

  return {
    ...chunk,
    delivery,
  };
}

function getNextChunkPointer(lecture, currentSectionIndex, currentChunkIndex) {
  const ordered = (lecture.sections || []).slice().sort((a, b) => {
    if (a.sectionIndex === b.sectionIndex) {
      return a.chunkIndex - b.chunkIndex;
    }
    return a.sectionIndex - b.sectionIndex;
  });

  const currentPosition = ordered.findIndex((item) => item.sectionIndex === currentSectionIndex && item.chunkIndex === currentChunkIndex);
  if (currentPosition === -1) {
    return ordered[0]
      ? { sectionIndex: ordered[0].sectionIndex, chunkIndex: ordered[0].chunkIndex, hasMore: true }
      : { hasMore: false };
  }

  const nextChunk = ordered[currentPosition + 1];
  if (!nextChunk) {
    return { hasMore: false };
  }

  return {
    sectionIndex: nextChunk.sectionIndex,
    chunkIndex: nextChunk.chunkIndex,
    hasMore: true
  };
}

async function ensureStudentEnrollment(userId, courseId) {
  const enrollment = await Enrollment.findOne({
    where: { userId, courseId }
  });

  if (!enrollment) {
    throw new Error('You must be enrolled in this course');
  }

  return enrollment;
}

async function startTutorSession(userId, topicId, voiceModeEnabled) {
  const lecture = await ensureLectureReadyForTopic(topicId);

  await ensureStudentEnrollment(userId, lecture.courseId);

  const [progress] = await AIStudentProgress.findOrCreate({
    where: {
      userId,
      courseId: lecture.courseId,
      topicId: lecture.topicId
    },
    defaults: {
      lectureId: lecture.id,
      currentSectionIndex: 0,
      currentChunkIndex: 0
    }
  });

  let session = await AITutorSession.findOne({
    where: {
      userId,
      topicId,
      status: ['in_progress', 'paused', 'lecture_completed']
    },
    order: [['updatedAt', 'DESC']]
  });

  if (!session) {
    session = await AITutorSession.create({
      userId,
      courseId: lecture.courseId,
      topicId,
      lectureId: lecture.id,
      currentSectionIndex: progress.currentSectionIndex,
      currentChunkIndex: progress.currentChunkIndex,
      status: progress.lectureCompleted ? 'lecture_completed' : 'in_progress',
      voiceModeEnabled: Boolean(voiceModeEnabled),
      teachingState: { currentStepIndex: 0 },
      lastActivityAt: new Date()
    });
  } else {
    await session.update({
      lectureId: lecture.id,
      voiceModeEnabled: Boolean(voiceModeEnabled),
      currentSectionIndex: progress.currentSectionIndex,
      currentChunkIndex: progress.currentChunkIndex,
      teachingState: { currentStepIndex: 0 },
      lastActivityAt: new Date()
    });
  }

  await progress.update({
    lectureId: lecture.id,
    lastSessionId: session.id
  });

  const chunk = attachTeachingDecision(
    lecture,
    session,
    mapLectureChunk(lecture, session.currentSectionIndex, session.currentChunkIndex) || mapLectureChunk(lecture, 0, 0)
  );

  return {
    session,
    lecture,
    progress,
    chunk
  };
}

async function getSessionState(sessionId, userId) {
  const session = await AITutorSession.findOne({
    where: { id: sessionId, userId },
    include: [{
      model: AITutorMessage,
      as: 'messages',
      separate: true,
      limit: 20,
      order: [['createdAt', 'ASC']]
    }]
  });

  if (!session) {
    throw new Error('Tutor session not found');
  }

  const lecture = await getLectureByTopicId(session.topicId);
  const chunk = lecture ? attachTeachingDecision(lecture, session, mapLectureChunk(lecture, session.currentSectionIndex, session.currentChunkIndex)) : null;
  const progress = await AIStudentProgress.findOne({
    where: {
      userId,
      courseId: session.courseId,
      topicId: session.topicId
    }
  });

  return {
    session,
    lecture,
    progress,
    chunk
  };
}

async function setSessionPaused(sessionId, userId, paused) {
  const session = await AITutorSession.findOne({
    where: { id: sessionId, userId }
  });

  if (!session) {
    throw new Error('Tutor session not found');
  }

  await session.update({
    status: paused ? 'paused' : (session.status === 'lecture_completed' ? 'lecture_completed' : 'in_progress'),
    lastActivityAt: new Date()
  });

  return session;
}

async function getNextLectureChunk(sessionId, userId) {
  const session = await AITutorSession.findOne({
    where: { id: sessionId, userId }
  });

  if (!session) {
    throw new Error('Tutor session not found');
  }

  const lecture = await getLectureByTopicId(session.topicId);
  if (!lecture) {
    throw new Error('Lecture package not found');
  }

  const pointer = getNextChunkPointer(lecture, session.currentSectionIndex, session.currentChunkIndex);
  if (!pointer.hasMore) {
    await session.update({
      status: 'lecture_completed',
      lastActivityAt: new Date()
    });

    const [progress] = await AIStudentProgress.findOrCreate({
      where: {
        userId,
        courseId: session.courseId,
        topicId: session.topicId
      },
      defaults: { lectureId: session.lectureId }
    });

    await progress.update({
      lectureCompleted: true,
      currentSectionIndex: session.currentSectionIndex,
      currentChunkIndex: session.currentChunkIndex,
      lastSessionId: session.id
    });

    return { session, lectureCompleted: true, chunk: null };
  }

  await session.update({
    currentSectionIndex: pointer.sectionIndex,
    currentChunkIndex: pointer.chunkIndex,
    status: 'in_progress',
    teachingState: { currentStepIndex: 0 },
    lastActivityAt: new Date()
  });

  const [progress] = await AIStudentProgress.findOrCreate({
    where: {
      userId,
      courseId: session.courseId,
      topicId: session.topicId
    },
    defaults: { lectureId: session.lectureId }
  });

  await progress.update({
    lectureId: lecture.id,
    currentSectionIndex: pointer.sectionIndex,
    currentChunkIndex: pointer.chunkIndex,
    lastSessionId: session.id
  });

  return {
    session,
    lectureCompleted: false,
    chunk: attachTeachingDecision(lecture, session, mapLectureChunk(lecture, pointer.sectionIndex, pointer.chunkIndex))
  };
}

async function submitQuestion(sessionId, userId, question) {
  const session = await AITutorSession.findOne({
    where: { id: sessionId, userId },
    include: [{
      model: AITutorMessage,
      as: 'messages',
      separate: true,
      limit: 6,
      order: [['createdAt', 'DESC']]
    }]
  });

  if (!session) {
    throw new Error('Tutor session not found');
  }

  const lecture = await getLectureByTopicId(session.topicId);
  if (!lecture) {
    throw new Error('Lecture package not found');
  }

  const currentChunk = mapLectureChunk(lecture, session.currentSectionIndex, session.currentChunkIndex);
  const sectionChunks = (lecture.sections || [])
    .filter((item) => item.sectionIndex === session.currentSectionIndex)
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map((item) => item.chunkText);

  await session.update({
    status: 'paused',
    lastActivityAt: new Date()
  });

  const userMessage = await AITutorMessage.create({
    sessionId: session.id,
    sender: 'user',
    messageType: 'question',
    content: question,
    contextSnapshot: {
      sectionIndex: session.currentSectionIndex,
      chunkIndex: session.currentChunkIndex
    }
  });

  const response = await openaiService.answerLectureQuestion({
    lectureTitle: lecture.title,
    lectureSummary: lecture.summary,
    currentChunk: currentChunk?.spokenExplanation || currentChunk?.text || '',
    currentSection: {
      title: currentChunk?.title || lecture.title,
      chunks: sectionChunks,
      teachingMode: currentChunk?.delivery?.current_mode_label || 'Explaining',
      learningObjective: currentChunk?.learningObjective || currentChunk?.summary || '',
      whiteboardExplanation: currentChunk?.whiteboardExplanation || '',
      slideBullets: currentChunk?.slideBullets || [],
      examples: currentChunk?.examples || [],
      analogy: currentChunk?.analogyIfHelpful || '',
      checkpointQuestion: currentChunk?.checkpointQuestion || '',
      visual: {
        mode: currentChunk?.visualMode || 'none',
        caption: currentChunk?.visualCaption || '',
        query: currentChunk?.visualQuery || ''
      }
    },
    recentMessages: (session.messages || []).slice().reverse().map((message) => ({
      sender: message.sender,
      content: message.content
    })),
    question
  });

  const aiMessage = await AITutorMessage.create({
    sessionId: session.id,
    sender: 'ai',
    messageType: 'answer',
    content: response.answer,
    contextSnapshot: {
      sectionIndex: session.currentSectionIndex,
      chunkIndex: session.currentChunkIndex,
      model: response.model
    }
  });

  return {
    session,
    lecture,
    userMessage,
    aiMessage
  };
}

async function getFlashcards(lectureId) {
  return AIFlashcard.findAll({
    where: { lectureId },
    order: [['cardIndex', 'ASC']]
  });
}

async function getQuiz(lectureId) {
  return AIQuiz.findOne({
    where: { lectureId },
    include: [{ model: AIQuizQuestion, as: 'questions' }]
  });
}

async function recalculateEnrollmentProgress(userId, courseId) {
  const totalTopics = await Topic.count({ where: { courseId } });
  const completedTopics = await Progress.count({
    where: {
      userId,
      courseId,
      completed: true
    }
  });

  const enrollment = await Enrollment.findOne({
    where: { userId, courseId }
  });

  if (!enrollment) {
    return;
  }

  const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  await enrollment.update({
    progressPercentage,
    status: progressPercentage >= 100 ? 'completed' : progressPercentage > 0 ? 'in-progress' : 'enrolled',
    completedAt: progressPercentage >= 100 ? new Date() : null
  });
}

async function unlockNextTopicForStudent({ userId, courseId, topicId, nextTopicId }) {
  await sequelize.transaction(async (transaction) => {
    const currentTopic = await Topic.findByPk(topicId, { transaction });
    if (currentTopic && !currentTopic.completed) {
      await currentTopic.update({
        completed: true,
        status: 'unlocked'
      }, { transaction });
    }

    const [progress] = await Progress.findOrCreate({
      where: {
        userId,
        courseId,
        topicId
      },
      defaults: {
        completed: true,
        completedAt: new Date(),
        timeSpent: 0
      },
      transaction
    });

    await progress.update({
      completed: true,
      completedAt: new Date()
    }, { transaction });

    if (nextTopicId) {
      const nextTopic = await Topic.findByPk(nextTopicId, { transaction });
      if (nextTopic && nextTopic.status === 'locked') {
        await nextTopic.update({ status: 'unlocked' }, { transaction });
      }
    }
  });

  await recalculateEnrollmentProgress(userId, courseId);
  return nextTopicId ? Topic.findByPk(nextTopicId) : null;
}

async function submitQuiz(lectureId, userId, answers) {
  const lecture = await AILecture.findByPk(lectureId);
  if (!lecture) {
    throw new Error('Lecture not found');
  }

  await ensureStudentEnrollment(userId, lecture.courseId);

  const quiz = await getQuiz(lectureId);
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    throw new Error('Quiz not available for this lecture');
  }

  let correctAnswers = 0;
  const gradedQuestions = quiz.questions.map((question) => {
    const submittedAnswer = Number(answers?.[question.id]);
    const isCorrect = submittedAnswer === question.correctAnswer;
    if (isCorrect) {
      correctAnswers += 1;
    }

    return {
      id: question.id,
      submittedAnswer: Number.isInteger(submittedAnswer) ? submittedAnswer : null,
      correctAnswer: question.correctAnswer,
      isCorrect,
      explanation: question.explanation
    };
  });

  const totalQuestions = quiz.questions.length;
  const score = Math.round((correctAnswers / totalQuestions) * 100);
  const passed = score >= quiz.passingThreshold;

  const [progress] = await AIStudentProgress.findOrCreate({
    where: {
      userId,
      courseId: lecture.courseId,
      topicId: lecture.topicId
    },
    defaults: { lectureId }
  });

  await progress.update({
    lectureId,
    lectureCompleted: true,
    quizScore: score,
    quizPassed: passed,
    quizAttempts: progress.quizAttempts + 1,
    unlockedNextTopicId: passed ? lecture.nextTopicId : null
  });

  const unlockedTopic = passed
    ? await unlockNextTopicForStudent({
        userId,
        courseId: lecture.courseId,
        topicId: lecture.topicId,
        nextTopicId: lecture.nextTopicId
      })
    : null;

  return {
    score,
    passed,
    correctAnswers,
    totalQuestions,
    passingThreshold: quiz.passingThreshold,
    gradedQuestions,
    unlockedTopic
  };
}

async function getOrCreateAudioAsset({ lectureId, sessionId, assetType, text }) {
  const cacheKey = openaiService.createAudioCacheKey([`${lectureId || ''}`, `${sessionId || ''}`, assetType, text]);
  const existing = await AIAudioAsset.findOne({ where: { cacheKey } });
  if (existing && fs.existsSync(existing.storagePath)) {
    return existing;
  }

  fs.mkdirSync(AUDIO_UPLOAD_DIR, { recursive: true });
  const filename = `${cacheKey}.mp3`;
  const outputPath = path.join(AUDIO_UPLOAD_DIR, filename);

  await openaiService.synthesizeSpeech(text, outputPath);

  return AIAudioAsset.create({
    lectureId: lectureId || null,
    sessionId: sessionId || null,
    cacheKey,
    assetType,
    voice: 'alloy',
    mimeType: 'audio/mpeg',
    storagePath: outputPath,
    urlPath: `/uploads/ai-audio/${filename}`,
    textPreview: text.slice(0, 120)
  });
}

module.exports = {
  generateCoursePackage,
  getLectureByTopicId,
  startTutorSession,
  getSessionState,
  getNextLectureChunk,
  setSessionPaused,
  submitQuestion,
  getFlashcards,
  getQuiz,
  submitQuiz,
  getOrCreateAudioAsset,
  canManageCourse,
  recalculateEnrollmentProgress
};
