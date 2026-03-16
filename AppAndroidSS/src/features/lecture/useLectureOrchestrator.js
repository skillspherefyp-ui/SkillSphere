import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeLecturePlan, reduceBoardState } from './lectureSceneModel';

export const useLectureOrchestrator = ({
  lecture,
  chunk,
  runtimeState,
  lectureCompleted,
}) => {
  const plan = useMemo(() => normalizeLecturePlan({ lecture, chunk }), [lecture, chunk]);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [boardWindowIndex, setBoardWindowIndex] = useState(0);
  const [sceneStartedAt, setSceneStartedAt] = useState(Date.now());
  const timerRef = useRef(null);
  const boardWindowTimerRef = useRef(null);
  const remainingMsRef = useRef(0);
  const boardWindowRemainingMsRef = useRef(0);
  const lastTickStartedAtRef = useRef(Date.now());
  const lastBoardWindowTickStartedAtRef = useRef(Date.now());
  const isSceneAdvancing = runtimeState === 'playing';

  useEffect(() => {
    setSceneIndex(0);
    setBoardWindowIndex(0);
    setSceneStartedAt(Date.now());
    remainingMsRef.current = plan.scenes[0]?.timing?.durationMs || 0;
    lastTickStartedAtRef.current = Date.now();
  }, [plan.chunkId]);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!plan.scenes.length || lectureCompleted) {
      return undefined;
    }

    const currentScene = plan.scenes[sceneIndex];
    if (!currentScene) {
      return undefined;
    }

    const fullDurationMs = currentScene.timing.durationMs;
    if (!remainingMsRef.current || remainingMsRef.current > fullDurationMs) {
      remainingMsRef.current = fullDurationMs;
    }

    if (!isSceneAdvancing) {
      const elapsed = Date.now() - lastTickStartedAtRef.current;
      remainingMsRef.current = Math.max(0, remainingMsRef.current - Math.max(0, elapsed));
      return undefined;
    }

    if (sceneIndex >= plan.scenes.length - 1) {
      return undefined;
    }

    const durationToUse = Math.max(120, remainingMsRef.current || fullDurationMs);
    lastTickStartedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      const nextSceneIndex = Math.min(sceneIndex + 1, plan.scenes.length - 1);
      remainingMsRef.current = plan.scenes[nextSceneIndex]?.timing?.durationMs || 0;
      lastTickStartedAtRef.current = Date.now();
      setSceneIndex(nextSceneIndex);
      setSceneStartedAt(Date.now());
    }, durationToUse);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [plan, sceneIndex, isSceneAdvancing, lectureCompleted]);

  const currentScene = plan.scenes[sceneIndex] || null;
  const boardState = useMemo(() => reduceBoardState(plan.scenes, sceneIndex), [plan.scenes, sceneIndex]);
  const boardWindowCount = Math.max(1, boardState?.layout?.totalWindows || 1);

  useEffect(() => {
    setBoardWindowIndex(0);
    const currentSceneDuration = currentScene?.timing?.durationMs || 0;
    boardWindowRemainingMsRef.current = boardWindowCount > 1
      ? Math.max(1200, Math.round(currentSceneDuration / boardWindowCount))
      : 0;
    lastBoardWindowTickStartedAtRef.current = Date.now();
  }, [plan.chunkId, sceneIndex, boardWindowCount, currentScene?.id, currentScene?.timing?.durationMs]);

  useEffect(() => {
    if (boardWindowTimerRef.current) {
      clearTimeout(boardWindowTimerRef.current);
      boardWindowTimerRef.current = null;
    }

    if (!currentScene || lectureCompleted || boardWindowCount <= 1) {
      return undefined;
    }

    const maxWindowIndex = boardWindowCount - 1;
    if (!isSceneAdvancing) {
      const elapsed = Date.now() - lastBoardWindowTickStartedAtRef.current;
      boardWindowRemainingMsRef.current = Math.max(0, boardWindowRemainingMsRef.current - Math.max(0, elapsed));
      return undefined;
    }

    if (boardWindowIndex >= maxWindowIndex) {
      return undefined;
    }

    const currentSceneDuration = currentScene?.timing?.durationMs || 0;
    const fullWindowDuration = Math.max(1200, Math.round(currentSceneDuration / boardWindowCount));
    if (!boardWindowRemainingMsRef.current || boardWindowRemainingMsRef.current > fullWindowDuration) {
      boardWindowRemainingMsRef.current = fullWindowDuration;
    }

    const durationToUse = Math.max(220, boardWindowRemainingMsRef.current || fullWindowDuration);
    lastBoardWindowTickStartedAtRef.current = Date.now();
    boardWindowTimerRef.current = setTimeout(() => {
      const nextIndex = Math.min(boardWindowIndex + 1, maxWindowIndex);
      boardWindowRemainingMsRef.current = fullWindowDuration;
      lastBoardWindowTickStartedAtRef.current = Date.now();
      setBoardWindowIndex(nextIndex);
    }, durationToUse);

    return () => {
      if (boardWindowTimerRef.current) {
        clearTimeout(boardWindowTimerRef.current);
        boardWindowTimerRef.current = null;
      }
    };
  }, [boardWindowCount, boardWindowIndex, currentScene, isSceneAdvancing, lectureCompleted]);

  return {
    plan,
    currentScene,
    sceneIndex,
    sceneCount: plan.scenes.length,
    boardState,
    boardWindowIndex,
    boardWindowCount,
    subtitleText: currentScene?.subtitleText || plan.narrationText || '',
    narrationText: currentScene?.narration || plan.narrationText || '',
    whiteboardMode: currentScene?.mode || plan.whiteboardMode,
    sceneStartedAt,
    runtimeState,
    goToNextScene: () => setSceneIndex((prev) => Math.min(prev + 1, Math.max(plan.scenes.length - 1, 0))),
    resetScenes: () => {
      setSceneIndex(0);
      setBoardWindowIndex(0);
      setSceneStartedAt(Date.now());
      remainingMsRef.current = plan.scenes[0]?.timing?.durationMs || 0;
      boardWindowRemainingMsRef.current = Math.max(1200, Math.round((plan.scenes[0]?.timing?.durationMs || 0) / Math.max(1, boardWindowCount)));
      lastTickStartedAtRef.current = Date.now();
      lastBoardWindowTickStartedAtRef.current = Date.now();
    },
  };
};
