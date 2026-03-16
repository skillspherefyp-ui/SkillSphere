function cleanText(value) {
  return `${value || ''}`.replace(/\s+/g, ' ').trim();
}

function dedupeStrings(values = []) {
  return Array.from(new Set((values || []).map(cleanText).filter(Boolean)));
}

function splitSentences(text = '') {
  return cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .map(cleanText)
    .filter(Boolean);
}

function toStepLabel(value, fallbackIndex) {
  const normalized = cleanText(value).replace(/^[\-\d.)\s]+/, '');
  return normalized || `Step ${fallbackIndex + 1}`;
}

function inferFlowchartSteps({
  title = '',
  learningObjective = '',
  whiteboardExplanation = '',
  slideBullets = [],
  examples = [],
}) {
  const bulletSteps = dedupeStrings(slideBullets).map((bullet, index) => ({
    id: `step-${index + 1}`,
    label: toStepLabel(bullet, index),
  }));

  if (bulletSteps.length >= 3) {
    return bulletSteps.slice(0, 6);
  }

  const sourceSentences = dedupeStrings([
    learningObjective,
    ...splitSentences(whiteboardExplanation),
    ...examples,
  ]);

  const inferred = sourceSentences.map((sentence, index) => ({
    id: `step-${index + 1}`,
    label: toStepLabel(sentence, index),
  }));

  if (inferred.length >= 3) {
    return inferred.slice(0, 6);
  }

  const titleText = cleanText(title);
  return [
    { id: 'step-1', label: `Start ${titleText || 'the process'}` },
    { id: 'step-2', label: cleanText(learningObjective) || 'Apply the key rule' },
    { id: 'step-3', label: cleanText(examples[0]) || 'Check the result' },
    { id: 'step-4', label: 'Return the final answer' },
  ].filter((step) => cleanText(step.label));
}

function inferConceptNodes({
  title = '',
  learningObjective = '',
  whiteboardExplanation = '',
  slideBullets = [],
  examples = [],
  analogyIfHelpful = '',
}) {
  const bullets = dedupeStrings(slideBullets);
  const nodes = bullets.map((bullet, index) => ({
    id: `node-${index + 1}`,
    label: bullet,
  }));

  if (nodes.length >= 3) {
    return nodes.slice(0, 6);
  }

  const fallback = dedupeStrings([
    title,
    learningObjective,
    ...splitSentences(whiteboardExplanation).slice(0, 3),
    examples[0],
    analogyIfHelpful,
  ]);

  return fallback.map((value, index) => ({
    id: `node-${index + 1}`,
    label: value,
  })).slice(0, 6);
}

function inferComparisonRows({
  slideBullets = [],
  examples = [],
  learningObjective = '',
}) {
  const bullets = dedupeStrings(slideBullets);
  if (bullets.length) {
    return bullets.slice(0, 5).map((bullet, index) => {
      const [left, ...rest] = bullet.split(':');
      return {
        left: cleanText(left) || `Item ${index + 1}`,
        right: cleanText(rest.join(':')) || cleanText(examples[index]) || cleanText(learningObjective),
      };
    });
  }

  const sample = dedupeStrings(examples).slice(0, 3);
  return sample.map((example, index) => ({
    left: `Case ${index + 1}`,
    right: example,
  }));
}

function buildVisualData({
  visualMode = 'slide',
  title = '',
  learningObjective = '',
  whiteboardExplanation = '',
  slideBullets = [],
  examples = [],
  analogyIfHelpful = '',
  visualCaption = '',
}) {
  const mode = cleanText(visualMode) || 'slide';

  if (mode === 'flowchart') {
    return {
      steps: inferFlowchartSteps({ title, learningObjective, whiteboardExplanation, slideBullets, examples }),
    };
  }

  if (mode === 'comparison_table') {
    return {
      columns: ['Concept', 'Teaching note'],
      rows: inferComparisonRows({ slideBullets, examples, learningObjective }),
    };
  }

  if (mode === 'diagram' || mode === 'mixed') {
    return {
      nodes: inferConceptNodes({ title, learningObjective, whiteboardExplanation, slideBullets, examples, analogyIfHelpful }),
      caption: cleanText(visualCaption) || cleanText(learningObjective) || cleanText(title),
    };
  }

  return {
    bullets: dedupeStrings(slideBullets).slice(0, 5),
  };
}

