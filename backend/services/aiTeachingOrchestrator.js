const openaiService = require('./openaiService');

function dedupeStrings(values = []) {
  return Array.from(new Set((values || []).map((value) => `${value || ''}`.trim()).filter(Boolean)));
}

function normalizeSequence(sequence = [], visualMode = 'none') {
  const next = Array.isArray(sequence) ? sequence.filter(Boolean) : [];
  if (next.length > 0) {
    return next;
  }

  switch (visualMode) {
    case 'diagram':
    case 'flowchart':
    case 'comparison_table':
      return ['speak', 'visual', 'whiteboard'];
    case 'whiteboard':
      return ['speak', 'whiteboard'];
    case 'slide':
      return ['speak', 'slide'];
    case 'mixed':
      return ['speak', 'slide', 'visual', 'whiteboard'];
    default:
      return ['speak', 'slide'];
  }
}

function getModeLabel(step, visualMode) {
  if (step === 'whiteboard') return 'Drawing on whiteboard';
  if (step === 'slide') return 'Showing slide';
  if (step === 'visual') {
    switch (visualMode) {
      case 'flowchart':
        return 'Showing flowchart';
      case 'comparison_table':
        return 'Showing comparison';
      case 'diagram':
      case 'mixed':
        return 'Showing diagram';
      default:
        return 'Showing visual';
    }
  }
  return 'Explaining';
}

function mapTeachingStyleLabel(teachingStyle) {
  switch (teachingStyle) {
    case 'deep_explanation':
      return 'Deep explanation';
    case 'analogy_driven':
      return 'Analogy driven';
    case 'example_first':
      return 'Example first';
    case 'process_flow':
      return 'Process flow';
    case 'compare_contrast':
      return 'Compare and contrast';
    default:
      return 'Brief explanation';
  }
}

function normalizeTeachingPlan(plan = {}, chunk = {}) {
  const visualPriority = plan.visual_priority || chunk.visualMode || 'slide';
  const transitionIn = `${plan.transition_in || ''}`.trim();
  const transitionOut = `${plan.transition_out || ''}`.trim();

  return {
    concept_type: `${plan.concept_type || 'conceptual'}`.trim(),
    teaching_style: `${plan.teaching_style || 'brief_explanation'}`.trim(),
    explanation_depth: `${plan.explanation_depth || 'standard'}`.trim(),
    use_example: Boolean(plan.use_example),
    use_analogy: Boolean(plan.use_analogy),
    use_visual: Boolean(plan.use_visual),
    visual_priority: `${visualPriority || 'slide'}`.trim(),
    use_whiteboard: Boolean(plan.use_whiteboard),
    use_slide: Boolean(plan.use_slide),
    ask_checkpoint: Boolean(plan.ask_checkpoint),
    transition_in: transitionIn,
    transition_out: transitionOut,
    teacher_tone: dedupeStrings(plan.teacher_tone || ['teacher-like', 'explanatory', 'engaging']),
    likely_confusion_points: dedupeStrings(plan.likely_confusion_points || []),
    reinforcement_points: dedupeStrings(plan.reinforcement_points || []),
    recommended_duration_seconds: Number.isInteger(plan.recommended_duration_seconds)
      ? plan.recommended_duration_seconds
      : (Number.isInteger(chunk.estimatedDurationSeconds) ? chunk.estimatedDurationSeconds : 55),
    checkpoint_text: `${plan.checkpoint_text || chunk.checkpointQuestion || ''}`.trim(),
  };
}

function mergeTeachingPlan(basePlan, aiPlan, chunk) {
  if (!aiPlan || typeof aiPlan !== 'object') {
    return basePlan;
  }

  return normalizeTeachingPlan({
    ...basePlan,
    teaching_style: aiPlan.teaching_mode || aiPlan.teaching_style || basePlan.teaching_style,
    use_visual: typeof aiPlan.use_visual === 'boolean' ? aiPlan.use_visual : basePlan.use_visual,
    visual_priority: aiPlan.visual_type || aiPlan.visual_priority || basePlan.visual_priority,
    use_slide: typeof aiPlan.use_slide === 'boolean' ? aiPlan.use_slide : basePlan.use_slide,
    use_whiteboard: typeof aiPlan.use_whiteboard === 'boolean' ? aiPlan.use_whiteboard : basePlan.use_whiteboard,
    use_example: typeof aiPlan.use_example === 'boolean' ? aiPlan.use_example : basePlan.use_example,
    ask_checkpoint: typeof aiPlan.use_checkpoint === 'boolean' ? aiPlan.use_checkpoint : basePlan.ask_checkpoint,
    checkpoint_text: aiPlan.checkpoint_text || basePlan.checkpoint_text,
    transition_in: aiPlan.transition_text || aiPlan.transition_in || basePlan.transition_in,
    likely_confusion_points: aiPlan.likely_confusion_points || basePlan.likely_confusion_points,
    reinforcement_points: aiPlan.reinforcement_points || basePlan.reinforcement_points,
    teacher_tone: aiPlan.teacher_tone || basePlan.teacher_tone,
    recommended_duration_seconds: Number.isInteger(aiPlan.recommended_duration_seconds)
      ? aiPlan.recommended_duration_seconds
      : basePlan.recommended_duration_seconds
  }, chunk);
}

