export const BOARD_ACTION_TYPES = {
  CLEAR_BOARD: 'clear_board',
  ADD_TITLE: 'add_title',
  ADD_PARAGRAPH: 'add_paragraph',
  ADD_BULLET_LIST: 'add_bullet_list',
  DRAW_DIAGRAM: 'draw_diagram',
  SHOW_EQUATION: 'show_equation',
  SHOW_EXAMPLE: 'show_example',
  HIGHLIGHT_ELEMENT: 'highlight_element',
  ANIMATE_ELEMENT: 'animate_element',
  REMOVE_ELEMENT: 'remove_element',
  FOCUS_REGION: 'focus_region',
  TRANSITION: 'transition',
};

export const WHITEBOARD_MODES = {
  CONCEPT: 'concept_mode',
  DIAGRAM: 'diagram_mode',
  EXAMPLE: 'example_mode',
  COMPARE: 'compare_mode',
  SUMMARY: 'summary_mode',
};

const ensureArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const slugify = (value, fallback) => {
  const next = `${value || fallback || ''}`.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return next || fallback || 'item';
};

const cloneLayer = (items = []) => items.map((item) => ({ ...item }));

export const createEmptyBoardState = () => ({
  mode: WHITEBOARD_MODES.CONCEPT,
  focusRegion: null,
  layers: {
    background: { tone: 'clean', accent: '#dbeafe' },
    static: [],
    dynamic: [],
    diagram: [],
    highlight: [],
    transition: [],
  },
});

const pushElement = (items, element) => {
  const id = element.id || slugify(element.text || element.title || element.label || element.kind, `${element.kind}-${items.length}`);
  return [...items.filter((item) => item.id !== id), { ...element, id }];
};

const removeElementFromLayers = (layers, elementId) => ({
  ...layers,
  static: layers.static.filter((item) => item.id !== elementId),
  dynamic: layers.dynamic.filter((item) => item.id !== elementId),
  diagram: layers.diagram.filter((item) => item.id !== elementId),
  highlight: layers.highlight.filter((item) => item.id !== elementId),
});

const normalizeAction = (action, index) => {
  if (!action || typeof action !== 'object') {
    return null;
  }
  const type = `${action.type || ''}`.trim().toLowerCase();
  if (!type) {
    return null;
  }
  return {
    id: action.id || `${type}-${index}`,
    type,
    payload: action.payload && typeof action.payload === 'object' ? action.payload : {},
  };
};

const normalizeScene = (scene, index, recommendedDurationMs) => {
  const mode = scene?.mode || WHITEBOARD_MODES.CONCEPT;
  const durationMs = Math.max(
    1200,
    Number(scene?.timing?.duration_ms || scene?.durationMs || 0)
      || Math.round(Math.max(1800, recommendedDurationMs / Math.max(1, (scene?.sceneCountHint || 3))))
  );

  return {
    id: scene?.id || `scene-${index + 1}`,
    title: scene?.title || `Scene ${index + 1}`,
    type: scene?.type || 'teaching_scene',
    mode,
    narration: `${scene?.narration || ''}`.trim(),
    subtitleText: `${scene?.subtitle_text || scene?.subtitleText || scene?.narration || ''}`.trim(),
    timing: {
      durationMs,
      startMs: Number(scene?.timing?.start_ms || scene?.timing?.startMs || 0) || 0,
    },
    diagramInstructions: scene?.diagram_instructions || scene?.diagramInstructions || null,
    exampleInstructions: scene?.example_instructions || scene?.exampleInstructions || null,
    boardActions: ensureArray(scene?.board_actions || scene?.boardActions).map(normalizeAction).filter(Boolean),
  };
};