function ensureDiagramBoardAction({
  scene,
  chunk,
  boardTitle,
}) {
  const boardActions = Array.isArray(scene?.board_actions || scene?.boardActions)
    ? [...(scene.board_actions || scene.boardActions)]
    : [];
  const hasDiagram = boardActions.some((action) => action?.type === 'draw_diagram');
  if (hasDiagram) {
    return boardActions;
  }

  const diagramInstruction = scene?.diagram_instruction || scene?.diagram_instructions || null;
  const example = scene?.example || scene?.example_instructions || null;
  const mode = cleanText(scene?.mode);
  const visualMode = cleanText(chunk?.visualMode || chunk?.visual_mode);
  const desiredMode = mode === 'diagram_mode'
    ? (cleanText(diagramInstruction?.type) || visualMode || 'diagram')
    : mode === 'compare_mode'
      ? 'comparison_table'
      : mode === 'example_mode'
        ? 'example'
        : '';

  if (desiredMode === 'example' && example?.content) {
    return boardActions.concat([
      {
        type: 'show_example',
        payload: {
          id: 'auto-example',
          title: cleanText(example.title) || 'Example',
          content: cleanText(example.content || example.text),
          format: cleanText(example.format) || 'text',
        },
      },
    ]);
  }

  if (!['diagram', 'flowchart', 'comparison_table', 'mixed'].includes(desiredMode)) {
    return boardActions;
  }

  const visualData = diagramInstruction?.data && typeof diagramInstruction.data === 'object'
    ? diagramInstruction.data
    : buildVisualData({
        visualMode: desiredMode,
        title: chunk?.title || boardTitle,
        learningObjective: chunk?.learningObjective || '',
        whiteboardExplanation: chunk?.whiteboardExplanation || '',
        slideBullets: chunk?.slideBullets || [],
        examples: chunk?.examples || [],
        analogyIfHelpful: chunk?.analogyIfHelpful || '',
        visualCaption: chunk?.visualCaption || '',
      });

  if (desiredMode === 'flowchart') {
    return boardActions.concat([
      {
        type: 'draw_diagram',
        payload: {
          id: 'auto-flow-diagram',
          title: boardTitle || chunk?.title || 'Process flow',
          diagramType: 'flowchart',
          steps: Array.isArray(visualData.steps) ? visualData.steps.slice(0, 6) : [],
        },
      },
    ]);
  }

  if (desiredMode === 'comparison_table') {
    return boardActions.concat([
      {
        type: 'draw_diagram',
        payload: {
          id: 'auto-comparison-diagram',
          title: boardTitle || chunk?.title || 'Comparison',
          diagramType: 'comparison_table',
          columns: visualData.columns || ['Concept', 'Teaching note'],
          rows: Array.isArray(visualData.rows) ? visualData.rows.slice(0, 5) : [],
        },
      },
    ]);
  }

  return boardActions.concat([
    {
      type: 'draw_diagram',
      payload: {
        id: 'auto-concept-diagram',
        title: cleanText(diagramInstruction?.prompt) || boardTitle || chunk?.title || 'Concept map',
        diagramType: 'concept_map',
        nodes: Array.isArray(visualData.nodes) ? visualData.nodes.slice(0, 6) : [],
        caption: cleanText(visualData.caption) || cleanText(chunk?.visualCaption),
      },
    },
  ]);
}

module.exports = {
  cleanText,
  dedupeStrings,
  buildVisualData,
  ensureDiagramBoardAction,
  inferFlowchartSteps,
  inferConceptNodes,
  inferComparisonRows,
};
