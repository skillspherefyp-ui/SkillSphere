import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated as RNAnimated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import MainLayout from '../../components/ui/MainLayout';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { aiTutorAPI, API_BASE } from '../../services/apiClient';
import WhiteboardStage from '../../features/lecture/WhiteboardStage';
import { useLectureOrchestrator } from '../../features/lecture/useLectureOrchestrator';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const PANEL_KEYS = { CHAT: 'chat', NOTES: 'notes', FLASHCARDS: 'flashcards', TOPICS: 'topics' };
const RUNTIME_STATES = { IDLE: 'idle', PLAYING: 'playing', PAUSED: 'paused', STUDENT_INTERRUPT: 'student_interrupt', RESUMING: 'resuming', ENDED: 'ended' };
const MAX_CHUNK_GAP_MS = 180;
const ERROR_CHUNK_GAP_MS = 850;
const AUDIO_PREFETCH_TIMEOUT_MS = 900;
const SILENT_INTERRUPT_RESUME_MS = 5000;

const AILearningScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { width, height } = useWindowDimensions();
  const { courseId, topicId } = route.params || {};
  const { courses, checkEnrollment, fetchCourses } = useData();
  const safeCourses = Array.isArray(courses) ? courses : [];
  const course = safeCourses.find((item) => item.id === courseId);
  const topic = course?.topics?.find((item) => item.id === topicId);

  const [loading, setLoading] = useState(true);
  const [catalogReady, setCatalogReady] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [lecture, setLecture] = useState(null);
  const [session, setSession] = useState(null);
  const [currentChunk, setCurrentChunk] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [lectureNotes, setLectureNotes] = useState('');
  const [activePanel, setActivePanel] = useState(null);
  const [runtimeState, setRuntimeState] = useState(RUNTIME_STATES.IDLE);
  const [voiceMode, setVoiceMode] = useState(Platform.OS === 'web');
  const [isRecording, setIsRecording] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [lectureCompleted, setLectureCompleted] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [revealedFlashcards, setRevealedFlashcards] = useState({});
  const [raisedHandPulse] = useState(new RNAnimated.Value(1));

  const recognitionRef = useRef(null);
  const playbackRef = useRef(null);
  const audioRef = useRef(null);
  const interruptAudioRef = useRef(null);
  const pausedPlaybackRef = useRef(null);
  const audioAssetCacheRef = useRef(new Map());
  const interruptResumeTimeoutRef = useRef(null);
  const runtimeStateRef = useRef(runtimeState);
  const activePanelRef = useRef(activePanel);
  const questionRef = useRef(question);
  const isRecordingRef = useRef(isRecording);
  const subtitleIntervalRef = useRef(null);
  const subtitleBoundaryRef = useRef({ text: '', lastIndex: 0 });
  const [liveSubtitleText, setLiveSubtitleText] = useState('');

  const baseHost = API_BASE.replace(/\/api$/, '');
  const isMobile = width < 768;
  const viewportLockStyle = Platform.OS === 'web' ? { height, maxHeight: height } : null;
  const drawerWidth = isMobile ? Math.max(320, width - 24) : Math.min(420, Math.max(360, Math.round(width * 0.32)));
  const studentName = `${user?.name || 'Student'}`.trim().split(/\s+/)[0] || 'Student';
  const interruptGreeting = `Hello ${studentName}, how can I help you?`;
  const microphoneGreeting = 'How can I help you?';

  const orderedChunks = useMemo(() => (
    (lecture?.sections || []).slice().sort((a, b) => {
      if (a.sectionIndex === b.sectionIndex) return a.chunkIndex - b.chunkIndex;
      return a.sectionIndex - b.sectionIndex;
    })
  ), [lecture]);
  const currentIndex = useMemo(() => {
    if (!currentChunk) return 0;
    const index = orderedChunks.findIndex((item) => item.id === currentChunk.id);
    return index >= 0 ? index : 0;
  }, [orderedChunks, currentChunk]);
  const totalChunks = orderedChunks.length || 1;
  const progress = orderedChunks.length ? Math.min(100, Math.round(((currentIndex + (lectureCompleted ? 1 : 0)) / orderedChunks.length) * 100)) : 0;
  const currentSlides = (lecture?.slideOutlines || []).filter((slide) => slide.slideIndex === currentChunk?.sectionIndex);
  const currentDelivery = currentChunk?.delivery || null;
  const recommendedDurationMs = ((currentDelivery?.recommended_duration_seconds || currentChunk?.estimatedDurationSeconds || 0) > 0
    ? (currentDelivery?.recommended_duration_seconds || currentChunk?.estimatedDurationSeconds) * 1000
    : 0);
  const isPlaying = runtimeState === RUNTIME_STATES.PLAYING || runtimeState === RUNTIME_STATES.RESUMING;

  const {
    plan: lecturePlan,
    currentScene,
    subtitleText,
    narrationText: orchestratedNarration,
    whiteboardMode,
    boardState,
  } = useLectureOrchestrator({ lecture, chunk: currentChunk, runtimeState, lectureCompleted });

  const currentNarration = lecturePlan.narrationText || orchestratedNarration;
  const upcomingChunk = orderedChunks[currentIndex + 1] || null;
  const displaySubtitleText = liveSubtitleText || subtitleText || 'The lecture narration will appear here as the tutor teaches.';
  const whiteboardModeLabel = `${whiteboardMode || 'concept mode'}`.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  const tutorStatus = lectureCompleted
    ? { label: 'Lecture complete', tone: '#22c55e' }
    : runtimeState === RUNTIME_STATES.STUDENT_INTERRUPT
      ? { label: 'Help mode', tone: '#f59e0b' }
      : runtimeState === RUNTIME_STATES.RESUMING
        ? { label: 'Resuming', tone: '#38bdf8' }
        : isPlaying
          ? { label: voiceMode ? 'Live lecture' : 'Guided text', tone: '#60a5fa' }
          : { label: 'Paused', tone: '#94a3b8' };

  useEffect(() => { runtimeStateRef.current = runtimeState; }, [runtimeState]);
  useEffect(() => { activePanelRef.current = activePanel; }, [activePanel]);
  useEffect(() => { questionRef.current = question; }, [question]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  useEffect(() => {
    const pulse = RNAnimated.loop(RNAnimated.sequence([
      RNAnimated.timing(raisedHandPulse, { toValue: 1.07, duration: 850, useNativeDriver: USE_NATIVE_DRIVER }),
      RNAnimated.timing(raisedHandPulse, { toValue: 1, duration: 850, useNativeDriver: USE_NATIVE_DRIVER }),
    ]));
    if (activePanel === PANEL_KEYS.CHAT || isRecording) pulse.start();
    return () => pulse.stop();
  }, [activePanel, isRecording, raisedHandPulse]);

  useEffect(() => {
    let cancelled = false;
    setCatalogReady(false);
    fetchCourses().catch(() => null).finally(() => {
      if (!cancelled) setCatalogReady(true);
    });
    return () => { cancelled = true; };
  }, [fetchCourses, courseId, topicId]);

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
      const html = document.documentElement;
      const body = document.body;
      const root = document.getElementById('root');
      const previous = {
        htmlOverflow: html.style.overflow, htmlHeight: html.style.height,
        bodyOverflow: body.style.overflow, bodyHeight: body.style.height,
        rootOverflow: root?.style.overflow || '', rootHeight: root?.style.height || '',
      };
      html.style.overflow = 'hidden';
      html.style.height = '100%';
      body.style.overflow = 'hidden';
      body.style.height = '100%';
      if (root) {
        root.style.overflow = 'hidden';
        root.style.height = '100%';
      }
      return () => {
        html.style.overflow = previous.htmlOverflow;
        html.style.height = previous.htmlHeight;
        body.style.overflow = previous.bodyOverflow;
        body.style.height = previous.bodyHeight;
        if (root) {
          root.style.overflow = previous.rootOverflow;
          root.style.height = previous.rootHeight;
        }
      };
    }, [])
  );

  useEffect(() => {
    loadLecture();
    return () => { stopPlayback(); stopRecognition(); };
  }, [topicId, voiceMode]);

  useEffect(() => { setRevealedFlashcards({}); }, [lecture?.id]);

  useEffect(() => {
    if (session && currentChunk && runtimeState === RUNTIME_STATES.PLAYING && !lectureCompleted) playChunk();
    else if (runtimeState === RUNTIME_STATES.PAUSED || runtimeState === RUNTIME_STATES.STUDENT_INTERRUPT) pauseLecturePlayback();
    else if (runtimeState === RUNTIME_STATES.ENDED || runtimeState === RUNTIME_STATES.IDLE) stopPlayback();
    return () => {
      if (runtimeState === RUNTIME_STATES.ENDED || runtimeState === RUNTIME_STATES.IDLE) stopPlayback();
    };
  }, [session?.id, currentChunk?.id, runtimeState, lectureCompleted, voiceMode]);

  const getChunkNarrationText = (chunkLike) => {
    if (!chunkLike) return '';
    if (chunkLike?.delivery?.narration_text) return `${chunkLike.delivery.narration_text}`.trim();
    return `${(chunkLike?.scenes || chunkLike?.visualData?.scenes || []).map((scene) => `${scene?.narration || ''}`.trim()).filter(Boolean).join(' ') || chunkLike?.spokenExplanation || chunkLike?.chunkText || ''}`.trim();
  };
  const upcomingNarration = getChunkNarrationText(upcomingChunk);
  const buildAudioUrl = (asset) => {
    const urlPath = `${asset?.urlPath || ''}`.trim();
    if (!urlPath) return '';
    const versionSeed = asset?.id || asset?.updatedAt || asset?.cacheKey || Date.now();
    return `${baseHost}${urlPath}${urlPath.includes('?') ? '&' : '?'}v=${encodeURIComponent(versionSeed)}`;
  };
  const primeAudioAsset = async (text, assetType = 'lecture_chunk') => {
    const normalizedText = `${text || ''}`.trim();
    if (!normalizedText || !voiceMode || Platform.OS !== 'web') return null;
    const cacheKey = `${assetType}:${normalizedText}`;
    if (audioAssetCacheRef.current.has(cacheKey)) return audioAssetCacheRef.current.get(cacheKey);
    const request = aiTutorAPI.speakText({ lectureId: lecture?.id, sessionId: session?.id, assetType, text: normalizedText }).catch((error) => {
      audioAssetCacheRef.current.delete(cacheKey);
      throw error;
    });
    audioAssetCacheRef.current.set(cacheKey, request);
    return request;
  };

  useEffect(() => {
    if (!voiceMode || Platform.OS !== 'web') return;
    primeAudioAsset(currentNarration).catch(() => null);
    primeAudioAsset(upcomingNarration).catch(() => null);
  }, [voiceMode, currentNarration, upcomingNarration, lecture?.id, session?.id]);

  const clearInterruptAutoResume = () => {
    if (interruptResumeTimeoutRef.current) {
      clearTimeout(interruptResumeTimeoutRef.current);
      interruptResumeTimeoutRef.current = null;
    }
  };
  const stopSubtitleSync = () => {
    if (subtitleIntervalRef.current) {
      clearInterval(subtitleIntervalRef.current);
      subtitleIntervalRef.current = null;
    }
    subtitleBoundaryRef.current = { text: '', lastIndex: 0 };
  };
  const updateSubtitleFromRatio = (text, ratio) => {
    const normalizedText = `${text || ''}`.trim();
    if (!normalizedText) {
      setLiveSubtitleText('');
      return;
    }
    const words = normalizedText.split(/\s+/).filter(Boolean);
    if (!words.length) {
      setLiveSubtitleText(normalizedText);
      return;
    }
    const targetCount = Math.max(1, Math.min(words.length, Math.round(words.length * Math.max(0, Math.min(1, ratio)))));
    setLiveSubtitleText(words.slice(0, targetCount).join(' '));
  };
  const beginTimedSubtitleSync = (text, durationMs) => {
    stopSubtitleSync();
    const normalizedText = `${text || ''}`.trim();
    if (!normalizedText) {
      setLiveSubtitleText('');
      return;
    }
    setLiveSubtitleText('');
    const words = normalizedText.split(/\s+/).filter(Boolean);
    if (!words.length) {
      setLiveSubtitleText(normalizedText);
      return;
    }
    const totalDurationMs = Math.max(1200, Number(durationMs) || Math.max(2200, words.length * 280));
    const intervalMs = Math.max(70, Math.min(240, Math.round(totalDurationMs / words.length)));
    let index = 0;
    subtitleIntervalRef.current = setInterval(() => {
      index += 1;
      setLiveSubtitleText(words.slice(0, Math.min(index, words.length)).join(' '));
      if (index >= words.length) {
        stopSubtitleSync();
      }
    }, intervalMs);
  };
  const beginSubtitleSync = (text, options = {}) => {
    const normalizedText = `${text || ''}`.trim();
    if (!normalizedText) {
      stopSubtitleSync();
      setLiveSubtitleText('');
      return;
    }
    if (options.immediate) {
      stopSubtitleSync();
      setLiveSubtitleText(normalizedText);
      return;
    }
    beginTimedSubtitleSync(normalizedText, options.durationMs);
  };
  const clearScheduledPlayback = () => {
    if (playbackRef.current) { clearTimeout(playbackRef.current); playbackRef.current = null; }
  };
  const clearInterruptGreeting = () => {
    interruptAudioRef.current?.pause?.();
    interruptAudioRef.current = null;
    if (Platform.OS === 'web' && window?.speechSynthesis && pausedPlaybackRef.current?.kind !== 'speech') window.speechSynthesis.cancel();
  };
  const pauseLecturePlayback = () => {
    clearScheduledPlayback();
    stopSubtitleSync();
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause?.();
      pausedPlaybackRef.current = { kind: 'audio', chunkId: currentChunk?.id || null };
    } else if (Platform.OS === 'web' && window?.speechSynthesis?.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      pausedPlaybackRef.current = { kind: 'speech', chunkId: currentChunk?.id || null };
    }
  };
  const stopPlayback = () => {
    clearScheduledPlayback();
    clearInterruptAutoResume();
    if (audioRef.current) { audioRef.current.pause?.(); audioRef.current = null; }
    clearInterruptGreeting();
    pausedPlaybackRef.current = null;
    stopSubtitleSync();
    setLiveSubtitleText('');
    if (Platform.OS === 'web' && window?.speechSynthesis) window.speechSynthesis.cancel();
  };
  const stopRecognition = () => {
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setIsRecording(false);
  };

  const loadLecture = async () => {
    setLoading(true);
    stopPlayback();
    stopRecognition();
    try {
      const enrollment = await checkEnrollment(courseId);
      if (!enrollment.success || !enrollment.enrolled) {
        setIsEnrolled(false);
        navigation.navigate('CourseDetail', { courseId });
        return;
      }
      setIsEnrolled(true);
      const response = await aiTutorAPI.startSession(topicId, { voiceModeEnabled: voiceMode });
      if (!response.success) throw new Error(response.error || 'Unable to start tutor session');
      let nextLecture = response.lecture;
      if (response.lecture?.id && !(response.lecture.flashcards || []).length) {
        try {
          const flashcardResponse = await aiTutorAPI.getFlashcards(response.lecture.id);
          if (flashcardResponse.success) nextLecture = { ...response.lecture, flashcards: flashcardResponse.flashcards || [] };
        } catch (_) {}
      }
      setLecture(nextLecture);
      setSession(response.session);
      setCurrentChunk(response.chunk);
      setLectureCompleted(response.session?.status === 'lecture_completed');
      setRuntimeState(response.session?.status === 'lecture_completed' ? RUNTIME_STATES.ENDED : RUNTIME_STATES.PLAYING);
      setActivePanel(null);
      setChatMessages((response.session?.messages || []).map((message) => ({ type: message.sender === 'user' ? 'user' : 'ai', text: message.content })));
    } catch (error) {
      setLecture(null); setSession(null); setCurrentChunk(null);
      Toast.show({ type: 'error', text1: 'Lecture Unavailable', text2: error.message || 'Unable to load this AI lecture package.' });
    } finally {
      setLoading(false);
    }
  };

  const scheduleNext = (delay) => {
    if (!session?.id) return;
    clearScheduledPlayback();
    playbackRef.current = setTimeout(async () => {
      try {
        const response = await aiTutorAPI.getNextChunk(session.id);
        if (response.lectureCompleted || !response.chunk) {
          setLectureCompleted(true); setRuntimeState(RUNTIME_STATES.ENDED); setShowCompleteDialog(true); await fetchCourses(); return;
        }
        setSession(response.session);
        setCurrentChunk(response.chunk);
        setRuntimeState(RUNTIME_STATES.PLAYING);
      } catch (error) {
        setRuntimeState(RUNTIME_STATES.PAUSED);
        Toast.show({ type: 'error', text1: 'Playback Paused', text2: error.message || 'Unable to continue the lecture.' });
      }
    }, delay);
  };

  const playChunk = async () => {
    if (!currentNarration) return;
    if (pausedPlaybackRef.current?.chunkId === currentChunk?.id) {
      if (pausedPlaybackRef.current.kind === 'audio' && audioRef.current) {
        clearInterruptGreeting();
        try { await audioRef.current.play(); pausedPlaybackRef.current = null; setRuntimeState(RUNTIME_STATES.PLAYING); return; } catch (_) {}
      }
      if (pausedPlaybackRef.current.kind === 'speech' && Platform.OS === 'web' && window?.speechSynthesis?.paused) {
        clearInterruptGreeting();
        window.speechSynthesis.resume();
        pausedPlaybackRef.current = null;
        setRuntimeState(RUNTIME_STATES.PLAYING);
        return;
      }
      pausedPlaybackRef.current = null;
    }
    if (!voiceMode) {
      beginSubtitleSync(subtitleText || currentNarration, { durationMs: recommendedDurationMs || Math.min(12000, Math.max(3600, currentNarration.length * 28)) });
      scheduleNext(recommendedDurationMs || Math.min(12000, Math.max(3600, currentNarration.length * 28)));
      return;
    }
    if (Platform.OS === 'web') {
      try {
        const audioResponse = await Promise.race([primeAudioAsset(currentNarration), new Promise((resolve) => setTimeout(() => resolve(null), AUDIO_PREFETCH_TIMEOUT_MS))]);
        if (audioResponse?.asset?.urlPath) {
          const audio = new Audio(buildAudioUrl(audioResponse.asset));
          audio.preload = 'auto';
          try { audio.currentTime = 0; } catch (_) {}
          audioRef.current = audio;
          audio.onloadedmetadata = () => beginSubtitleSync(subtitleText || currentNarration, { durationMs: Math.max(1000, (audio.duration || 0) * 1000) });
          audio.ontimeupdate = () => {
            if (audio.duration && Number.isFinite(audio.duration) && audio.duration > 0) {
              updateSubtitleFromRatio(subtitleText || currentNarration, audio.currentTime / audio.duration);
            }
          };
          audio.onended = () => {
            setLiveSubtitleText(subtitleText || currentNarration);
            scheduleNext(MAX_CHUNK_GAP_MS);
          };
          audio.onerror = () => scheduleNext(ERROR_CHUNK_GAP_MS);
          await audio.play();
          if (!(audio.duration && Number.isFinite(audio.duration) && audio.duration > 0)) {
            beginSubtitleSync(subtitleText || currentNarration, { durationMs: recommendedDurationMs || Math.min(12000, Math.max(3600, currentNarration.length * 28)) });
          }
          return;
        }
      } catch (_) {}
      if (window?.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(currentNarration);
        subtitleBoundaryRef.current = { text: subtitleText || currentNarration, lastIndex: 0 };
        beginSubtitleSync(subtitleText || currentNarration, { durationMs: recommendedDurationMs || Math.min(12000, Math.max(3600, currentNarration.length * 28)) });
        utterance.onboundary = (event) => {
          const sourceText = subtitleBoundaryRef.current.text;
          if (!sourceText || typeof event?.charIndex !== 'number') return;
          const nextIndex = Math.max(subtitleBoundaryRef.current.lastIndex, Math.min(sourceText.length, event.charIndex + 1));
          subtitleBoundaryRef.current.lastIndex = nextIndex;
          setLiveSubtitleText(sourceText.slice(0, nextIndex).trim() || sourceText.split(/\s+/).slice(0, 1).join(' '));
        };
        utterance.onend = () => {
          setLiveSubtitleText(subtitleText || currentNarration);
          scheduleNext(MAX_CHUNK_GAP_MS);
        };
        utterance.onerror = () => scheduleNext(ERROR_CHUNK_GAP_MS);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        return;
      }
    }
    beginSubtitleSync(subtitleText || currentNarration, { durationMs: recommendedDurationMs || Math.min(12000, Math.max(3600, currentNarration.length * 28)) });
    scheduleNext(recommendedDurationMs || Math.min(12000, Math.max(3600, currentNarration.length * 28)));
  };

  const playInterruptGreeting = async (greetingText) => {
    clearInterruptGreeting();
    setChatMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      return lastMessage?.type === 'ai' && lastMessage?.text === greetingText ? prev : [...prev, { type: 'ai', text: greetingText }];
    });
    beginSubtitleSync(greetingText, { durationMs: 2200 });
    if (Platform.OS !== 'web') return;
    try {
      const audioResponse = await Promise.race([primeAudioAsset(greetingText, 'qa_answer'), new Promise((resolve) => setTimeout(() => resolve(null), AUDIO_PREFETCH_TIMEOUT_MS))]);
      if (audioResponse?.asset?.urlPath) {
        const audio = new Audio(buildAudioUrl(audioResponse.asset));
        audio.preload = 'auto';
        interruptAudioRef.current = audio;
        try { audio.currentTime = 0; } catch (_) {}
        audio.onloadedmetadata = () => beginSubtitleSync(greetingText, { durationMs: Math.max(1000, (audio.duration || 0) * 1000) });
        audio.ontimeupdate = () => {
          if (audio.duration && Number.isFinite(audio.duration) && audio.duration > 0) {
            updateSubtitleFromRatio(greetingText, audio.currentTime / audio.duration);
          }
        };
        audio.onended = () => setLiveSubtitleText(greetingText);
        await audio.play();
        return;
      }
    } catch (_) {}
    if (window?.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(greetingText);
      utterance.onboundary = (event) => {
        if (typeof event?.charIndex !== 'number') return;
        setLiveSubtitleText(greetingText.slice(0, Math.min(greetingText.length, event.charIndex + 1)).trim() || greetingText);
      };
      utterance.onend = () => setLiveSubtitleText(greetingText);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const togglePause = async () => {
    if (!session) return;
    try {
      if (runtimeState === RUNTIME_STATES.PLAYING || runtimeState === RUNTIME_STATES.RESUMING) {
        const response = await aiTutorAPI.pauseSession(session.id, { pauseReason: 'manual_pause' });
        if (!response.success) throw new Error(response.error || 'Unable to pause tutor session');
        pauseLecturePlayback();
        setRuntimeState(RUNTIME_STATES.PAUSED);
      } else {
        const response = await aiTutorAPI.resumeSession(session.id);
        if (!response.success) throw new Error(response.error || 'Unable to resume tutor session');
        setSession(response.session);
        if (!(pausedPlaybackRef.current?.chunkId && response.chunk?.id === currentChunk?.id)) setCurrentChunk(response.chunk);
        clearInterruptGreeting();
        setRuntimeState(RUNTIME_STATES.RESUMING);
        setTimeout(() => setRuntimeState(RUNTIME_STATES.PLAYING), 220);
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Session Error', text2: error.message || 'Unable to update tutor state.' });
    }
  };

  const scheduleSilentInterruptResume = () => {
    clearInterruptAutoResume();
    interruptResumeTimeoutRef.current = setTimeout(() => {
      if (
        runtimeStateRef.current === RUNTIME_STATES.STUDENT_INTERRUPT &&
        activePanelRef.current === PANEL_KEYS.CHAT &&
        !isRecordingRef.current &&
        !`${questionRef.current || ''}`.trim()
      ) {
        resumeLectureFromInterrupt();
      }
    }, SILENT_INTERRUPT_RESUME_MS);
  };

  const enterInterruptMode = async ({ greetingText, autoResumeIfSilent = false }) => {
    if (session && (runtimeState === RUNTIME_STATES.PLAYING || runtimeState === RUNTIME_STATES.RESUMING)) {
      try {
        const response = await aiTutorAPI.pauseSession(session.id, { pauseReason: 'student_interrupt', resumeLeadIn: "Now that we've cleared that up, let's continue." });
        if (!response.success) throw new Error(response.error || 'Unable to pause tutor session');
        setSession(response.session || session);
        pauseLecturePlayback();
        setRuntimeState(RUNTIME_STATES.STUDENT_INTERRUPT);
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Pause Failed', text2: error.message || 'Unable to pause for questions.' });
      }
    }
    setActivePanel(PANEL_KEYS.CHAT);
    await playInterruptGreeting(greetingText);
    if (autoResumeIfSilent) scheduleSilentInterruptResume();
    else clearInterruptAutoResume();
  };

  const handleRaiseHandToggle = async () => {
    if (runtimeState === RUNTIME_STATES.STUDENT_INTERRUPT && activePanel === PANEL_KEYS.CHAT) {
      clearInterruptAutoResume();
      await resumeLectureFromInterrupt();
      return;
    }
    await enterInterruptMode({ greetingText: interruptGreeting, autoResumeIfSilent: true });
  };

  const openChatPanel = async () => {
    await enterInterruptMode({ greetingText: interruptGreeting, autoResumeIfSilent: false });
  };

  const openAssistantPanel = async () => {
    if (runtimeState === RUNTIME_STATES.STUDENT_INTERRUPT) {
      setActivePanel(PANEL_KEYS.CHAT);
      clearInterruptAutoResume();
      return;
    }
    await enterInterruptMode({ greetingText: microphoneGreeting, autoResumeIfSilent: false });
  };

  const resumeLectureFromInterrupt = async () => {
    if (!session || runtimeState !== RUNTIME_STATES.STUDENT_INTERRUPT) { setActivePanel(null); return; }
    try {
      clearInterruptAutoResume();
      stopRecognition();
      const response = await aiTutorAPI.resumeSession(session.id);
      if (!response.success) throw new Error(response.error || 'Unable to resume tutor session');
      setSession(response.session);
      if (!(pausedPlaybackRef.current?.chunkId && response.chunk?.id === currentChunk?.id)) setCurrentChunk(response.chunk);
      clearInterruptGreeting();
      setActivePanel(null);
      setRuntimeState(RUNTIME_STATES.RESUMING);
      setTimeout(() => setRuntimeState(RUNTIME_STATES.PLAYING), 220);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Resume Failed', text2: error.message || 'Unable to continue the lecture.' });
    }
  };

  const closePanel = () => {
    if (runtimeState === RUNTIME_STATES.STUDENT_INTERRUPT && activePanel === PANEL_KEYS.CHAT) { resumeLectureFromInterrupt(); return; }
    setActivePanel(null);
  };

  const askQuestionWithText = async (promptText) => {
    if (!`${promptText || ''}`.trim() || !session) return;
    const prompt = `${promptText}`.trim();
    clearInterruptAutoResume();
    setQuestion('');
    setSubmittingQuestion(true);
    setChatMessages((prev) => [...prev, { type: 'user', text: prompt }]);
    try {
      const response = await aiTutorAPI.askQuestion(session.id, prompt);
      if (!response.success || !response.aiMessage?.content) throw new Error(response.error || 'I could not answer that question right now.');
      setChatMessages((prev) => [...prev, { type: 'ai', text: response.aiMessage.content }]);
    } catch (error) {
      setChatMessages((prev) => [...prev, { type: 'ai', text: error.message || 'I could not answer that question right now.' }]);
    } finally {
      setSubmittingQuestion(false);
    }
  };
  const askQuestion = async () => askQuestionWithText(question);

  const startVoiceInput = async () => {
    await openAssistantPanel();
    if (Platform.OS !== 'web') {
      Toast.show({ type: 'info', text1: 'Voice Input', text2: 'Voice input currently requires the web speech API.' });
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      Toast.show({ type: 'error', text1: 'Not Supported', text2: 'Voice input is not supported in this browser.' });
      return;
    }
    if (isRecording) { stopRecognition(); return; }
    clearInterruptAutoResume();
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results || []).map((result) => result?.[0]?.transcript || '').join(' ').trim();
      const finalTranscript = Array.from(event.results || []).filter((result) => result.isFinal).map((result) => result?.[0]?.transcript || '').join(' ').trim();
      setQuestion(transcript);
      setActivePanel(PANEL_KEYS.CHAT);
      if (finalTranscript) {
        setIsRecording(false);
        askQuestionWithText(finalTranscript);
      }
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.start();
  };

  const exportFlashcards = () => {
    const cards = lecture?.flashcards || [];
    if (!cards.length || Platform.OS !== 'web') {
      Toast.show({ type: 'info', text1: 'Export Unavailable', text2: cards.length ? 'Flashcard export is available on web.' : 'No flashcards available for this lecture.' });
      return;
    }
    const blob = new Blob([JSON.stringify(cards.map((card) => ({ front: card.frontText, back: card.backText })), null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${lecture.title.replace(/\s+/g, '-').toLowerCase()}-flashcards.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const goToNextChunk = async () => {
    if (!session?.id || lectureCompleted) return;
    stopPlayback();
    setRuntimeState(RUNTIME_STATES.PAUSED);
    try {
      const response = await aiTutorAPI.getNextChunk(session.id);
      if (response.lectureCompleted || !response.chunk) {
        setLectureCompleted(true); setRuntimeState(RUNTIME_STATES.ENDED); setShowCompleteDialog(true); await fetchCourses(); return;
      }
      setSession(response.session);
      setCurrentChunk(response.chunk);
      setRuntimeState(RUNTIME_STATES.PLAYING);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Next Chunk Unavailable', text2: error.message || 'Unable to advance to the next lecture chunk.' });
    }
  };

  const openQuiz = () => {
    if (!lecture?.id) { Toast.show({ type: 'error', text1: 'Quiz Unavailable', text2: 'This lecture package is missing its quiz reference.' }); return; }
    if (!lectureCompleted) { Toast.show({ type: 'info', text1: 'Finish the Lecture', text2: 'Complete the lecture before opening the quiz.' }); return; }
    navigation.navigate('Quiz', { courseId, topicId, lectureId: lecture.id });
  };

  const renderDrawerHeader = (eyebrow, title) => (
    <View style={styles.drawerHeader}>
      <View style={styles.drawerHeaderCopy}>
        <Text style={[styles.drawerEyebrow, { color: theme.colors.primary }]}>{eyebrow}</Text>
        <Text style={[styles.drawerTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>{title}</Text>
      </View>
      <TouchableOpacity style={[styles.drawerClose, { backgroundColor: isDark ? 'rgba(15,23,42,0.9)' : '#eef2ff' }]} onPress={closePanel}>
        <Icon name="close" size={18} color={theme.colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  const renderChatPanel = () => (
    <View style={styles.drawerShell}>
      {renderDrawerHeader('AI chat', 'Ask the tutor')}
      <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
        {!chatMessages.length && !submittingQuestion ? (
          <View style={[styles.emptyStatePanel, { borderColor: theme.colors.border }]}>
            <MaterialIcon name="message-processing-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.emptyStateTitle, { color: theme.colors.textPrimary }]}>Pause and ask about this scene</Text>
            <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>The tutor answers using the current whiteboard context, then resumes smoothly.</Text>
          </View>
        ) : null}
        {chatMessages.map((message, index) => (
          <View key={`${message.type}-${index}`} style={[styles.chatBubble, message.type === 'user' ? styles.chatBubbleUser : [styles.chatBubbleAi, { borderColor: theme.colors.border }]]}>
            <Text style={[styles.chatRole, { color: message.type === 'user' ? 'rgba(255,255,255,0.78)' : theme.colors.primary }]}>{message.type === 'user' ? 'You' : 'AI Tutor'}</Text>
            <Text style={{ color: message.type === 'user' ? '#fff' : theme.colors.textPrimary, lineHeight: 21 }}>{message.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={[styles.drawerComposer, { borderColor: theme.colors.border, backgroundColor: isDark ? '#101827' : '#f8fafc' }]}>
        <TouchableOpacity style={[styles.composerIcon, { backgroundColor: isRecording ? theme.colors.error : theme.colors.primary }]} onPress={startVoiceInput}>
          <Icon name={isRecording ? 'stop' : 'mic'} size={16} color="#fff" />
        </TouchableOpacity>
        <TextInput
          style={[styles.drawerInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#172332' : '#ffffff' }]}
          value={question}
          onChangeText={(value) => {
            setQuestion(value);
            if (`${value || ''}`.trim()) clearInterruptAutoResume();
          }}
          onSubmitEditing={askQuestion}
          placeholder={isRecording ? 'Listening...' : 'Type your question...'}
          placeholderTextColor={theme.colors.textTertiary}
          multiline
        />
        <TouchableOpacity style={[styles.composerIcon, { backgroundColor: theme.colors.primary }]} onPress={askQuestion} disabled={submittingQuestion}>
          {submittingQuestion ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="send" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNotesPanel = () => (
    <View style={styles.drawerShell}>
      {renderDrawerHeader('Notes', 'Lecture notepad')}
      <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.sheetBlock, { borderColor: theme.colors.border, backgroundColor: isDark ? '#101827' : '#f8fafc' }]}>
          <Text style={[styles.sheetBlockTitle, { color: theme.colors.textPrimary }]}>Your notes</Text>
          <TextInput
            style={[styles.notesInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#0f172a' : '#ffffff' }]}
            multiline
            value={lectureNotes}
            onChangeText={setLectureNotes}
            placeholder="Write key points, examples, or questions while the lecture is playing..."
            placeholderTextColor={theme.colors.textTertiary}
            textAlignVertical="top"
          />
        </View>
        <Text style={[styles.notesLead, { color: theme.colors.textSecondary }]}>Quick lecture cues</Text>
        {(currentSlides.length ? currentSlides : lecture.slideOutlines || []).map((slide, index) => (
          <View key={slide.id || index} style={[styles.sheetBlock, { borderColor: theme.colors.border, backgroundColor: isDark ? '#101827' : '#f8fafc' }]}>
            <Text style={[styles.sheetBlockTitle, { color: theme.colors.textPrimary }]}>{slide.title}</Text>
            {(slide.bullets || []).map((bullet, bulletIndex) => (
              <Text key={`${slide.id || index}-${bulletIndex}`} style={[styles.sheetBody, { color: theme.colors.textSecondary }]}>- {bullet}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderFlashcardsPanel = () => (
    <View style={styles.drawerShell}>
      {renderDrawerHeader('Flashcards', 'Review key ideas')}
      <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
        {(lecture.flashcards || []).map((card, index) => {
          const cardId = card.id || index;
          const revealed = Boolean(revealedFlashcards[cardId]);
          return (
            <TouchableOpacity key={cardId} activeOpacity={0.92} onPress={() => setRevealedFlashcards((prev) => ({ ...prev, [cardId]: !prev[cardId] }))} style={[styles.sheetBlock, { borderColor: theme.colors.border, backgroundColor: isDark ? '#101827' : '#f8fafc' }]}>
              <View style={styles.flashcardHeader}>
                <Text style={[styles.flashcardLabel, { color: theme.colors.primary }]}>{revealed ? 'Answer' : 'Prompt'}</Text>
                <Text style={[styles.flashcardHint, { color: theme.colors.textTertiary }]}>{revealed ? 'Tap to hide' : 'Tap to reveal'}</Text>
              </View>
              <Text style={[styles.flashcardBody, { color: theme.colors.textPrimary }]}>{revealed ? card.backText : card.frontText}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TouchableOpacity style={[styles.footerButton, { borderColor: theme.colors.border, backgroundColor: isDark ? '#101827' : '#ffffff' }]} onPress={exportFlashcards}>
        <Icon name="download-outline" size={18} color={theme.colors.textPrimary} />
        <Text style={[styles.footerButtonText, { color: theme.colors.textPrimary }]}>Export flashcards</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTopicsPanel = () => (
    <View style={styles.drawerShell}>
      {renderDrawerHeader('Course topics', 'Topic tray')}
      <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
        {(course?.topics || []).map((item) => {
          const isCurrent = item.id === topicId;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.topicRow, { borderColor: theme.colors.border, backgroundColor: isCurrent ? (isDark ? 'rgba(37,99,235,0.18)' : '#eef2ff') : (isDark ? '#101827' : '#f8fafc'), opacity: item.status === 'locked' ? 0.52 : 1 }]}
              disabled={item.status === 'locked'}
              onPress={() => {
                closePanel();
                if (!isCurrent) navigation.replace('AILearning', { courseId, topicId: item.id });
              }}
            >
              <View style={styles.topicCopy}>
                <Text style={[styles.topicTitle, { color: theme.colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.topicMeta, { color: theme.colors.textSecondary }]}>{item.completed ? 'Completed' : item.status === 'locked' ? 'Locked' : isCurrent ? 'Current topic' : 'Open'}</Text>
              </View>
              <Text style={[styles.topicState, { color: isCurrent ? theme.colors.primary : theme.colors.textTertiary }]}>{item.completed ? 'Done' : isCurrent ? `${progress}%` : item.status === 'locked' ? 'Locked' : 'Open'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderPanel = () => {
    switch (activePanel) {
      case PANEL_KEYS.CHAT: return renderChatPanel();
      case PANEL_KEYS.NOTES: return renderNotesPanel();
      case PANEL_KEYS.FLASHCARDS: return renderFlashcardsPanel();
      case PANEL_KEYS.TOPICS: return renderTopicsPanel();
      default: return null;
    }
  };

  if ((!catalogReady && !course) || (!catalogReady && course && !topic)) {
    return <MainLayout showSidebar={false} showHeader={false}><View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Opening AI lecture classroom...</Text></View></MainLayout>;
  }
  if (!course || !topic) {
    return <MainLayout showSidebar={false} showHeader={false}><View style={styles.centered}><EmptyState icon="alert-circle-outline" title="Topic not found" subtitle="The topic you're looking for doesn't exist." /></View></MainLayout>;
  }
  if (loading) {
    return <MainLayout showSidebar={false} showHeader={false}><View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading AI lecture package...</Text></View></MainLayout>;
  }
  if (!isEnrolled) {
    return <MainLayout showSidebar={false} showHeader={false}><View style={styles.centered}><EmptyState icon="lock-closed-outline" title="Not Enrolled" subtitle="You need to enroll in this course to access lectures." /></View></MainLayout>;
  }
  if (!lecture || !currentChunk) {
    return <MainLayout showSidebar={false} showHeader={false}><View style={styles.centered}><EmptyState icon="sparkles-outline" title="Lecture Not Ready" subtitle="This topic does not have a generated lecture package yet." /></View></MainLayout>;
  }

  const controls = [
    { key: 'pause', icon: isPlaying ? 'pause' : 'play', label: isPlaying ? 'Pause' : 'Resume', onPress: togglePause, active: false, disabled: false },
    { key: 'raise', icon: runtimeState === RUNTIME_STATES.STUDENT_INTERRUPT ? 'hand-left-outline' : 'hand-right-outline', label: runtimeState === RUNTIME_STATES.STUDENT_INTERRUPT ? 'Lower Hand' : 'Raise Hand', onPress: handleRaiseHandToggle, active: runtimeState === RUNTIME_STATES.STUDENT_INTERRUPT, disabled: false, tone: 'attention' },
    { key: 'mic', icon: isRecording ? 'stop' : 'mic-outline', label: isRecording ? 'Stop Mic' : 'Mic', onPress: startVoiceInput, active: isRecording, disabled: false },
    { key: 'chat', icon: 'chatbubble-ellipses-outline', label: 'AI Chat', onPress: openChatPanel, active: activePanel === PANEL_KEYS.CHAT, disabled: false },
    { key: 'notes', icon: 'document-text-outline', label: 'Notes', onPress: () => setActivePanel(PANEL_KEYS.NOTES), active: activePanel === PANEL_KEYS.NOTES, disabled: false },
    { key: 'cards', icon: 'cards-outline', label: 'Flashcards', onPress: () => setActivePanel(PANEL_KEYS.FLASHCARDS), active: activePanel === PANEL_KEYS.FLASHCARDS, disabled: !(lecture.flashcards || []).length, iconSet: 'material' },
    { key: 'quiz', icon: 'help-circle-outline', label: 'Quiz', onPress: openQuiz, active: false, disabled: false, iconSet: 'material' },
    { key: 'topics', icon: 'library-outline', label: 'Topics', onPress: () => setActivePanel(PANEL_KEYS.TOPICS), active: activePanel === PANEL_KEYS.TOPICS, disabled: false },
    { key: 'next', icon: 'play-skip-forward', label: 'Next', onPress: goToNextChunk, active: false, disabled: lectureCompleted },
  ];

  return (
    <MainLayout showSidebar={false} showHeader={false}>
      <View style={[styles.screen, viewportLockStyle, { backgroundColor: '#050b16' }]}>
        <View style={[styles.glow, styles.glowOne]} />
        <View style={[styles.glow, styles.glowTwo]} />
        <View style={[styles.shell, viewportLockStyle, { paddingHorizontal: isMobile ? 10 : 18, paddingTop: isMobile ? 10 : 18, paddingBottom: isMobile ? 8 : 14 }]}>
          <View style={styles.headerBar}>
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Icon name="arrow-back" size={17} color="#e2e8f0" />
              </TouchableOpacity>
              <View style={styles.headerCopy}>
                <Text style={styles.headerEyebrow} numberOfLines={1}>{course.title}</Text>
                <Text style={styles.headerTitle} numberOfLines={1}>{lecture.title}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.metaRow}>
                <View style={styles.metaPill}><Text style={styles.metaText}>{tutorStatus.label}</Text></View>
                <View style={styles.metaPill}><Text style={styles.metaText}>{currentIndex + 1}/{totalChunks}</Text></View>
                <View style={styles.metaPill}><Text style={styles.metaText}>{progress}%</Text></View>
              </View>
              <View style={styles.controlsRow}>
                {controls.map(({ key, icon, label, onPress, active, disabled, iconSet = 'ion', tone = 'default' }) => {
                  const IconComponent = iconSet === 'material' ? MaterialIcon : Icon;
                  const highlightColor = tone === 'attention' ? '#f59e0b' : theme.colors.primary;
                  return (
                    <RNAnimated.View key={key} style={key === 'raise' && active ? { transform: [{ scale: raisedHandPulse }] } : null}>
                      <TouchableOpacity
                        style={[styles.controlButton, active && { borderColor: `${highlightColor}88`, backgroundColor: `${highlightColor}18` }, disabled && styles.disabledButton]}
                        onPress={onPress}
                        disabled={disabled}
                        accessibilityRole="button"
                        accessibilityLabel={label}
                        accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(active) }}
                      >
                        <IconComponent name={icon} size={17} color={active ? highlightColor : '#94a3b8'} />
                        {!isMobile ? <Text style={[styles.controlText, active && { color: '#f8fafc' }]}>{label}</Text> : null}
                      </TouchableOpacity>
                    </RNAnimated.View>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.stageWrap}>
            <View style={styles.stageFrame}>
              <WhiteboardStage boardState={boardState} currentScene={currentScene} objectiveText={lecturePlan.objectiveText} status={tutorStatus} modeLabel={whiteboardModeLabel} />
            </View>
          </View>

          <View style={styles.subtitleStrip}>
            <View style={[styles.subtitleDot, { backgroundColor: tutorStatus.tone }]} />
            <Text style={styles.subtitleText} numberOfLines={isMobile ? 2 : 1}>{displaySubtitleText || 'The lecture narration will appear here as the tutor teaches.'}</Text>
          </View>
        </View>

        {activePanel ? (
          <>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closePanel} />
            <View style={[styles.drawer, isMobile ? [styles.mobileDrawer, { width: drawerWidth }] : [styles.desktopDrawer, { width: drawerWidth }]]}>
              {renderPanel()}
            </View>
          </>
        ) : null}
      </View>
      <ConfirmDialog
        visible={showCompleteDialog}
        title="Lecture Complete"
        message="The lecture is finished. Open the quiz to unlock the next topic, or restart this lecture from the beginning."
        confirmText="Open Quiz"
        confirmVariant="primary"
        onConfirm={() => { setShowCompleteDialog(false); openQuiz(); }}
        onCancel={() => setShowCompleteDialog(false)}
      />
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden', minHeight: 0 },
  glow: { position: 'absolute', borderRadius: 999, opacity: 0.18 },
  glowOne: { width: 360, height: 360, right: -120, top: -80, backgroundColor: '#2563eb' },
  glowTwo: { width: 320, height: 320, left: -120, bottom: -110, backgroundColor: '#0ea5e9' },
  shell: { flex: 1, minHeight: 0, gap: 10, overflow: 'hidden' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16 },
  headerBar: { borderWidth: 1, borderColor: 'rgba(148,163,184,0.18)', backgroundColor: 'rgba(7,12,22,0.82)', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 14, flexShrink: 0 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1, minWidth: 0 },
  backButton: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(148,163,184,0.16)', backgroundColor: 'rgba(15,23,42,0.8)', justifyContent: 'center', alignItems: 'center' },
  headerCopy: { minWidth: 0, flexShrink: 1 },
  headerEyebrow: { color: '#7dd3fc', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 4 },
  headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  headerRight: { flex: 1, alignItems: 'flex-end', gap: 8, minWidth: 0 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  metaPill: { borderWidth: 1, borderColor: 'rgba(148,163,184,0.16)', backgroundColor: 'rgba(15,23,42,0.78)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  metaText: { color: '#cbd5e1', fontSize: 11, fontWeight: '700' },
  controlsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  controlButton: { minHeight: 38, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(148,163,184,0.16)', backgroundColor: 'rgba(15,23,42,0.72)', paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  disabledButton: { opacity: 0.45 },
  stageWrap: { flex: 1, minHeight: 0, overflow: 'hidden' },
  stageFrame: { flex: 1, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(148,163,184,0.16)', backgroundColor: '#08111d', overflow: 'hidden', shadowColor: '#020617', shadowOpacity: 0.26, shadowRadius: 18, shadowOffset: { width: 0, height: 14 }, elevation: 10 },
  subtitleStrip: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(148,163,184,0.16)', backgroundColor: 'rgba(7,12,22,0.84)', paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  subtitleDot: { width: 8, height: 8, borderRadius: 999, flexShrink: 0 },
  subtitleText: { flex: 1, color: '#e2e8f0', fontSize: 13, lineHeight: 18, fontWeight: '500' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(2,6,23,0.58)' },
  drawer: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(148,163,184,0.16)', borderRadius: 24, backgroundColor: 'rgba(6,10,18,0.98)', overflow: 'hidden', maxHeight: '100%' },
  desktopDrawer: { top: 16, right: 16, bottom: 16 },
  mobileDrawer: { top: '18%', bottom: 12, left: 12, right: 12, alignSelf: 'center' },
  drawerShell: { flex: 1, minHeight: 0, padding: 18, gap: 14 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexShrink: 0 },
  drawerHeaderCopy: { flex: 1, minWidth: 0 },
  drawerEyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  drawerTitle: { fontSize: 22, fontWeight: '800' },
  drawerClose: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  drawerScroll: { flex: 1, minHeight: 0 },
  emptyStatePanel: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 18, padding: 16, alignItems: 'center', marginBottom: 12 },
  emptyStateTitle: { fontSize: 14, fontWeight: '800', marginTop: 8, marginBottom: 6, textAlign: 'center' },
  emptyStateText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  chatBubble: { padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: '96%', borderWidth: 1 },
  chatBubbleUser: { backgroundColor: '#2563eb', alignSelf: 'flex-end', borderColor: '#2563eb' },
  chatBubbleAi: { backgroundColor: 'rgba(15,23,42,0.72)', alignSelf: 'flex-start' },
  chatRole: { fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  drawerComposer: { borderWidth: 1, borderRadius: 20, padding: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 8, flexShrink: 0 },
  composerIcon: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  drawerInput: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  notesLead: { fontSize: 14, lineHeight: 22, marginBottom: 14 },
  notesInput: { minHeight: 220, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, lineHeight: 22 },
  sheetBlock: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 12 },
  sheetBlockTitle: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  sheetBody: { fontSize: 13, lineHeight: 21, marginBottom: 4 },
  sheetBodyStrong: { fontSize: 13, lineHeight: 21, marginBottom: 6, fontWeight: '700' },
  sheetCallout: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginVertical: 8, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  sheetNote: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  flashcardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  flashcardLabel: { fontSize: 12, fontWeight: '800' },
  flashcardHint: { fontSize: 11, fontWeight: '600' },
  flashcardBody: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  footerRow: { flexDirection: 'row', gap: 10 },
  footerHalf: { flex: 1 },
  footerButton: { borderWidth: 1, borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexShrink: 0 },
  footerButtonText: { fontSize: 14, fontWeight: '700' },
  topicRow: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  topicCopy: { flex: 1, minWidth: 0 },
  topicTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  topicMeta: { fontSize: 12 },
  topicState: { fontSize: 12, fontWeight: '800' },
});

export default AILearningScreen;