const boardActionsFromBoardContent = (boardContent, supportPanel) => {
  if (!boardContent) {
    return [];
  }

  const titleId = slugify(boardContent.title, 'board-title');
  const actions = [
    { type: BOARD_ACTION_TYPES.CLEAR_BOARD },
    { type: BOARD_ACTION_TYPES.ADD_TITLE, payload: { id: titleId, text: boardContent.title || 'Explanation' } },
  ];

  switch (boardContent.type) {
    case 'whiteboard_notes':
    case 'narration':
      actions.push({
        type: BOARD_ACTION_TYPES.ADD_BULLET_LIST,
        payload: { id: 'core-notes', title: 'Core ideas', items: ensureArray(boardContent.notes).slice(0, 5) },
      });
      if (boardContent.emphasis) {
        actions.push({
          type: BOARD_ACTION_TYPES.HIGHLIGHT_ELEMENT,
          payload: { id: 'emphasis-note', label: boardContent.emphasis, tone: 'accent' },
        });
      }
      break;
    case 'slide_summary':
    case 'recap':
      actions.push({
        type: BOARD_ACTION_TYPES.ADD_BULLET_LIST,
        payload: { id: 'summary-list', title: 'Summary', items: ensureArray(boardContent.bullets).slice(0, 5) },
      });
      break;
    case 'diagram':
      actions.push({
        type: BOARD_ACTION_TYPES.DRAW_DIAGRAM,
        payload: {
          id: 'main-diagram',
          title: boardContent.caption || 'Concept map',
          diagramType: 'concept_map',
          nodes: ensureArray(boardContent.nodes).slice(0, 6),
        },
      });
      break;
    case 'flowchart':
      actions.push({
        type: BOARD_ACTION_TYPES.DRAW_DIAGRAM,
        payload: {
          id: 'flow-diagram',
          title: 'Process flow',
          diagramType: 'flowchart',
          steps: ensureArray(boardContent.steps).slice(0, 6),
        },
      });
      break;
    case 'comparison_table':
      actions.push({
        type: BOARD_ACTION_TYPES.DRAW_DIAGRAM,
        payload: {
          id: 'comparison-grid',
          title: boardContent.title || 'Comparison',
          diagramType: 'comparison_table',
          columns: ensureArray(boardContent.columns).slice(0, 3),
          rows: ensureArray(boardContent.rows).slice(0, 5),
        },
      });
      break;
    case 'code':
      actions.push({
        type: BOARD_ACTION_TYPES.SHOW_EXAMPLE,
        payload: {
          id: 'code-example',
          title: boardContent.title || 'Worked example',
          format: 'code',
          language: boardContent.snippetLanguage || 'text',
          content: boardContent.snippet || '',
          note: boardContent.snippetExplanation || '',
        },
      });
      break;
    case 'checkpoint':
      actions.push({
        type: BOARD_ACTION_TYPES.ADD_PARAGRAPH,
        payload: { id: 'checkpoint-question', text: boardContent.question || '', tone: 'focus', role: 'checkpoint' },
      });
      actions.push({
        type: BOARD_ACTION_TYPES.FOCUS_REGION,
        payload: { region: 'checkpoint', label: 'Pause and answer this prompt' },
      });
      break;
    default:
      actions.push({
        type: BOARD_ACTION_TYPES.ADD_PARAGRAPH,
        payload: { id: 'general-note', text: boardContent.title || 'Explanation', tone: 'neutral' },
      });
      break;
  }

  if (supportPanel?.text) {
    actions.push({
      type: BOARD_ACTION_TYPES.ADD_PARAGRAPH,
      payload: {
        id: 'support-panel',
        title: supportPanel.title || 'Teacher note',
        text: supportPanel.text,
        tone: supportPanel.type === 'checkpoint' ? 'focus' : 'support',
        role: 'support',
      },
    });
  }

  return actions;
};