function buildPanelContent(chunk, visualSuggestion, plan, checkpointText) {
  return {
    learningObjective: chunk.learningObjective || chunk.summary,
    whiteboardTitle: chunk.title,
    whiteboardExplanation: chunk.whiteboardExplanation || chunk.whiteboardSuggestion || chunk.summary,
    slideTitle: chunk.title,
    slideBullets: chunk.slideBullets || [],
    keyTerms: chunk.keyTerms || [],
    examples: chunk.examples || [],
    analogy: chunk.analogyIfHelpful || '',
    checkpointQuestion: checkpointText,
    visualType: plan.visual_priority || chunk.visualMode || visualSuggestion?.visualMode || 'none',
    visualQuery: chunk.visualQuery || visualSuggestion?.visualQuery || '',
    visualCaption: chunk.visualCaption || visualSuggestion?.caption || visualSuggestion?.suggestion || '',
    visualData: chunk.visualData || visualSuggestion?.structuredData || {},
    teachingStyleLabel: mapTeachingStyleLabel(plan.teaching_style),
    transitionIn: plan.transition_in,
    transitionOut: plan.transition_out,
    teacherTone: plan.teacher_tone,
    likelyConfusionPoints: plan.likely_confusion_points,
    reinforcementPoints: plan.reinforcement_points,
  };
}

function buildCheckpointText(plan, chunk) {
  if (!plan.ask_checkpoint) {
    return '';
  }

  return `${plan.checkpoint_text || chunk.checkpointQuestion || ''}`.trim();
}

function composeNarration({ lecture, chunk, plan, previousChunk, nextChunk, checkpointText, resumeText }) {
  const parts = [];
  const transitionIn = resumeText || plan.transition_in;
  const explanation = `${chunk.spokenExplanation || chunk.chunkText || chunk.summary || lecture?.summary || ''}`.trim();
  const examples = Array.isArray(chunk.examples) ? chunk.examples.filter(Boolean) : [];
  const analogy = `${chunk.analogyIfHelpful || ''}`.trim();
  const reinforcement = Array.isArray(plan.reinforcement_points) ? plan.reinforcement_points.filter(Boolean) : [];

  if (transitionIn) {
    parts.push(transitionIn);
  } else if (previousChunk?.title) {
    parts.push(`Now let's build from ${previousChunk.title} into ${chunk.title}.`);
  }

  if (explanation) {
    parts.push(explanation);
  }

  if (plan.use_example && examples[0]) {
    parts.push(`For example, ${examples[0].replace(/^[A-Z]/, (char) => char.toLowerCase())}`);
  }

  if (plan.use_analogy && analogy) {
    parts.push(`A useful way to picture it is this: ${analogy}`);
  }

  if (reinforcement[0]) {
    parts.push(`The key takeaway is ${reinforcement[0].replace(/[.]?$/, '.')}`);
  }

  if (checkpointText) {
    parts.push(`Before we move on, think about this: ${checkpointText}`);
  } else if (nextChunk?.title && plan.transition_out) {
    parts.push(plan.transition_out);
  }

  return parts
    .map((part) => `${part || ''}`.trim())
    .filter(Boolean)
    .join(' ');
}

function shouldUseAiPlanner(plan, chunk, session) {
  if (process.env.ENABLE_TUTOR_MICRO_PLANNER !== 'true') {
    return false;
  }

  const cached = session?.teachingState?.chunkPlanCache || {};
  const cacheKey = `${chunk.id || `${chunk.sectionIndex}-${chunk.chunkIndex}`}`;
  if (cached[cacheKey]) {
    return false;
  }

  const signals = [
    plan.explanation_depth === 'deep',
    plan.likely_confusion_points.length >= 2,
    !plan.transition_in,
    !plan.transition_out,
    !plan.checkpoint_text && plan.ask_checkpoint,
  ];

  return signals.filter(Boolean).length >= 2;
}

