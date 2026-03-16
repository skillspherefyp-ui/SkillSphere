const { sequelize, AILecture, AILectureSection, Topic, Course } = require('../models');

function summarizeScene(scene) {
  const actions = Array.isArray(scene?.board_actions) ? scene.board_actions : [];
  const hasDiagram = actions.some((action) => action?.type === 'draw_diagram');
  const subtitle = `${scene?.subtitle || scene?.subtitle_text || scene?.narration || ''}`.trim();

  return {
    id: scene?.id || null,
    title: scene?.title || '',
    mode: scene?.mode || '',
    actionCount: actions.length,
    hasDiagram,
    subtitle,
  };
}

async function run() {
  const lectureIdArg = Number(process.argv[2]) || null;
  const topicIdArg = Number(process.argv[3]) || null;

  try {
    const lecture = await AILecture.findOne({
      where: lectureIdArg ? { id: lectureIdArg } : topicIdArg ? { topicId: topicIdArg } : undefined,
      include: [
        { model: Topic, as: 'topic', include: [{ model: Course, as: 'course' }] },
        { model: AILectureSection, as: 'sections' },
      ],
      order: [[{ model: AILectureSection, as: 'sections' }, 'sectionIndex', 'ASC'], [{ model: AILectureSection, as: 'sections' }, 'chunkIndex', 'ASC']],
    });

    if (!lecture) {
      throw new Error('No generated lecture found for the provided lectureId/topicId');
    }

    const chunks = (lecture.sections || []).map((section) => {
      const scenes = Array.isArray(section.visualData?.scenes) ? section.visualData.scenes : [];
      const sceneSummaries = scenes.map(summarizeScene);
      const diagramSceneCount = sceneSummaries.filter((scene) => /diagram|compare/.test(scene.mode)).length;
      const flowchartIntent = /flowchart|algorithm|process|workflow|decision|steps/i.test(
        [section.title, section.learningObjective, section.whiteboardExplanation, section.visualCaption].filter(Boolean).join(' ')
      );

      return {
        sectionIndex: section.sectionIndex,
        chunkIndex: section.chunkIndex,
        title: section.title,
        visualMode: section.visualMode,
        flowchartIntent,
        sceneCount: sceneSummaries.length,
        diagramSceneCount,
        diagramScenesWithDrawAction: sceneSummaries.filter((scene) => scene.hasDiagram).length,
        weakScenes: sceneSummaries.filter((scene) => (
          (/diagram|compare/.test(scene.mode) && !scene.hasDiagram) || (scene.mode === 'diagram_mode' && scene.actionCount < 2)
        )),
      };
    });

    const summary = {
      lectureId: lecture.id,
      topicId: lecture.topicId,
      topicTitle: lecture.topic?.title || '',
      courseTitle: lecture.topic?.course?.name || '',
      chunkCount: chunks.length,
      chunksWithFlowIntent: chunks.filter((chunk) => chunk.flowchartIntent).length,
      chunksWithWeakScenes: chunks.filter((chunk) => chunk.weakScenes.length > 0).length,
    };

    console.log(JSON.stringify({ summary, chunks }, null, 2));
  } finally {
    await sequelize.close();
  }
}

run().catch((error) => {
  console.error('Lecture inspection failed:', error.message);
  process.exit(1);
});
