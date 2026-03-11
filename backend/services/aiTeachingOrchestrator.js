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

function buildPanelContent(chunk, visualSuggestion) {
  return {
    learningObjective: chunk.learningObjective || chunk.summary,
    whiteboardTitle: chunk.title,
    whiteboardExplanation: chunk.whiteboardExplanation || chunk.whiteboardSuggestion || chunk.summary,
    slideTitle: chunk.title,
    slideBullets: chunk.slideBullets || [],
    keyTerms: chunk.keyTerms || [],
    examples: chunk.examples || [],
    analogy: chunk.analogyIfHelpful || '',
    checkpointQuestion: chunk.checkpointQuestion || '',
    visualType: chunk.visualMode || visualSuggestion?.visualMode || 'none',
    visualQuery: chunk.visualQuery || visualSuggestion?.visualQuery || '',
    visualCaption: chunk.visualCaption || visualSuggestion?.caption || visualSuggestion?.suggestion || '',
    visualData: chunk.visualData || visualSuggestion?.structuredData || {},
  };
}

function getTeachingDecision({ lecture, chunk, session, visualSuggestion }) {
  const sequence = normalizeSequence(chunk.teachingSequence, chunk.visualMode);
  const currentStepIndex = session?.teachingState?.currentStepIndex || 0;
  const currentStep = sequence[Math.min(currentStepIndex, sequence.length - 1)] || 'speak';
  const panelContent = buildPanelContent(chunk, visualSuggestion);
  const narrationText = chunk.spokenExplanation || chunk.chunkText || chunk.summary || lecture?.summary || '';

  return {
    speak_now: sequence.includes('speak'),
    show_slide: sequence.includes('slide') || chunk.visualMode === 'slide' || chunk.visualMode === 'mixed',
    show_whiteboard: sequence.includes('whiteboard') || chunk.visualMode === 'whiteboard' || chunk.visualMode === 'mixed',
    show_visual: sequence.includes('visual') || ['diagram', 'flowchart', 'comparison_table', 'mixed'].includes(panelContent.visualType),
    visual_type: panelContent.visualType,
    visual_query: panelContent.visualQuery,
    narration_text: narrationText,
    panel_content: panelContent,
    teaching_sequence: sequence,
    current_step_index: currentStepIndex,
    current_mode: currentStep,
    current_mode_label: getModeLabel(currentStep, panelContent.visualType),
    next_action: sequence[Math.min(currentStepIndex + 1, sequence.length - 1)] || 'next_chunk',
  };
}

module.exports = {
  getTeachingDecision,
};
