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
      return ['speak'];
  }
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

  return {
    concept_type: `${plan.concept_type || 'conceptual'}`.trim(),
    teaching_style: `${plan.teaching_style || 'brief_explanation'}`.trim(),
    explanation_depth: `${plan.explanation_depth || 'standard'}`.trim(),
    use_example: Boolean(plan.use_example),
    use_analogy: Boolean(plan.use_analogy),
    use_snippet: Boolean(plan.use_snippet),
    use_visual: Boolean(plan.use_visual),
    visual_priority: `${visualPriority || 'slide'}`.trim(),
    use_whiteboard: Boolean(plan.use_whiteboard),
    use_slide: Boolean(plan.use_slide),
    ask_checkpoint: Boolean(plan.ask_checkpoint),
    transition_in: `${plan.transition_in || ''}`.trim(),
    transition_out: `${plan.transition_out || ''}`.trim(),
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

function splitIntoTeachingNotes(text = '', fallbackItems = []) {
  const sentenceNotes = `${text || ''}`
    .split(/(?<=[.!?])\s+/)
    .map((part) => `${part || ''}`.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 4);
  if (sentenceNotes.length > 0) {
    return sentenceNotes;
  }
  return (fallbackItems || []).filter(Boolean).slice(0, 4);
}

function getSnippetData(chunk) {
  const snippetData = chunk.visualData?.snippetData || {};
  const snippet = `${snippetData.codeSnippet || ''}`.trim();
  const command = `${snippetData.commandExample || ''}`.trim();

  if (!snippet && !command) {
    return null;
  }

  return {
    codeSnippet: snippet,
    commandExample: command,
    snippetLanguage: `${snippetData.snippetLanguage || 'text'}`.trim(),
    snippetExplanation: `${snippetData.snippetExplanation || ''}`.trim(),
  };
}

function getCheckpointText(plan, chunk) {
  if (!plan.ask_checkpoint) {
    return '';
  }

  return `${plan.checkpoint_text || chunk.checkpointQuestion || ''}`.trim();
}

function getModeLabel(mode) {
  switch (mode) {
    case 'whiteboard_notes':
      return 'Whiteboard notes';
    case 'slide_summary':
      return 'Slide summary';
    case 'diagram_explainer':
      return 'Diagram explainer';
    case 'flowchart_explainer':
      return 'Flowchart explainer';
    case 'comparison_explainer':
      return 'Comparison explainer';
    case 'code_walkthrough':
      return 'Code walkthrough';
    case 'checkpoint':
      return 'Mini checkpoint';
    case 'recap':
      return 'Quick recap';
    default:
      return 'Narration only';
  }
}

function getWhiteboardMode(classroomMode) {
  switch (classroomMode) {
    case 'diagram_explainer':
    case 'flowchart_explainer':
      return 'diagram_mode';
    case 'comparison_explainer':
      return 'compare_mode';
    case 'code_walkthrough':
      return 'example_mode';
    case 'checkpoint':
    case 'recap':
      return 'summary_mode';
    default:
      return 'concept_mode';
  }
}

function resolveClassroomMode({ chunk, plan, checkpointText, snippetData }) {
  const visualType = plan.visual_priority || chunk.visualMode || 'none';
  const isTechnical = plan.concept_type === 'technical' || Boolean(snippetData);

  if (isTechnical && snippetData) return 'code_walkthrough';
  if (visualType === 'flowchart') return 'flowchart_explainer';
  if (visualType === 'comparison_table') return 'comparison_explainer';
  if (visualType === 'diagram' || visualType === 'mixed') return 'diagram_explainer';
  if (plan.concept_type === 'memorization-heavy') return checkpointText ? 'checkpoint' : 'recap';
  if (plan.use_whiteboard || plan.concept_type === 'foundational' || plan.use_analogy) return 'whiteboard_notes';
  if (plan.use_slide && Array.isArray(chunk.slideBullets) && chunk.slideBullets.length > 0) return 'slide_summary';
  if (checkpointText && plan.explanation_depth === 'concise') return 'checkpoint';
  return 'narration_only';
}

function buildBoardContent({ lecture, chunk, plan, classroomMode, snippetData, checkpointText }) {
  const whiteboardNotes = splitIntoTeachingNotes(
    chunk.whiteboardExplanation,
    [chunk.learningObjective, ...(chunk.slideBullets || []), ...(chunk.keyTerms || [])]
  );
  const visualData = chunk.visualData || {};

  switch (classroomMode) {
    case 'whiteboard_notes':
      return {
        type: 'whiteboard_notes',
        title: chunk.title,
        notes: whiteboardNotes,
        emphasis: plan.use_analogy && chunk.analogyIfHelpful ? chunk.analogyIfHelpful : '',
      };
    case 'slide_summary':
      return {
        type: 'slide_summary',
        title: chunk.title,
        bullets: (chunk.slideBullets || []).slice(0, 4),
      };
    case 'diagram_explainer':
      return {
        type: 'diagram',
        title: chunk.title,
        caption: chunk.visualCaption || '',
        nodes: Array.isArray(visualData.nodes) ? visualData.nodes.slice(0, 5) : [],
      };
    case 'flowchart_explainer':
      return {
        type: 'flowchart',
        title: chunk.title,
        steps: Array.isArray(visualData.steps) ? visualData.steps.slice(0, 6) : [],
      };
    case 'comparison_explainer':
      return {
        type: 'comparison_table',
        title: chunk.title,
        columns: visualData.columns || ['Concept', 'Teaching Note'],
        rows: Array.isArray(visualData.rows) ? visualData.rows.slice(0, 5) : [],
      };
    case 'code_walkthrough':
      return {
        type: 'code',
        title: chunk.title,
        snippetLanguage: snippetData?.snippetLanguage || 'text',
        snippet: snippetData?.codeSnippet || snippetData?.commandExample || '',
        snippetExplanation: snippetData?.snippetExplanation || chunk.learningObjective || '',
      };
    case 'checkpoint':
      return {
        type: 'checkpoint',
        title: 'Quick Check',
        question: checkpointText,
      };
    case 'recap':
      return {
        type: 'recap',
        title: chunk.title,
        bullets: (plan.reinforcement_points || []).slice(0, 3),
      };
    default:
      return {
        type: 'narration',
        title: chunk.title || lecture?.title || 'Explanation',
        notes: splitIntoTeachingNotes(chunk.learningObjective, (plan.reinforcement_points || []).slice(0, 2)),
      };
  }
}

function buildSupportPanel({ chunk, plan, classroomMode, checkpointText }) {
  if (classroomMode !== 'checkpoint' && checkpointText) {
    return {
      type: 'checkpoint',
      title: 'Mini checkpoint',
      text: checkpointText,
    };
  }

  if (plan.reinforcement_points?.[0] && classroomMode !== 'recap') {
    return {
      type: 'takeaway',
      title: 'Key takeaway',
      text: plan.reinforcement_points[0],
    };
  }

  if (plan.likely_confusion_points?.[0]) {
    return {
      type: 'watch_for_this',
      title: 'Watch for this',
      text: plan.likely_confusion_points[0],
    };
  }

  return null;
}

function buildPanelContent(chunk, visualSuggestion, plan, checkpointText, classroomMode, boardContent, supportPanel) {
  return {
    learningObjective: chunk.learningObjective || chunk.summary,
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
    checkpointQuestion: checkpointText,
    classroomMode,
    classroomModeLabel: getModeLabel(classroomMode),
    boardContent,
    supportPanel,
  };
}

function buildNarrationSegments({ chunk, plan, checkpointText, resumeText }) {
  const segments = [];

  if (resumeText || plan.transition_in) {
    segments.push(resumeText || plan.transition_in);
  }

  if (chunk.spokenExplanation) {
    segments.push(chunk.spokenExplanation);
  }

  if (plan.use_example && chunk.examples?.[0]) {
    segments.push(`For example, ${chunk.examples[0].replace(/^[A-Z]/, (char) => char.toLowerCase())}`);
  }

  if (plan.use_analogy && chunk.analogyIfHelpful) {
    segments.push(`A simple way to picture it is this: ${chunk.analogyIfHelpful}`);
  }

  if (checkpointText) {
    segments.push(`Before we move on, think about this: ${checkpointText}`);
  } else if (plan.transition_out) {
    segments.push(plan.transition_out);
  }

  return segments.map((segment) => `${segment || ''}`.trim()).filter(Boolean);
}

function composeNarration(segments) {
  return segments.join(' ');
}

function summarizeBoardAction(action = {}) {
  const payload = action.payload || {};
  switch (action.type) {
    case 'add_title':
      return payload.text || '';
    case 'add_paragraph':
      return [payload.title, payload.text].filter(Boolean).join(': ');
    case 'add_bullet_list':
      return [payload.title, ...((payload.items || []).slice(0, 4))].filter(Boolean).join(' | ');
    case 'draw_diagram':
      return payload.title || payload.diagramType || 'diagram';
    case 'show_example':
      return payload.title || payload.content || 'example';
    case 'show_equation':
      return payload.expression || 'equation';
    case 'highlight_element':
      return payload.label || payload.targetId || 'highlight';
    case 'focus_region':
      return payload.label || payload.region || 'focus';
    case 'transition':
      return payload.text || 'transition';
    default:
      return '';
  }
}

function buildVisibleBoardContext({ scenes = [], sceneIndex = 0, boardContent, supportPanel }) {
  const safeScenes = Array.isArray(scenes) ? scenes : [];
  const activeScene = safeScenes[Math.min(Math.max(sceneIndex, 0), Math.max(safeScenes.length - 1, 0))] || null;
  const visibleActions = safeScenes
    .slice(0, Math.min(sceneIndex + 1, safeScenes.length))
    .flatMap((scene) => Array.isArray(scene?.board_actions || scene?.boardActions) ? (scene.board_actions || scene.boardActions) : []);
  const visibleElements = dedupeStrings(visibleActions.map(summarizeBoardAction).filter(Boolean)).slice(0, 8);

  return {
    scene_index: sceneIndex,
    scene_title: activeScene?.title || '',
    scene_type: activeScene?.type || '',
    scene_mode: activeScene?.mode || '',
    subtitle: `${activeScene?.subtitle_text || activeScene?.subtitle || activeScene?.narration || ''}`.trim(),
    visible_elements: visibleElements,
    board_summary: boardContent?.title || '',
    board_type: boardContent?.type || 'narration',
    support_note: supportPanel?.text || '',
    diagram_context: activeScene?.diagram_instructions || activeScene?.diagram_instruction || null,
    example_context: activeScene?.example_instructions || activeScene?.example || null,
    highlight_focus: visibleActions
      .filter((action) => action.type === 'highlight_element' || action.type === 'focus_region')
      .map(summarizeBoardAction)
      .filter(Boolean)
      .slice(-3),
  };
}

function getStoredScenes(chunk, fallbackScenes) {
  const storedScenes = Array.isArray(chunk?.scenes) && chunk.scenes.length
    ? chunk.scenes
    : Array.isArray(chunk?.visualData?.scenes) && chunk.visualData.scenes.length
      ? chunk.visualData.scenes
      : [];

  return storedScenes.length > 0 ? storedScenes : fallbackScenes;
}

function buildBoardActions({ boardContent, supportPanel, checkpointText, reinforcementPoints }) {
  if (!boardContent) {
    return [];
  }

  const actions = [
    { type: 'clear_board', payload: { tone: 'clean', accent: '#dbeafe' } },
    { type: 'add_title', payload: { id: 'board-title', text: boardContent.title || 'Explanation' } },
  ];

  switch (boardContent.type) {
    case 'whiteboard_notes':
    case 'narration':
      actions.push({
        type: 'add_bullet_list',
        payload: {
          id: 'whiteboard-notes',
          title: 'Core ideas',
          items: (boardContent.notes || []).slice(0, 5),
        }
      });
      if (boardContent.emphasis) {
        actions.push({
          type: 'highlight_element',
          payload: { id: 'board-emphasis', label: boardContent.emphasis, tone: 'accent' }
        });
      }
      break;
    case 'slide_summary':
    case 'recap':
      actions.push({
        type: 'add_bullet_list',
        payload: {
          id: 'summary-list',
          title: 'Summary',
          items: (boardContent.bullets || []).slice(0, 5),
        }
      });
      break;
    case 'diagram':
      actions.push({
        type: 'draw_diagram',
        payload: {
          id: 'primary-diagram',
          title: boardContent.caption || 'Concept map',
          diagramType: 'concept_map',
          nodes: (boardContent.nodes || []).slice(0, 6),
        }
      });
      break;
    case 'flowchart':
      actions.push({
        type: 'draw_diagram',
        payload: {
          id: 'flow-diagram',
          title: boardContent.title || 'Process flow',
          diagramType: 'flowchart',
          steps: (boardContent.steps || []).slice(0, 6),
        }
      });
      break;
    case 'comparison_table':
      actions.push({
        type: 'draw_diagram',
        payload: {
          id: 'comparison-grid',
          title: boardContent.title || 'Comparison',
          diagramType: 'comparison_table',
          columns: boardContent.columns || ['Concept', 'Teaching note'],
          rows: (boardContent.rows || []).slice(0, 5),
        }
      });
      break;
    case 'code':
      actions.push({
        type: 'show_example',
        payload: {
          id: 'code-example',
          title: boardContent.title || 'Worked example',
          format: 'code',
          language: boardContent.snippetLanguage || 'text',
          content: boardContent.snippet || '',
          note: boardContent.snippetExplanation || '',
        }
      });
      break;
    case 'checkpoint':
      actions.push({
        type: 'add_paragraph',
        payload: {
          id: 'checkpoint-card',
          text: boardContent.question || checkpointText || '',
          tone: 'focus',
          role: 'checkpoint',
        }
      });
      actions.push({
        type: 'focus_region',
        payload: { region: 'checkpoint', label: 'Pause and reflect' }
      });
      break;
    default:
      actions.push({
        type: 'add_paragraph',
        payload: { id: 'board-paragraph', text: boardContent.title || 'Explanation' }
      });
      break;
  }

  if (supportPanel?.text) {
    actions.push({
      type: 'add_paragraph',
      payload: {
        id: 'support-note',
        title: supportPanel.title || 'Teacher note',
        text: supportPanel.text,
        tone: supportPanel.type === 'checkpoint' ? 'focus' : 'support',
        role: 'support',
      }
    });
  }

  if (reinforcementPoints?.[0]) {
    actions.push({
      type: 'highlight_element',
      payload: { id: 'reinforcement-highlight', label: reinforcementPoints[0], tone: 'accent' }
    });
  }

  return actions;
}

function buildLectureScenes({
  chunk,
  boardContent,
  supportPanel,
  narrationSegments,
  narrationText,
  transitionText,
  checkpointText,
  classroomMode,
  recommendedDurationSeconds,
  plan
}) {
  const totalDurationMs = Math.max(3200, (Number(recommendedDurationSeconds) || 6) * 1000);
  const whiteboardMode = getWhiteboardMode(classroomMode);
  const scenes = [];
  let cursor = 0;

  if (transitionText) {
    const durationMs = 1600;
    scenes.push({
      id: 'scene-transition',
      title: 'Transition',
      type: 'transition',
      mode: 'concept_mode',
      narration: transitionText,
      subtitle_text: transitionText,
      timing: { start_ms: cursor, duration_ms: durationMs },
      board_actions: [
        { type: 'clear_board', payload: { tone: 'clean', accent: '#dbeafe' } },
        { type: 'transition', payload: { id: 'transition-overlay', text: transitionText } }
      ],
    });
    cursor += durationMs;
  }

  const coreDurationMs = Math.max(1800, Math.round(totalDurationMs * (chunk.examples?.[0] ? 0.56 : checkpointText ? 0.68 : 0.78)));
  scenes.push({
    id: 'scene-core',
    title: boardContent?.title || chunk.title || 'Core concept',
    type: 'instruction',
    mode: whiteboardMode,
    narration: narrationSegments[1] || narrationText,
    subtitle_text: narrationSegments[1] || narrationText,
    timing: { start_ms: cursor, duration_ms: coreDurationMs },
    diagram_instructions: ['diagram_explainer', 'flowchart_explainer', 'comparison_explainer'].includes(classroomMode)
      ? {
          visual_type: boardContent?.type || plan.visual_priority,
          caption: chunk.visualCaption || boardContent?.caption || '',
        }
      : null,
    board_actions: buildBoardActions({
      boardContent,
      supportPanel,
      checkpointText,
      reinforcementPoints: plan.reinforcement_points,
    }),
  });
  cursor += coreDurationMs;

  if (plan.use_example && chunk.examples?.[0]) {
    const exampleDurationMs = Math.max(1400, Math.round(totalDurationMs * 0.2));
    scenes.push({
      id: 'scene-example',
      title: 'Worked example',
      type: 'example',
      mode: 'example_mode',
      narration: `For example, ${chunk.examples[0]}`,
      subtitle_text: `For example, ${chunk.examples[0]}`,
      timing: { start_ms: cursor, duration_ms: exampleDurationMs },
      example_instructions: {
        type: 'worked_example',
        text: chunk.examples[0],
      },
      board_actions: [
        {
          type: 'show_example',
          payload: {
            id: 'worked-example',
            title: 'Example',
            content: chunk.examples[0],
            format: 'text',
          }
        },
        {
          type: 'highlight_element',
          payload: { id: 'example-highlight', targetId: 'worked-example', label: 'Example' }
        }
      ],
    });
    cursor += exampleDurationMs;
  }

  if (checkpointText || plan.reinforcement_points?.length) {
    const summaryDurationMs = Math.max(1200, totalDurationMs - cursor);
    scenes.push({
      id: checkpointText ? 'scene-checkpoint' : 'scene-summary',
      title: checkpointText ? 'Quick check' : 'Summary',
      type: checkpointText ? 'checkpoint' : 'summary',
      mode: 'summary_mode',
      narration: checkpointText
        ? `Before we move on, ${checkpointText}`
        : `To summarize, ${(plan.reinforcement_points || []).slice(0, 3).join('. ')}`,
      subtitle_text: checkpointText || (plan.reinforcement_points || []).slice(0, 3).join(' • '),
      timing: { start_ms: cursor, duration_ms: summaryDurationMs },
      board_actions: checkpointText
        ? [
            {
              type: 'add_paragraph',
              payload: { id: 'checkpoint-summary', text: checkpointText, tone: 'focus', role: 'checkpoint' }
            },
            {
              type: 'focus_region',
              payload: { region: 'summary', label: 'Student response time' }
            }
          ]
        : [
            {
              type: 'add_bullet_list',
              payload: {
                id: 'summary-points',
                title: 'Key takeaways',
                items: (plan.reinforcement_points || []).slice(0, 3),
              }
            },
            {
              type: 'highlight_element',
              payload: { id: 'summary-highlight', label: plan.reinforcement_points?.[0] || 'Key takeaway' }
            }
          ],
    });
  }

  return scenes;
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

function buildPlannerTutorContext({ chunk, session, plan }) {
  const storedScenes = Array.isArray(chunk?.scenes) && chunk.scenes.length
    ? chunk.scenes
    : Array.isArray(chunk?.visualData?.scenes) ? chunk.visualData.scenes : [];
  const sceneIndex = Number.isInteger(session?.teachingState?.currentStepIndex) ? session.teachingState.currentStepIndex : 0;
  const currentScene = storedScenes[Math.min(sceneIndex, Math.max(storedScenes.length - 1, 0))] || null;

  return {
    current_scene: currentScene ? {
      title: currentScene.title || '',
      type: currentScene.type || '',
      mode: currentScene.mode || '',
      subtitle: currentScene.subtitle || currentScene.subtitle_text || '',
    } : null,
    visible_whiteboard: {
      title: chunk?.title || '',
      whiteboard_explanation: chunk?.whiteboardExplanation || '',
      bullets: (chunk?.slideBullets || []).slice(0, 5),
      examples: (chunk?.examples || []).slice(0, 2),
      visual_mode: chunk?.visualMode || plan.visual_priority || 'none',
      checkpoint: chunk?.checkpointQuestion || '',
    },
    current_highlight: currentScene?.board_actions
      ?.filter((action) => action.type === 'highlight_element' || action.type === 'focus_region')
      .map(summarizeBoardAction)
      .filter(Boolean)
      .slice(-2) || [],
  };
}

async function getTeachingDecision({ lecture, chunk, session, visualSuggestion, previousChunk, nextChunk }) {
  const sequence = normalizeSequence(chunk.teachingSequence, chunk.visualMode);
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
        tutorContext: buildPlannerTutorContext({ chunk, session, plan: basePlan }),
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
  const checkpointText = getCheckpointText(finalPlan, chunk);
  const snippetData = getSnippetData(chunk);
  const classroomMode = resolveClassroomMode({
    chunk,
    plan: finalPlan,
    checkpointText,
    snippetData
  });
  const boardContent = buildBoardContent({
    lecture,
    chunk,
    plan: finalPlan,
    classroomMode,
    snippetData,
    checkpointText
  });
  const supportPanel = buildSupportPanel({
    chunk,
    plan: finalPlan,
    classroomMode,
    checkpointText
  });
  const panelContent = buildPanelContent(
    chunk,
    visualSuggestion,
    finalPlan,
    checkpointText,
    classroomMode,
    boardContent,
    supportPanel
  );
  const narrationSegments = buildNarrationSegments({
    chunk,
    plan: finalPlan,
    checkpointText,
    resumeText
  });
  const narrationText = composeNarration(narrationSegments);
  const generatedScenes = buildLectureScenes({
    chunk,
    boardContent,
    supportPanel,
    narrationSegments,
    narrationText,
    transitionText: resumeText || finalPlan.transition_in,
    checkpointText,
    classroomMode,
    recommendedDurationSeconds: finalPlan.recommended_duration_seconds,
    plan: finalPlan,
  });
  const scenes = getStoredScenes(chunk, generatedScenes);
  const currentStepIndex = Number.isInteger(session?.teachingState?.currentStepIndex)
    ? Math.max(0, Math.min(session.teachingState.currentStepIndex, Math.max(scenes.length - 1, 0)))
    : 0;
  const visibleBoardContext = buildVisibleBoardContext({
    scenes,
    sceneIndex: currentStepIndex,
    boardContent,
    supportPanel,
  });
  const primaryNarration = scenes.map((scene) => `${scene?.narration || ''}`.trim()).filter(Boolean).join(' ') || narrationText;

  return {
    speak_now: true,
    show_slide: classroomMode === 'slide_summary',
    show_whiteboard: classroomMode === 'whiteboard_notes',
    show_visual: ['diagram_explainer', 'flowchart_explainer', 'comparison_explainer'].includes(classroomMode),
    use_checkpoint: Boolean(checkpointText),
    use_example: finalPlan.use_example,
    use_analogy: finalPlan.use_analogy,
    visual_type: panelContent.visualType,
    visual_query: panelContent.visualQuery,
    narration_text: primaryNarration,
    narration_segments: narrationSegments,
    transition_text: resumeText || finalPlan.transition_in,
    resume_text: resumeText,
    checkpoint_text: checkpointText,
    panel_content: panelContent,
    teaching_plan: finalPlan,
    teaching_style_label: mapTeachingStyleLabel(finalPlan.teaching_style),
    teaching_mode: finalPlan.teaching_style,
    classroom_mode: classroomMode,
    classroom_mode_label: getModeLabel(classroomMode),
    board_content: boardContent,
    support_panel: supportPanel,
    teacher_tone: finalPlan.teacher_tone,
    teaching_sequence: sequence,
    current_step_index: currentStepIndex,
    current_scene: scenes[currentStepIndex] || null,
    visible_board_context: visibleBoardContext,
    current_mode: classroomMode,
    current_mode_label: getModeLabel(classroomMode),
    whiteboard_mode: getWhiteboardMode(classroomMode),
    scenes,
    orchestration: {
      version: 'v2',
      whiteboard_mode: getWhiteboardMode(classroomMode),
      scenes,
      interruptPolicy: {
        pauseOnRaiseHand: true,
        pauseOnQuestionPanel: true,
        resumeFromCurrentScene: true,
      },
    },
    next_action: nextChunk?.title ? `Prepare next chunk: ${nextChunk.title}` : 'next_chunk',
    recommended_duration_seconds: finalPlan.recommended_duration_seconds,
    planner_source: plannerSource,
    planner_cache_key: cacheKey,
    resume_consumed: Boolean(session?.teachingState?.resumePending),
  };
}

module.exports = {
  getTeachingDecision,
};