const buildFallbackScenes = ({ chunk, delivery, recommendedDurationMs }) => {
  const panelContent = delivery?.panel_content || {};
  const boardContent = delivery?.board_content || panelContent.boardContent || null;
  const supportPanel = delivery?.support_panel || panelContent.supportPanel || null;
  const transitionText = `${delivery?.transition_text || panelContent.transitionIn || ''}`.trim();
  const narrationText = `${delivery?.narration_text || chunk?.spokenExplanation || chunk?.text || ''}`.trim();
  const checkpointText = `${delivery?.checkpoint_text || panelContent.checkpointQuestion || chunk?.checkpointQuestion || ''}`.trim();
  const exampleText = ensureArray(chunk?.examples)[0] || '';
  const reinforcement = ensureArray(panelContent.reinforcementPoints || delivery?.teaching_plan?.reinforcement_points).slice(0, 3);
  const baseActions = boardActionsFromBoardContent(boardContent, supportPanel);
  const scenes = [];

  if (transitionText) {
    scenes.push({
      id: 'scene-transition',
      title: 'Transition',
      type: 'transition',
      mode: WHITEBOARD_MODES.CONCEPT,
      narration: transitionText,
      subtitleText: transitionText,
      timing: { durationMs: 1600 },
      boardActions: [
        { type: BOARD_ACTION_TYPES.CLEAR_BOARD },
        { type: BOARD_ACTION_TYPES.TRANSITION, payload: { text: transitionText } },
      ],
    });
  }

  if (narrationText || baseActions.length) {
    scenes.push({
      id: 'scene-core',
      title: boardContent?.title || chunk?.title || 'Core concept',
      type: 'instruction',
      mode: mapBoardTypeToMode(boardContent?.type),
      narration: narrationText,
      subtitleText: narrationText,
      timing: { durationMs: Math.round(recommendedDurationMs * (exampleText ? 0.58 : checkpointText || reinforcement.length ? 0.68 : 0.8)) },
      boardActions: baseActions,
    });
  }

  if (exampleText) {
    scenes.push({
      id: 'scene-example',
      title: 'Worked example',
      type: 'example',
      mode: WHITEBOARD_MODES.EXAMPLE,
      narration: `For example, ${exampleText}`,
      subtitleText: `For example, ${exampleText}`,
      timing: { durationMs: Math.round(recommendedDurationMs * 0.22) },
      exampleInstructions: { text: exampleText },
      boardActions: [
        {
          type: BOARD_ACTION_TYPES.SHOW_EXAMPLE,
          payload: { id: 'worked-example', title: 'Example', content: exampleText, format: 'text' },
        },
        {
          type: BOARD_ACTION_TYPES.HIGHLIGHT_ELEMENT,
          payload: { id: 'worked-example-highlight', targetId: 'worked-example', label: 'Example' },
        },
      ],
    });
  }

  if (checkpointText || reinforcement.length) {
    const summaryText = checkpointText || `Key takeaway: ${reinforcement[0]}`;
    scenes.push({
      id: 'scene-summary',
      title: checkpointText ? 'Quick check' : 'Summary',
      type: checkpointText ? 'checkpoint' : 'summary',
      mode: checkpointText ? WHITEBOARD_MODES.SUMMARY : WHITEBOARD_MODES.SUMMARY,
      narration: checkpointText ? `Before we move on, ${checkpointText}` : `To summarize, ${reinforcement.join('. ')}`,
      subtitleText: summaryText,
      timing: { durationMs: Math.round(recommendedDurationMs * (checkpointText ? 0.18 : 0.14)) },
      boardActions: checkpointText
        ? [
            {
              type: BOARD_ACTION_TYPES.ADD_PARAGRAPH,
              payload: { id: 'summary-question', text: checkpointText, tone: 'focus', role: 'checkpoint' },
            },
            {
              type: BOARD_ACTION_TYPES.FOCUS_REGION,
              payload: { region: 'summary', label: 'Pause and respond' },
            },
          ]
        : [
            {
              type: BOARD_ACTION_TYPES.ADD_BULLET_LIST,
              payload: { id: 'summary-points', title: 'Key takeaways', items: reinforcement },
            },
            {
              type: BOARD_ACTION_TYPES.HIGHLIGHT_ELEMENT,
              payload: { id: 'summary-highlight', label: reinforcement[0] || 'Key takeaway' },
            },
          ],
    });
  }

  return scenes.filter((scene) => scene.narration || scene.boardActions?.length);
};

function mapBoardTypeToMode(type) {
  switch (`${type || ''}`.trim()) {
    case 'diagram':
    case 'flowchart':
      return WHITEBOARD_MODES.DIAGRAM;
    case 'comparison_table':
      return WHITEBOARD_MODES.COMPARE;
    case 'code':
      return WHITEBOARD_MODES.EXAMPLE;
    case 'recap':
    case 'checkpoint':
      return WHITEBOARD_MODES.SUMMARY;
    default:
      return WHITEBOARD_MODES.CONCEPT;
  }
}

export const normalizeLecturePlan = ({ lecture, chunk }) => {
  const delivery = chunk?.delivery || {};
  const recommendedDurationMs = Math.max(
    3200,
    (Number(delivery?.recommended_duration_seconds || chunk?.estimatedDurationSeconds || 0) || 0) * 1000 || 6400
  );
  const rawScenes = ensureArray(delivery?.scenes || delivery?.orchestration?.scenes);
  const scenes = (rawScenes.length ? rawScenes : buildFallbackScenes({ chunk, delivery, recommendedDurationMs }))
    .map((scene, index, list) => normalizeScene({ ...scene, sceneCountHint: list.length }, index, recommendedDurationMs))
    .filter((scene) => scene.narration || scene.boardActions.length);

  return {
    lectureId: lecture?.id || null,
    chunkId: chunk?.id || null,
    title: chunk?.title || lecture?.title || 'AI Lecture',
    lectureTitle: lecture?.title || '',
    objectiveText: delivery?.panel_content?.learningObjective || chunk?.learningObjective || chunk?.summary || '',
    narrationText: `${delivery?.narration_text || chunk?.spokenExplanation || chunk?.text || ''}`.trim(),
    whiteboardMode: delivery?.whiteboard_mode || scenes[0]?.mode || WHITEBOARD_MODES.CONCEPT,
    recommendedDurationMs,
    interruptPolicy: delivery?.orchestration?.interruptPolicy || {
      pauseOnRaiseHand: true,
      pauseOnQuestionPanel: true,
      resumeFromCurrentScene: true,
    },
    scenes,
  };
};