async function getTeachingDecision({ lecture, chunk, session, visualSuggestion, previousChunk, nextChunk }) {
  const sequence = normalizeSequence(chunk.teachingSequence, chunk.visualMode);
  const currentStepIndex = session?.teachingState?.currentStepIndex || 0;
  const currentStep = sequence[Math.min(currentStepIndex, sequence.length - 1)] || 'speak';
  const cacheKey = `${chunk.id || `${chunk.sectionIndex}-${chunk.chunkIndex}`}`;
  const cachedPlan = session?.teachingState?.chunkPlanCache?.[cacheKey] || null;
  const basePlan = normalizeTeachingPlan(chunk.teachingPlan || chunk.visualData?.teachingPlan || {}, chunk);
  let finalPlan = basePlan;
  let plannerSource = chunk.teachingPlan ? 'stored_chunk_plan' : 'derived_chunk_plan';

  if (cachedPlan) {
    finalPlan = mergeTeachingPlan(basePlan, cachedPlan, chunk);
    plannerSource = 'session_cache';
  } else if (shouldUseAiPlanner(basePlan, chunk, session)) {
    try {
      const aiResponse = await openaiService.planChunkTeaching({
        lectureTitle: lecture?.title || chunk.title,
        lectureSummary: lecture?.summary || '',
        currentChunk: {
          title: chunk.title,
          summary: chunk.summary,
          learningObjective: chunk.learningObjective,
          spokenExplanation: chunk.spokenExplanation,
          examples: chunk.examples,
          analogyIfHelpful: chunk.analogyIfHelpful,
          visualMode: chunk.visualMode,
          slideBullets: chunk.slideBullets,
          checkpointQuestion: chunk.checkpointQuestion,
        },
        previousChunk: previousChunk ? {
          title: previousChunk.title,
          summary: previousChunk.summary,
        } : null,
        nextChunk: nextChunk ? {
          title: nextChunk.title,
          summary: nextChunk.summary,
        } : null,
        teachingPlanSeed: basePlan,
        resumeContext: session?.teachingState?.lastPauseReason || null
      });
      finalPlan = mergeTeachingPlan(basePlan, aiResponse.plan, chunk);
      plannerSource = 'ai_runtime';
    } catch (_) {
      plannerSource = 'derived_chunk_plan';
    }
  }

  const resumeText = session?.teachingState?.resumePending
    ? `${session?.teachingState?.resumeLeadIn || ''}`.trim()
    : '';
  const checkpointText = buildCheckpointText(finalPlan, chunk);
  const panelContent = buildPanelContent(chunk, visualSuggestion, finalPlan, checkpointText);
  const narrationText = composeNarration({
    lecture,
    chunk,
    plan: finalPlan,
    previousChunk,
    nextChunk,
    checkpointText,
    resumeText
  });

  return {
    speak_now: sequence.includes('speak'),
    show_slide: finalPlan.use_slide || sequence.includes('slide') || chunk.visualMode === 'slide' || chunk.visualMode === 'mixed',
    show_whiteboard: finalPlan.use_whiteboard || sequence.includes('whiteboard') || chunk.visualMode === 'whiteboard' || chunk.visualMode === 'mixed',
    show_visual: finalPlan.use_visual || sequence.includes('visual') || ['diagram', 'flowchart', 'comparison_table', 'mixed'].includes(panelContent.visualType),
    use_checkpoint: Boolean(checkpointText),
    use_example: finalPlan.use_example,
    use_analogy: finalPlan.use_analogy,
    visual_type: panelContent.visualType,
    visual_query: panelContent.visualQuery,
    narration_text: narrationText,
    transition_text: resumeText || finalPlan.transition_in,
    resume_text: resumeText,
    checkpoint_text: checkpointText,
    panel_content: panelContent,
    teaching_plan: finalPlan,
    teaching_style_label: mapTeachingStyleLabel(finalPlan.teaching_style),
    teaching_mode: finalPlan.teaching_style,
    teacher_tone: finalPlan.teacher_tone,
    teaching_sequence: sequence,
    current_step_index: currentStepIndex,
    current_mode: currentStep,
    current_mode_label: getModeLabel(currentStep, panelContent.visualType),
    next_action: sequence[Math.min(currentStepIndex + 1, sequence.length - 1)] || 'next_chunk',
    recommended_duration_seconds: finalPlan.recommended_duration_seconds,
    planner_source: plannerSource,
    planner_cache_key: cacheKey,
    resume_consumed: Boolean(session?.teachingState?.resumePending),
  };
}

module.exports = {
  getTeachingDecision,
};