const applyBoardAction = (state, action) => {
  if (!action) {
    return state;
  }

  const next = {
    ...state,
    layers: {
      background: { ...state.layers.background },
      static: cloneLayer(state.layers.static),
      dynamic: cloneLayer(state.layers.dynamic),
      diagram: cloneLayer(state.layers.diagram),
      highlight: cloneLayer(state.layers.highlight),
      transition: cloneLayer(state.layers.transition),
    },
  };

  const payload = action.payload || {};

  switch (action.type) {
    case BOARD_ACTION_TYPES.CLEAR_BOARD:
      return {
        ...createEmptyBoardState(),
        mode: state.mode,
        layers: {
          ...createEmptyBoardState().layers,
          background: {
            ...createEmptyBoardState().layers.background,
            accent: payload.accent || next.layers.background.accent,
            tone: payload.tone || next.layers.background.tone,
          },
        },
      };
    case BOARD_ACTION_TYPES.ADD_TITLE:
      next.layers.static = pushElement(next.layers.static, {
        kind: 'title',
        id: payload.id,
        text: payload.text,
      });
      return next;
    case BOARD_ACTION_TYPES.ADD_PARAGRAPH:
      next.layers.dynamic = pushElement(next.layers.dynamic, {
        kind: 'paragraph',
        id: payload.id,
        title: payload.title,
        text: payload.text,
        tone: payload.tone || 'neutral',
        role: payload.role || 'body',
      });
      return next;
    case BOARD_ACTION_TYPES.ADD_BULLET_LIST:
      next.layers.dynamic = pushElement(next.layers.dynamic, {
        kind: 'bullet_list',
        id: payload.id,
        title: payload.title,
        items: ensureArray(payload.items).slice(0, 6),
      });
      return next;
    case BOARD_ACTION_TYPES.DRAW_DIAGRAM:
      next.layers.diagram = pushElement(next.layers.diagram, {
        kind: 'diagram',
        id: payload.id,
        title: payload.title,
        diagramType: payload.diagramType || 'concept_map',
        nodes: ensureArray(payload.nodes),
        steps: ensureArray(payload.steps),
        rows: ensureArray(payload.rows),
        columns: ensureArray(payload.columns),
        caption: payload.caption || '',
      });
      return next;
    case BOARD_ACTION_TYPES.SHOW_EQUATION:
      next.layers.dynamic = pushElement(next.layers.dynamic, {
        kind: 'equation',
        id: payload.id,
        expression: payload.expression,
        note: payload.note || '',
      });
      return next;
    case BOARD_ACTION_TYPES.SHOW_EXAMPLE:
      next.layers.dynamic = pushElement(next.layers.dynamic, {
        kind: 'example',
        id: payload.id,
        title: payload.title,
        format: payload.format || 'text',
        content: payload.content || '',
        language: payload.language || 'text',
        note: payload.note || '',
      });
      return next;
    case BOARD_ACTION_TYPES.HIGHLIGHT_ELEMENT:
      next.layers.highlight = pushElement(next.layers.highlight, {
        kind: 'highlight',
        id: payload.id,
        targetId: payload.targetId || null,
        label: payload.label || '',
        tone: payload.tone || 'accent',
      });
      return next;
    case BOARD_ACTION_TYPES.ANIMATE_ELEMENT:
      next.layers.highlight = pushElement(next.layers.highlight, {
        kind: 'animation',
        id: payload.id,
        targetId: payload.targetId || null,
        label: payload.label || 'Teaching focus',
        animation: payload.animation || 'pulse',
      });
      return next;
    case BOARD_ACTION_TYPES.REMOVE_ELEMENT:
      next.layers = removeElementFromLayers(next.layers, payload.id);
      return next;
    case BOARD_ACTION_TYPES.FOCUS_REGION:
      next.focusRegion = payload.region || null;
      next.layers.highlight = pushElement(next.layers.highlight, {
        kind: 'focus_region',
        id: payload.id || `focus-${payload.region || 'board'}`,
        region: payload.region || 'board',
        label: payload.label || '',
      });
      return next;
    case BOARD_ACTION_TYPES.TRANSITION:
      next.layers.transition = pushElement(next.layers.transition, {
        kind: 'transition',
        id: payload.id,
        text: payload.text || '',
      });
      return next;
    default:
      return next;
  }
};

export const reduceBoardState = (scenes, sceneIndex) => {
  const safeScenes = ensureArray(scenes);
  return safeScenes.slice(0, sceneIndex + 1).reduce((boardState, scene) => {
    const nextState = scene.boardActions.reduce(applyBoardAction, boardState);
    nextState.mode = scene.mode || nextState.mode;
    return nextState;
  }, createEmptyBoardState());
};
