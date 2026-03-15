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
import MainLayout from '../../components/ui/MainLayout';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { aiTutorAPI, API_BASE } from '../../services/apiClient';
import WhiteboardStage from '../../features/lecture/WhiteboardStage';
import { useLectureOrchestrator } from '../../features/lecture/useLectureOrchestrator';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const PANEL_KEYS = { CHAT: 'chat', NOTES: 'notes', FLASHCARDS: 'flashcards', TOOLS: 'tools', TOPICS: 'topics' };
const RUNTIME_STATES = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  STUDENT_INTERRUPT: 'student_interrupt',
  RESUMING: 'resuming',
  ENDED: 'ended',
};
const MAX_CHUNK_GAP_MS = 180;
const ERROR_CHUNK_GAP_MS = 850;
const AUDIO_PREFETCH_TIMEOUT_MS = 900;
const INTERRUPT_GREETING = 'Hello Danish, how can I help you?';

const LearningScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const { courseId, topicId } = route.params || {};
  const { courses, checkEnrollment, fetchCourses } = useData();
  const course = courses.find((item) => item.id === courseId);
  const topic = course?.topics?.find((item) => item.id === topicId);

  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [lecture, setLecture] = useState(null);
  const [session, setSession] = useState(null);
  const [currentChunk, setCurrentChunk] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [question, setQuestion] = useState('');
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
  const audioElementCacheRef = useRef(new Map());
  const baseHost = API_BASE.replace(/\/api$/, '');
  const isCompact = width < 1180;
  const isMobile = width < 768;
  const panelWidth = Math.min(380, Math.max(320, Math.round(width * (isMobile ? 0.92 : 0.3))));
  const classroomHeight = Math.max(360, Math.min(height - (isMobile ? 136 : 164), height * 0.74));
  const stageHeight = Math.max(260, Math.min(height * (isMobile ? 0.42 : 0.5), 520));

  const orderedChunks = useMemo(() => {
    return (lecture?.sections || []).slice().sort((a, b) => {
      if (a.sectionIndex === b.sectionIndex) return a.chunkIndex - b.chunkIndex;
      return a.sectionIndex - b.sectionIndex;
    });
  }, [lecture]);

  const currentIndex = useMemo(() => {
    if (!currentChunk) return 0;
    const index = orderedChunks.findIndex((item) => item.id === currentChunk.id);
    return index >= 0 ? index : 0;
  }, [orderedChunks, currentChunk]);

  const progress = orderedChunks.length ? Math.min(100, Math.round(((currentIndex + (lectureCompleted ? 1 : 0)) / orderedChunks.length) * 100)) : 0;
  const currentSlides = (lecture?.slideOutlines || []).filter((slide) => slide.slideIndex === currentChunk?.sectionIndex);
  const totalChunks = orderedChunks.length || 1;
  const currentDelivery = currentChunk?.delivery || null;
  const panelContent = currentDelivery?.panel_content || {};
  const teachingPlan = currentDelivery?.teaching_plan || currentChunk?.teachingPlan || {};
  const classroomModeLabel = currentDelivery?.classroom_mode_label || 'Narration only';
  const supportPanel = currentDelivery?.support_panel || panelContent.supportPanel || null;
  const transitionText = currentDelivery?.transition_text || panelContent.transitionIn || '';
  const checkpointText = currentDelivery?.checkpoint_text || panelContent.checkpointQuestion || currentChunk?.checkpointQuestion || '';
  const reinforcementPoints = panelContent.reinforcementPoints || teachingPlan.reinforcement_points || [];
  const confusionPoints = panelContent.likelyConfusionPoints || teachingPlan.likely_confusion_points || [];
  const teachingStyleLabel = currentDelivery?.teaching_style_label || panelContent.teachingStyleLabel || 'Brief explanation';
  const recommendedDurationMs = ((currentDelivery?.recommended_duration_seconds || currentChunk?.estimatedDurationSeconds || 0) > 0
    ? (currentDelivery?.recommended_duration_seconds || currentChunk?.estimatedDurationSeconds) * 1000
    : 0);
  const isPlaying = runtimeState === RUNTIME_STATES.PLAYING || runtimeState === RUNTIME_STATES.RESUMING;
  const currentModeLabel = runtimeState === RUNTIME_STATES.STUDENT_INTERRUPT ? 'Help mode' : voiceMode ? 'Live voice teaching' : 'Guided text teaching';

  const formatLectureDuration = (minutes) => {
    const value = Number(minutes);
    if (!Number.isFinite(value) || value <= 0) return '';
    if (value < 60) return `${value} min lecture`;
    const hours = Math.floor(value / 60);
    const remainingMinutes = value % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m lecture` : `${hours}h lecture`;
  };

  const lectureDurationLabel = formatLectureDuration(lecture?.estimatedDurationMinutes);
  const isInterrupted = runtimeState === RUNTIME_STATES.STUDENT_INTERRUPT;
  const {
    plan: lecturePlan,
    currentScene,
    subtitleText,
    narrationText: orchestratedNarration,
    whiteboardMode,
    boardState,
  } = useLectureOrchestrator({
    lecture,
    chunk: currentChunk,
    runtimeState,
    lectureCompleted,
  });
  const currentNarration = lecturePlan.narrationText || orchestratedNarration;
  const upcomingChunk = orderedChunks[currentIndex + 1] || null;
  const displaySubtitleText = runtimeState === RUNTIME_STATES.STUDENT_INTERRUPT
    ? INTERRUPT_GREETING
    : subtitleText;
  const whiteboardModeLabel = `${whiteboardMode || 'concept mode'}`
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const tutorStatus = lectureCompleted
    ? { label: 'Lecture complete', detail: 'Quiz is ready. Review notes or launch the assessment when you are ready.', tone: '#22c55e' }
    : runtimeState === RUNTIME_STATES.STUDENT_INTERRUPT
      ? { label: 'Question time', detail: submittingQuestion ? 'AI Tutor is preparing a contextual answer.' : 'Your lecture is paused on this exact moment for discussion.', tone: '#f59e0b' }
      : runtimeState === RUNTIME_STATES.RESUMING
        ? { label: 'Resuming lecture', detail: 'Picking up exactly where you paused.', tone: '#38bdf8' }
      : isPlaying
        ? { label: currentModeLabel, detail: transitionText || 'The tutor is advancing through the prepared classroom sequence.', tone: '#60a5fa' }
        : { label: 'Paused', detail: 'Resume any time and continue from this same lecture chunk.', tone: '#a78bfa' };

  useEffect(() => {
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(raisedHandPulse, { toValue: 1.08, duration: 850, useNativeDriver: USE_NATIVE_DRIVER }),
        RNAnimated.timing(raisedHandPulse, { toValue: 1, duration: 850, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    if (activePanel === PANEL_KEYS.CHAT || isRecording) pulse.start();
    return () => pulse.stop();
  }, [activePanel, isRecording, raisedHandPulse]);

  useEffect(() => {
    loadLecture();
    return () => {
      stopPlayback();
      stopRecognition();
    };
  }, [topicId, voiceMode]);

  useEffect(() => { setRevealedFlashcards({}); }, [lecture?.id]);

  useEffect(() => {
    if (session && currentChunk && runtimeState === RUNTIME_STATES.PLAYING && !lectureCompleted) {
      playChunk();
    } else if (runtimeState === RUNTIME_STATES.PAUSED || runtimeState === RUNTIME_STATES.STUDENT_INTERRUPT) {
      pauseLecturePlayback();
    } else if (runtimeState === RUNTIME_STATES.ENDED || runtimeState === RUNTIME_STATES.IDLE) {
      stopPlayback();
    }
    return () => {
      if (runtimeState === RUNTIME_STATES.ENDED || runtimeState === RUNTIME_STATES.IDLE) {
        stopPlayback();
      }
    };
  }, [session?.id, currentChunk?.id, runtimeState, lectureCompleted, voiceMode]);

  const getChunkNarrationText = (chunkLike) => {
    if (!chunkLike) return '';
    if (chunkLike?.delivery?.narration_text) return `${chunkLike.delivery.narration_text}`.trim();
    const sceneNarration = (chunkLike?.scenes || chunkLike?.visualData?.scenes || [])
      .map((scene) => `${scene?.narration || ''}`.trim())
      .filter(Boolean)
      .join(' ');
    return `${sceneNarration || chunkLike?.spokenExplanation || chunkLike?.text || chunkLike?.chunkText || ''}`.trim();
  };

  const upcomingNarration = getChunkNarrationText(upcomingChunk);

  const primeAudioAsset = async (text, assetType = 'lecture_chunk') => {
    const normalizedText = `${text || ''}`.trim();
    if (!normalizedText || !voiceMode || Platform.OS !== 'web') return null;

    const cacheKey = `${assetType}:${normalizedText}`;
    if (audioAssetCacheRef.current.has(cacheKey)) {
      return audioAssetCacheRef.current.get(cacheKey);
    }

    const request = aiTutorAPI.speakText({
      lectureId: lecture?.id,
      sessionId: session?.id,
      assetType,
      text: normalizedText,
    }).then((audioResponse) => {
      const urlPath = audioResponse?.asset?.urlPath;
      if (urlPath && !audioElementCacheRef.current.has(cacheKey)) {
        const audio = new Audio(`${baseHost}${urlPath}`);
        audio.preload = 'auto';
        audio.load?.();
        audioElementCacheRef.current.set(cacheKey, audio);
      }
      return audioResponse;
    }).catch((error) => {
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

  const playInterruptGreeting = async () => {
    clearInterruptGreeting();
    setChatMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage?.type === 'ai' && lastMessage?.text === INTERRUPT_GREETING) {
        return prev;
      }
      return [...prev, { type: 'ai', text: INTERRUPT_GREETING }];
    });

    if (Platform.OS !== 'web') return;

    try {
      const audioResponse = await Promise.race([
        primeAudioAsset(INTERRUPT_GREETING, 'classroom_help'),
        new Promise((resolve) => setTimeout(() => resolve(null), AUDIO_PREFETCH_TIMEOUT_MS)),
      ]);
      if (audioResponse?.asset?.urlPath) {
        const cacheKey = `classroom_help:${INTERRUPT_GREETING}`;
        const audio = audioElementCacheRef.current.get(cacheKey) || new Audio(`${baseHost}${audioResponse.asset.urlPath}`);
        interruptAudioRef.current = audio;
        try { audio.currentTime = 0; } catch (_) {}
        await audio.play();
        return;
      }
    } catch (_) {}

    if (window?.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(INTERRUPT_GREETING);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const clearScheduledPlayback = () => {
    if (playbackRef.current) {
      clearTimeout(playbackRef.current);
      playbackRef.current = null;
    }
  };

  const clearInterruptGreeting = () => {
    interruptAudioRef.current?.pause?.();
    interruptAudioRef.current = null;
    if (Platform.OS === 'web' && window?.speechSynthesis && pausedPlaybackRef.current?.kind !== 'speech') {
      window.speechSynthesis.cancel();
    }
  };

  const pauseLecturePlayback = () => {
    clearScheduledPlayback();
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
    if (audioRef.current) {
      audioRef.current.pause?.();
      audioRef.current = null;
    }
    clearInterruptGreeting();
    pausedPlaybackRef.current = null;
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
          if (flashcardResponse.success) {
            nextLecture = { ...response.lecture, flashcards: flashcardResponse.flashcards || [] };
          }
        } catch (_) {}
      }

      setLecture(nextLecture);
      setSession(response.session);
      setCurrentChunk(response.chunk);
      setLectureCompleted(response.session?.status === 'lecture_completed');
      setRuntimeState(response.session?.status === 'lecture_completed' ? RUNTIME_STATES.ENDED : RUNTIME_STATES.PLAYING);
      setActivePanel(null);
      setChatMessages((response.session?.messages || []).map((message) => ({
        type: message.sender === 'user' ? 'user' : 'ai',
        text: message.content,
      })));
    } catch (error) {
      setLecture(null);
      setSession(null);
      setCurrentChunk(null);
      Toast.show({ type: 'error', text1: 'Lecture Unavailable', text2: error.message || 'Unable to load this AI lecture package.' });
    } finally {
      setLoading(false);
    }
  };

  const scheduleNext = (delay) => {
    if (!session?.id) return;
    clearTimeout(playbackRef.current);
    playbackRef.current = null;
    playbackRef.current = setTimeout(async () => {
      try {
        const response = await aiTutorAPI.getNextChunk(session.id);
        if (response.lectureCompleted || !response.chunk) {
          setLectureCompleted(true);
          setRuntimeState(RUNTIME_STATES.ENDED);
          setShowCompleteDialog(true);
          await fetchCourses();
          return;
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
        try {
          await audioRef.current.play();
          pausedPlaybackRef.current = null;
          setRuntimeState(RUNTIME_STATES.PLAYING);
          return;
        } catch (_) {}
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
      const fallbackDelay = Math.min(12000, Math.max(3600, currentNarration.length * 28));
      scheduleNext(recommendedDurationMs || fallbackDelay);
      return;
    }

    if (Platform.OS === 'web') {
      try {
        const audioResponse = await Promise.race([
          primeAudioAsset(currentNarration),
          new Promise((resolve) => setTimeout(() => resolve(null), AUDIO_PREFETCH_TIMEOUT_MS)),
        ]);
        if (audioResponse?.asset?.urlPath) {
          const cacheKey = `lecture_chunk:${currentNarration}`;
          const audio = audioElementCacheRef.current.get(cacheKey) || new Audio(`${baseHost}${audioResponse.asset.urlPath}`);
          audioElementCacheRef.current.delete(cacheKey);
          audio.preload = 'auto';
          try { audio.currentTime = 0; } catch (_) {}
          audioRef.current = audio;
          audio.onended = () => scheduleNext(MAX_CHUNK_GAP_MS);
          audio.onerror = () => scheduleNext(ERROR_CHUNK_GAP_MS);
          await audio.play();
          return;
        }
      } catch (_) {}

      if (window?.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(currentNarration);
        utterance.onend = () => scheduleNext(MAX_CHUNK_GAP_MS);
        utterance.onerror = () => scheduleNext(ERROR_CHUNK_GAP_MS);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        return;
      }
    }

    scheduleNext(recommendedDurationMs || Math.min(12000, Math.max(3600, currentNarration.length * 28)));
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
        if (!(pausedPlaybackRef.current?.chunkId && response.chunk?.id === currentChunk?.id)) {
          setCurrentChunk(response.chunk);
        }
        clearInterruptGreeting();
        setRuntimeState(RUNTIME_STATES.RESUMING);
        setTimeout(() => setRuntimeState(RUNTIME_STATES.PLAYING), 220);
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Session Error', text2: error.message || 'Unable to update tutor state.' });
    }
  };

  const openChatPanel = async () => {
    if (session && (runtimeState === RUNTIME_STATES.PLAYING || runtimeState === RUNTIME_STATES.RESUMING)) {
      try {
        const response = await aiTutorAPI.pauseSession(session.id, {
          pauseReason: 'student_interrupt',
          resumeLeadIn: "Now that we've cleared that up, let's continue."
        });
        if (!response.success) throw new Error(response.error || 'Unable to pause tutor session');
        setSession(response.session || session);
        pauseLecturePlayback();
        setRuntimeState(RUNTIME_STATES.STUDENT_INTERRUPT);
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Pause Failed', text2: error.message || 'Unable to pause for questions.' });
      }
    }
    setActivePanel(PANEL_KEYS.CHAT);
    await playInterruptGreeting();
  };

  const resumeLectureFromInterrupt = async () => {
    if (!session || runtimeState !== RUNTIME_STATES.STUDENT_INTERRUPT) {
      setActivePanel(null);
      return;
    }

    try {
      const response = await aiTutorAPI.resumeSession(session.id);
      if (!response.success) throw new Error(response.error || 'Unable to resume tutor session');
      setSession(response.session);
      if (!(pausedPlaybackRef.current?.chunkId && response.chunk?.id === currentChunk?.id)) {
        setCurrentChunk(response.chunk);
      }
      clearInterruptGreeting();
      setActivePanel(null);
      setRuntimeState(RUNTIME_STATES.RESUMING);
      setTimeout(() => setRuntimeState(RUNTIME_STATES.PLAYING), 220);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Resume Failed', text2: error.message || 'Unable to continue the lecture.' });
    }
  };

  const closePanel = () => {
    if (runtimeState === RUNTIME_STATES.STUDENT_INTERRUPT && activePanel === PANEL_KEYS.CHAT) {
      resumeLectureFromInterrupt();
      return;
    }
    setActivePanel(null);
  };

  const askQuestion = async () => {
    if (!question.trim() || !session) return;
    const prompt = question.trim();
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

  const startVoiceInput = async () => {
    await openChatPanel();
    if (Platform.OS !== 'web') {
      Toast.show({ type: 'info', text1: 'Voice Input', text2: 'Voice input currently requires the web speech API.' });
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      Toast.show({ type: 'error', text1: 'Not Supported', text2: 'Voice input is not supported in this browser.' });
      return;
    }
    if (isRecording) {
      stopRecognition();
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setQuestion((prev) => `${prev}${prev ? ' ' : ''}${transcript}`.trim());
      setActivePanel(PANEL_KEYS.CHAT);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.start();
  };

  const exportFlashcards = () => {
    const cards = lecture?.flashcards || [];
    if (!cards.length || Platform.OS !== 'web') {
      Toast.show({
        type: 'info',
        text1: 'Export Unavailable',
        text2: cards.length ? 'Flashcard export is available on web.' : 'No flashcards available for this lecture.',
      });
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
        setLectureCompleted(true);
        setRuntimeState(RUNTIME_STATES.ENDED);
        setShowCompleteDialog(true);
        await fetchCourses();
        return;
      }
      setSession(response.session);
      setCurrentChunk(response.chunk);
      setRuntimeState(RUNTIME_STATES.PLAYING);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Next Chunk Unavailable', text2: error.message || 'Unable to advance to the next lecture chunk.' });
    }
  };

  const toggleFlashcardReveal = (cardId) => {
    setRevealedFlashcards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const openQuiz = () => {
    if (!lecture?.id) {
      Toast.show({ type: 'error', text1: 'Quiz Unavailable', text2: 'This lecture package is missing its quiz reference.' });
      return;
    }
    if (!lectureCompleted) {
      Toast.show({ type: 'info', text1: 'Finish the Lecture', text2: 'Complete the lecture before opening the quiz.' });
      return;
    }
    navigation.navigate('Quiz', { courseId, topicId, lectureId: lecture.id });
  };

  const restartLecture = async () => {
    if (!session?.id) return;
    try {
      stopPlayback();
      stopRecognition();
      setShowCompleteDialog(false);
      const response = await aiTutorAPI.restartSession(session.id);
      if (!response.success) throw new Error(response.error || 'Unable to restart this lecture');
      setSession(response.session);
      setLecture(response.lecture || lecture);
      setCurrentChunk(response.chunk);
      setLectureCompleted(false);
      setActivePanel(null);
      setRuntimeState(RUNTIME_STATES.PLAYING);
      Toast.show({ type: 'success', text1: 'Lecture Restarted', text2: 'Starting again from the first chunk.' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Restart Failed', text2: error.message || 'Unable to restart this lecture right now.' });
    }
  };

  const renderChatPanel = () => (
    <View style={styles.drawerPanel}>
      <View style={styles.drawerHeader}>
        <View>
          <Text style={[styles.drawerEyebrow, { color: theme.colors.primary }]}>AI chat</Text>
          <Text style={[styles.drawerTitle, { color: theme.colors.textPrimary }]}>Ask the tutor</Text>
        </View>
        <TouchableOpacity style={[styles.drawerClose, { backgroundColor: isDark ? '#162130' : '#eef2ff' }]} onPress={closePanel}>
          <Icon name="close" size={18} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.chatScrollContent} showsVerticalScrollIndicator={false}>
        {!chatMessages.length && !submittingQuestion && (
          <View style={[styles.chatEmptyState, { borderColor: theme.colors.border }]}>
            <MaterialIcon name="chat-processing-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.chatEmptyTitle, { color: theme.colors.textPrimary }]}>Ask about this lecture moment</Text>
            <Text style={[styles.chatEmptyText, { color: theme.colors.textSecondary }]}>The tutor answers with the current lecture context, then you can resume immediately.</Text>
          </View>
        )}
        {chatMessages.map((message, index) => (
          <View key={`${message.type}-${index}`} style={[styles.chatBubble, message.type === 'user' ? styles.chatBubbleUser : [styles.chatBubbleAi, { borderColor: theme.colors.border }]]}>
            <Text style={[styles.chatRole, { color: message.type === 'user' ? 'rgba(255,255,255,0.82)' : theme.colors.primary }]}>{message.type === 'user' ? 'You' : 'AI Tutor'}</Text>
            <Text style={{ color: message.type === 'user' ? '#fff' : theme.colors.textPrimary, lineHeight: 21 }}>{message.text}</Text>
          </View>
        ))}
        {submittingQuestion && (
          <View style={[styles.chatBubble, styles.chatBubbleAi, { borderColor: theme.colors.border }]}>
            <Text style={[styles.chatRole, { color: theme.colors.primary }]}>AI Tutor</Text>
            <Text style={{ color: theme.colors.textSecondary }}>Preparing a contextual explanation...</Text>
          </View>
        )}
      </ScrollView>
      <View style={[styles.drawerComposer, { borderColor: theme.colors.border, backgroundColor: isDark ? '#101827' : '#f8fafc' }]}>
        <TouchableOpacity style={[styles.circleIcon, { backgroundColor: isRecording ? theme.colors.error : theme.colors.primary }]} onPress={startVoiceInput}>
          <Icon name={isRecording ? 'stop' : 'mic'} size={18} color="#fff" />
        </TouchableOpacity>
        <TextInput
          style={[styles.drawerInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#172332' : '#ffffff' }]}
          value={question}
          onChangeText={setQuestion}
          onSubmitEditing={askQuestion}
          placeholder={isRecording ? 'Listening...' : 'Type your question...'}
          placeholderTextColor={theme.colors.textTertiary}
          multiline
        />
        <TouchableOpacity style={[styles.circleIcon, { backgroundColor: theme.colors.primary }]} onPress={askQuestion} disabled={submittingQuestion}>
          {submittingQuestion ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNotesPanel = () => (
    <View style={styles.drawerPanel}>
      <View style={styles.drawerHeader}>
        <View>
          <Text style={[styles.drawerEyebrow, { color: theme.colors.primary }]}>Lecture notes</Text>
          <Text style={[styles.drawerTitle, { color: theme.colors.textPrimary }]}>{lecture.title}</Text>
        </View>
        <TouchableOpacity style={[styles.drawerClose, { backgroundColor: isDark ? '#162130' : '#eef2ff' }]} onPress={closePanel}>
          <Icon name="close" size={18} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.notesLead, { color: theme.colors.textSecondary }]}>{lecture.summary}</Text>
        {(currentSlides.length ? currentSlides : lecture.slideOutlines || []).map((slide, index) => (
          <View key={slide.id || index} style={[styles.noteSection, { borderColor: theme.colors.border }]}>
            <Text style={[styles.noteSectionTitle, { color: theme.colors.primary }]}>{slide.title}</Text>
            {(slide.bullets || []).map((bullet, bulletIndex) => (
              <Text key={`${slide.id || index}-${bulletIndex}`} style={[styles.notesBody, { color: theme.colors.textPrimary }]}>- {bullet}</Text>
            ))}
            {!!slide.notes && <Text style={[styles.notesBody, { color: theme.colors.textSecondary }]}>{slide.notes}</Text>}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderFlashcardsPanel = () => (
    <View style={styles.drawerPanel}>
      <View style={styles.drawerHeader}>
        <View>
          <Text style={[styles.drawerEyebrow, { color: theme.colors.primary }]}>Flashcards</Text>
          <Text style={[styles.drawerTitle, { color: theme.colors.textPrimary }]}>Review key ideas</Text>
        </View>
        <TouchableOpacity style={[styles.drawerClose, { backgroundColor: isDark ? '#162130' : '#eef2ff' }]} onPress={closePanel}>
          <Icon name="close" size={18} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
        {(lecture.flashcards || []).map((card, index) => {
          const cardId = card.id || index;
          const revealed = Boolean(revealedFlashcards[cardId]);
          return (
            <TouchableOpacity key={cardId} activeOpacity={0.92} onPress={() => toggleFlashcardReveal(cardId)} style={[styles.flashcard, { borderColor: theme.colors.border, backgroundColor: isDark ? '#101827' : '#f8fafc' }]}>
              <View style={styles.flashcardHeader}>
                <Text style={[styles.flashcardLabel, { color: theme.colors.primary }]}>{revealed ? 'Answer' : 'Prompt'}</Text>
                <Text style={[styles.flashcardHint, { color: theme.colors.textTertiary }]}>{revealed ? 'Tap to hide' : 'Tap to reveal'}</Text>
              </View>
              <Text style={[styles.flashcardFront, { color: theme.colors.textPrimary }]}>{revealed ? card.backText : card.frontText}</Text>
              <View style={[styles.flashcardDivider, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.flashcardMeta, { color: theme.colors.textSecondary }]}>{revealed ? 'Use this answer to confirm your recall.' : 'Try answering from memory before revealing the back.'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TouchableOpacity style={[styles.drawerAction, { backgroundColor: isDark ? '#162130' : '#e0e7ff', borderColor: theme.colors.border }]} onPress={exportFlashcards}>
        <Icon name="download-outline" size={18} color={theme.colors.primary} />
        <Text style={[styles.drawerActionText, { color: theme.colors.primary }]}>Export flashcards</Text>
      </TouchableOpacity>
    </View>
  );

  const renderToolsPanel = () => (
    <View style={styles.drawerPanel}>
      <View style={styles.drawerHeader}>
        <View>
          <Text style={[styles.drawerEyebrow, { color: theme.colors.primary }]}>Classroom tools</Text>
          <Text style={[styles.drawerTitle, { color: theme.colors.textPrimary }]}>Lecture essentials</Text>
        </View>
        <TouchableOpacity style={[styles.drawerClose, { backgroundColor: isDark ? '#162130' : '#eef2ff' }]} onPress={closePanel}>
          <Icon name="close" size={18} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.moreBlock, { borderColor: theme.colors.border, backgroundColor: isDark ? 'rgba(15,23,42,0.72)' : '#f8fafc' }]}>
          <Text style={[styles.moreBlockEyebrow, { color: theme.colors.primary }]}>Now teaching</Text>
          <Text style={[styles.moreBlockTitle, { color: theme.colors.textPrimary }]}>{lecture.title}</Text>
          <Text style={[styles.moreBlockText, { color: theme.colors.textSecondary }]}>
            Section {currentChunk.sectionIndex + 1} | Chunk {currentChunk.chunkIndex + 1}
          </Text>
          {!!lectureDurationLabel && <Text style={[styles.moreBlockText, { color: theme.colors.textSecondary }]}>{lectureDurationLabel}</Text>}
        </View>
        {(supportPanel || checkpointText || reinforcementPoints.length || confusionPoints.length) && (
          <View style={[styles.moreBlock, { borderColor: theme.colors.border }]}>
            <Text style={[styles.moreBlockEyebrow, { color: theme.colors.primary }]}>Teaching guidance</Text>
            {!!supportPanel?.title && <Text style={[styles.moreBlockTitle, { color: theme.colors.textPrimary }]}>{supportPanel.title}</Text>}
            {!!supportPanel?.text && <Text style={[styles.moreBlockText, { color: theme.colors.textSecondary }]}>{supportPanel.text}</Text>}
            {!!checkpointText && (
              <Text style={[styles.moreCallout, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? 'rgba(15,23,42,0.74)' : '#ffffff' }]}>
                Checkpoint: {checkpointText}
              </Text>
            )}
            {!!reinforcementPoints.length && (
              <View style={styles.moreListGroup}>
                <Text style={[styles.moreListLabel, { color: theme.colors.textPrimary }]}>Reinforce</Text>
                {reinforcementPoints.slice(0, 3).map((point, index) => (
                  <Text key={`${point}-${index}`} style={[styles.moreBullet, { color: theme.colors.textSecondary }]}>- {point}</Text>
                ))}
              </View>
            )}
            {!!confusionPoints.length && (
              <View style={styles.moreListGroup}>
                <Text style={[styles.moreListLabel, { color: theme.colors.textPrimary }]}>Watch for confusion</Text>
                {confusionPoints.slice(0, 3).map((point, index) => (
                  <Text key={`${point}-${index}`} style={[styles.moreBullet, { color: theme.colors.textSecondary }]}>- {point}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
      <View style={styles.moreActions}>
        <TouchableOpacity style={[styles.secondaryAction, { borderColor: theme.colors.border, backgroundColor: isDark ? '#101827' : '#ffffff' }]} onPress={restartLecture}>
          <Icon name="refresh" size={18} color={theme.colors.textPrimary} />
          <Text style={[styles.secondaryActionText, { color: theme.colors.textPrimary }]}>Restart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryAction, { borderColor: theme.colors.border, backgroundColor: isDark ? '#101827' : '#ffffff' }]} onPress={exportFlashcards}>
          <Icon name="download-outline" size={18} color={theme.colors.textPrimary} />
          <Text style={[styles.secondaryActionText, { color: theme.colors.textPrimary }]}>Export</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTopicsPanel = () => (
    <View style={styles.drawerPanel}>
      <View style={styles.drawerHeader}>
        <View>
          <Text style={[styles.drawerEyebrow, { color: theme.colors.primary }]}>Course topics</Text>
          <Text style={[styles.drawerTitle, { color: theme.colors.textPrimary }]}>Topic tray</Text>
        </View>
        <TouchableOpacity style={[styles.drawerClose, { backgroundColor: isDark ? '#162130' : '#eef2ff' }]} onPress={closePanel}>
          <Icon name="close" size={18} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
        {(course?.topics || []).map((item) => {
          const isCurrent = item.id === topicId;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.topicRow, { backgroundColor: isCurrent ? (isDark ? '#162130' : '#eef2ff') : 'transparent', borderColor: theme.colors.border }]}
              disabled={item.status === 'locked'}
              onPress={() => {
                closePanel();
                if (!isCurrent) navigation.replace('Learning', { courseId, topicId: item.id });
              }}
            >
              <View style={styles.topicCopy}>
                <Text style={[styles.topicTitle, { color: item.status === 'locked' ? theme.colors.textTertiary : theme.colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.topicMeta, { color: theme.colors.textSecondary }]}>{item.completed ? 'Completed' : item.status === 'locked' ? 'Locked' : isCurrent ? 'Current topic' : 'Ready'}</Text>
              </View>
              <Text style={[styles.topicState, { color: item.completed ? '#22c55e' : isCurrent ? theme.colors.primary : theme.colors.textTertiary }]}>{item.completed ? 'Done' : isCurrent ? `${progress}%` : item.status === 'locked' ? 'Locked' : 'Open'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderDockPlaceholder = () => (
    <View style={styles.drawerPlaceholder}>
      <Text style={[styles.drawerPlaceholderTitle, { color: theme.colors.textPrimary }]}>Classroom side panel</Text>
      <Text style={[styles.drawerPlaceholderText, { color: theme.colors.textSecondary }]}>
        Open tools, notes, help, or topics here without changing the whiteboard size.
      </Text>
    </View>
  );

  const renderPanel = () => {
    switch (activePanel) {
      case PANEL_KEYS.CHAT: return renderChatPanel();
      case PANEL_KEYS.NOTES: return renderNotesPanel();
      case PANEL_KEYS.FLASHCARDS: return renderFlashcardsPanel();
      case PANEL_KEYS.TOOLS: return renderToolsPanel();
      case PANEL_KEYS.TOPICS: return renderTopicsPanel();
      default: return null;
    }
  };

  const renderTopButton = ({ key, icon, label, onPress, active, disabled, iconSet = 'ion', tone = 'default' }) => {
    const IconComponent = iconSet === 'material' ? MaterialIcon : Icon;
    const isAttention = tone === 'attention';
    const activeBackground = isAttention ? 'rgba(245, 158, 11, 0.16)' : `${theme.colors.primary}20`;
    const activeBorder = isAttention ? 'rgba(245, 158, 11, 0.38)' : `${theme.colors.primary}66`;
    const activeIcon = isAttention ? '#f59e0b' : theme.colors.primary;
    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.topActionButton,
          {
            backgroundColor: active ? activeBackground : (isDark ? 'rgba(15,23,42,0.74)' : 'rgba(255,255,255,0.92)'),
            borderColor: active ? activeBorder : theme.colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(active) }}
      >
        <View style={[styles.topActionIconWrap, active && { backgroundColor: isAttention ? 'rgba(245,158,11,0.18)' : 'rgba(37,99,235,0.14)' }]}>
          <IconComponent name={icon} size={18} color={active ? activeIcon : theme.colors.textSecondary} />
        </View>
        {!isMobile && (
          <View style={styles.topActionCopy}>
            <Text style={[styles.topActionLabel, { color: active ? theme.colors.textPrimary : theme.colors.textSecondary }]}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!course || !topic) {
    return (
      <MainLayout showSidebar={false} showHeader={false}>
        <View style={styles.centered}>
          <EmptyState icon="alert-circle-outline" title="Topic not found" subtitle="The topic you're looking for doesn't exist." />
        </View>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout showSidebar={false} showHeader={false}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading AI lecture package...</Text>
        </View>
      </MainLayout>
    );
  }

  if (!isEnrolled) {
    return (
      <MainLayout showSidebar={false} showHeader={false}>
        <View style={styles.centered}>
          <EmptyState icon="lock-closed-outline" title="Not Enrolled" subtitle="You need to enroll in this course to access lectures." />
        </View>
      </MainLayout>
    );
  }

  if (!lecture || !currentChunk) {
    return (
      <MainLayout showSidebar={false} showHeader={false}>
        <View style={styles.centered}>
          <EmptyState icon="sparkles-outline" title="Lecture Not Ready" subtitle="This topic does not have a generated lecture package yet." />
        </View>
      </MainLayout>
    );
  }

  const topActions = [
    { key: 'pause', icon: isPlaying ? 'pause' : 'play', label: isPlaying ? 'Pause' : 'Resume', onPress: togglePause, active: false, disabled: false },
    { key: 'raise-hand', icon: 'hand-right-outline', label: 'Raise Hand', onPress: openChatPanel, active: runtimeState === RUNTIME_STATES.STUDENT_INTERRUPT, disabled: false, tone: 'attention' },
    { key: 'mic', icon: isRecording ? 'stop' : 'mic-outline', label: isRecording ? 'Stop Mic' : 'Mic', onPress: startVoiceInput, active: isRecording, disabled: false },
    { key: 'voice', icon: voiceMode ? 'volume-high' : 'volume-off', label: voiceMode ? 'Voice On' : 'Voice Off', onPress: () => setVoiceMode((prev) => !prev), active: voiceMode, disabled: false, iconSet: 'material' },
    { key: 'chat', icon: 'chatbubble-ellipses-outline', label: 'AI Chat', onPress: openChatPanel, active: activePanel === PANEL_KEYS.CHAT, disabled: false },
    { key: 'notes', icon: 'document-text-outline', label: 'Notes', onPress: () => setActivePanel(PANEL_KEYS.NOTES), active: activePanel === PANEL_KEYS.NOTES, disabled: false },
    { key: 'flashcards', icon: 'cards-outline', label: 'Flashcards', onPress: () => setActivePanel(PANEL_KEYS.FLASHCARDS), active: activePanel === PANEL_KEYS.FLASHCARDS, disabled: !(lecture.flashcards || []).length, iconSet: 'material' },
    { key: 'quiz', icon: 'help-circle-outline', label: 'Quiz', onPress: openQuiz, active: false, disabled: false, iconSet: 'material' },
    { key: 'tools', icon: 'grid-outline', label: 'Essentials', onPress: () => setActivePanel(PANEL_KEYS.TOOLS), active: activePanel === PANEL_KEYS.TOOLS, disabled: false },
    { key: 'topics', icon: 'library-outline', label: 'Topics', onPress: () => setActivePanel(PANEL_KEYS.TOPICS), active: activePanel === PANEL_KEYS.TOPICS, disabled: false },
    { key: 'next', icon: 'play-skip-forward', label: 'Next', onPress: goToNextChunk, active: false, disabled: lectureCompleted },
  ];

  const primaryTopActions = topActions.slice(0, 6);
  const secondaryTopActions = topActions.slice(6);

  return (
    <MainLayout showSidebar={false} showHeader={false}>
      <View style={[styles.screen, { backgroundColor: isDark ? '#08111d' : '#eef4fb' }]}>
        <View style={[styles.backgroundGlow, styles.backgroundGlowTop, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : 'rgba(96, 165, 250, 0.18)' }]} />
        <View style={[styles.backgroundGlow, styles.backgroundGlowBottom, { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.12)' : 'rgba(14, 165, 233, 0.14)' }]} />

        <View style={[styles.shell, { padding: isMobile ? 12 : 20 }]}>
          <View style={[styles.topBar, isCompact && styles.topBarStack, { backgroundColor: isDark ? 'rgba(8,17,29,0.9)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.22)' }]}>
            <View style={styles.topBarLeft}>
              <TouchableOpacity style={[styles.backButton, { backgroundColor: isDark ? '#0f1a2a' : '#ffffff', borderColor: theme.colors.border }]} onPress={() => navigation.goBack()}>
                <Icon name="arrow-back" size={18} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.sessionMeta}>
                <View style={styles.sessionMetaRow}>
                  <View style={[styles.livePill, { backgroundColor: `${tutorStatus.tone}20`, borderColor: `${tutorStatus.tone}33` }]}>
                    <View style={[styles.liveDot, { backgroundColor: tutorStatus.tone }]} />
                    <Text style={[styles.livePillText, { color: tutorStatus.tone }]}>{lectureCompleted ? 'Complete' : 'Live lecture'}</Text>
                  </View>
                  <Text style={[styles.sessionCourse, { color: theme.colors.textSecondary }]} numberOfLines={1}>{course.title}</Text>
                </View>
                <Text style={[styles.sessionTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>{lecture.title}</Text>
                <Text style={[styles.sessionSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  Section {currentChunk.sectionIndex + 1} - Chunk {Math.min(currentIndex + 1, totalChunks)} of {totalChunks}{lectureDurationLabel ? ` - ${lectureDurationLabel}` : ''}
                </Text>
              </View>
            </View>

            <View style={[styles.topBarRight, isCompact && styles.topBarRightStack]}>
              <View style={styles.topStatusRail}>
                <View style={[styles.progressCluster, isMobile && styles.progressClusterCompact, { backgroundColor: isDark ? '#0d1725' : '#f8fbff', borderColor: theme.colors.border }]}>
                  <View style={styles.progressHeaderRow}>
                    <Text style={[styles.progressCaption, { color: theme.colors.textSecondary }]}>Lecture progress</Text>
                    <Text style={[styles.progressMeta, { color: theme.colors.textSecondary }]}>{currentIndex + 1}/{totalChunks}</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.colors.primary }]} />
                  </View>
                  <Text style={[styles.progressValue, { color: theme.colors.textPrimary }]}>{progress}%</Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: isDark ? '#0d1725' : '#f8fbff', borderColor: theme.colors.border }]}>
                  <View style={[styles.statusBadgeDot, { backgroundColor: tutorStatus.tone }]} />
                  <View style={styles.statusBadgeCopy}>
                    <Text style={[styles.statusBadgeLabel, { color: theme.colors.textPrimary }]} numberOfLines={1}>{tutorStatus.label}</Text>
                    <Text style={[styles.statusBadgeMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>{currentScene?.title || classroomModeLabel}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.controlDock, isMobile && styles.controlDockCompact, { backgroundColor: isDark ? 'rgba(15,23,42,0.76)' : 'rgba(248,250,252,0.96)', borderColor: theme.colors.border }]}>
                <View style={[styles.commandBar, isMobile && styles.commandBarCompact]}>
                  {primaryTopActions.map(renderTopButton)}
                </View>
                <View style={[styles.commandDivider, { backgroundColor: theme.colors.border }]} />
                <View style={[styles.commandBar, styles.commandBarSecondary, isMobile && styles.commandBarCompact]}>
                  {secondaryTopActions.map(renderTopButton)}
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.mainRow, { flexDirection: isCompact ? 'column' : 'row', height: classroomHeight }]}>
            <View style={styles.stageColumn}>
              <View style={[styles.stageFrame, { height: stageHeight, backgroundColor: isDark ? '#f8fbff' : '#ffffff', borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.20)' }]}>
                <WhiteboardStage
                  boardState={boardState}
                  currentScene={currentScene}
                  objectiveText={lecturePlan.objectiveText}
                  status={tutorStatus}
                  modeLabel={`${whiteboardModeLabel} | ${teachingStyleLabel}`}
                />
              </View>

              <View style={[styles.subtitleStrip, { backgroundColor: isDark ? 'rgba(8,17,29,0.92)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.22)' }]}>
                <View style={styles.subtitleHeader}>
                  <Text style={[styles.subtitleLabel, { color: theme.colors.primary }]}>Lecture subtitles</Text>
                  <Text style={[styles.subtitleMeta, { color: theme.colors.textSecondary }]}>{runtimeState === RUNTIME_STATES.STUDENT_INTERRUPT ? 'Help mode' : (currentScene?.title || classroomModeLabel)}</Text>
                </View>
                <Text style={[styles.subtitleText, { color: theme.colors.textPrimary }]} numberOfLines={isMobile ? 2 : 3}>{displaySubtitleText || 'The lecture narration will appear here as the tutor teaches.'}</Text>
              </View>
            </View>

            {!isCompact && (
              <View style={[styles.drawerRail, { width: panelWidth, backgroundColor: isDark ? 'rgba(8,17,29,0.9)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.22)' }]}>
                {activePanel ? renderPanel() : renderDockPlaceholder()}
              </View>
            )}
          </View>
        </View>

        {isCompact && activePanel && (
          <>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closePanel} />
            <View style={[styles.compactDrawer, { width: panelWidth, backgroundColor: isDark ? '#08111d' : '#ffffff', borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.22)' }]}>
              {renderPanel()}
            </View>
          </>
        )}
      </View>

      <ConfirmDialog
        visible={showCompleteDialog}
        title="Lecture Complete"
        message="The lecture is finished. Open the quiz to unlock the next topic, or restart this lecture from the beginning."
        confirmText="Open Quiz"
        confirmVariant="primary"
        onConfirm={() => {
          setShowCompleteDialog(false);
          openQuiz();
        }}
        onCancel={() => setShowCompleteDialog(false)}
      />
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  backgroundGlow: { position: 'absolute', width: 420, height: 420, borderRadius: 210, opacity: 0.9 },
  backgroundGlowTop: { top: -140, right: -60 },
  backgroundGlowBottom: { left: -120, bottom: -180 },
  shell: { flex: 1, gap: 14, overflow: 'hidden' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16 },
  topBar: { borderWidth: 1, borderRadius: 24, padding: 14, flexDirection: 'row', justifyContent: 'space-between', gap: 16, overflow: 'hidden' },
  topBarStack: { flexDirection: 'column' },
  topBarLeft: { flex: 1, flexDirection: 'row', gap: 12, minWidth: 0 },
  backButton: { width: 46, height: 46, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  sessionMeta: { flex: 1, minWidth: 0, justifyContent: 'center' },
  sessionMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 999 },
  livePillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  sessionCourse: { fontSize: 12, flexShrink: 1 },
  sessionTitle: { fontSize: 19, fontWeight: '800', marginBottom: 2 },
  sessionSubtitle: { fontSize: 13 },
  topBarRight: { flexDirection: 'row', alignItems: 'stretch', gap: 12, flexShrink: 1 },
  topBarRightStack: { flexDirection: 'column', alignItems: 'stretch' },
  topStatusRail: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  progressCluster: { minWidth: 176, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 8, justifyContent: 'center' },
  progressClusterCompact: { minWidth: 0, width: '100%' },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  progressCaption: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  progressMeta: { fontSize: 11, fontWeight: '700' },
  progressTrack: { height: 7, borderRadius: 999, backgroundColor: 'rgba(148, 163, 184, 0.2)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  progressValue: { fontSize: 15, fontWeight: '800' },
  statusBadge: { minWidth: 200, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadgeDot: { width: 10, height: 10, borderRadius: 999 },
  statusBadgeCopy: { flex: 1, minWidth: 0 },
  statusBadgeLabel: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  statusBadgeMeta: { fontSize: 12, fontWeight: '600' },
  controlDock: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0, maxWidth: 760 },
  controlDockCompact: { width: '100%', flexDirection: 'column', alignItems: 'stretch' },
  commandBar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, maxWidth: 720, minWidth: 0 },
  commandBarCompact: { maxWidth: '100%' },
  commandBarSecondary: { flexShrink: 1 },
  commandDivider: { width: 1, alignSelf: 'stretch', opacity: 0.9 },
  topActionButton: { minHeight: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 46 },
  topActionIconWrap: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  topActionCopy: { minWidth: 0 },
  topActionLabel: { fontSize: 12, fontWeight: '800' },
  mainRow: { flex: 1, gap: 14, overflow: 'hidden', minHeight: 0, maxHeight: '100%' },
  stageColumn: { flex: 1, gap: 12, minHeight: 0, maxHeight: '100%', overflow: 'hidden' },
  stageFrame: { borderRadius: 28, borderWidth: 1, overflow: 'hidden', flexShrink: 0 },
  subtitleStrip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, minHeight: 72, justifyContent: 'center' },
  subtitleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subtitleLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  subtitleMeta: { fontSize: 12, fontWeight: '600' },
  subtitleText: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  drawerRail: { borderWidth: 1, borderRadius: 26, overflow: 'hidden', minHeight: 0, maxHeight: '100%', flexShrink: 0 },
  drawerPlaceholder: { flex: 1, justifyContent: 'center', padding: 24 },
  drawerPlaceholderTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  drawerPlaceholderText: { fontSize: 13, lineHeight: 21 },
  drawerPanel: { flex: 1, padding: 18, minHeight: 0, maxHeight: '100%', overflow: 'hidden' },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 },
  drawerEyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  drawerTitle: { fontSize: 20, fontWeight: '800' },
  drawerClose: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  drawerScroll: { flex: 1, minHeight: 0, maxHeight: '100%' },
  drawerComposer: { borderWidth: 1, borderRadius: 20, padding: 10, alignItems: 'flex-end', flexDirection: 'row', gap: 8, marginTop: 12 },
  circleIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  drawerInput: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  chatScrollContent: { paddingBottom: 6 },
  chatEmptyState: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 10 },
  chatEmptyTitle: { fontSize: 14, fontWeight: '700', marginTop: 8, marginBottom: 6, textAlign: 'center' },
  chatEmptyText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  chatBubble: { padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: '96%', borderWidth: 1 },
  chatBubbleUser: { backgroundColor: '#4f46e5', alignSelf: 'flex-end', borderColor: '#4f46e5' },
  chatBubbleAi: { backgroundColor: 'rgba(79,70,229,0.08)', alignSelf: 'flex-start' },
  chatRole: { fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  notesLead: { fontSize: 14, lineHeight: 22, marginBottom: 14 },
  noteSection: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 12 },
  noteSectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  notesBody: { fontSize: 14, lineHeight: 22, marginBottom: 6 },
  flashcard: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
  flashcardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12 },
  flashcardLabel: { fontSize: 12, fontWeight: '800' },
  flashcardHint: { fontSize: 11, fontWeight: '600' },
  flashcardFront: { fontSize: 16, lineHeight: 24, marginBottom: 12, fontWeight: '600' },
  flashcardDivider: { height: 1, marginBottom: 12 },
  flashcardMeta: { fontSize: 12, lineHeight: 18 },
  drawerAction: { marginTop: 12, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 },
  drawerActionText: { fontSize: 14, fontWeight: '700' },
  moreBlock: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 12 },
  moreBlockEyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  moreBlockTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  moreBlockText: { fontSize: 13, lineHeight: 20, marginBottom: 4 },
  moreCallout: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, lineHeight: 19, fontWeight: '600', marginTop: 8 },
  moreListGroup: { marginTop: 12 },
  moreListLabel: { fontSize: 12, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  moreBullet: { fontSize: 13, lineHeight: 20, marginBottom: 4 },
  topicRow: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  topicCopy: { flex: 1, minWidth: 0 },
  topicTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  topicMeta: { fontSize: 12 },
  topicState: { fontSize: 12, fontWeight: '800' },
  moreActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  secondaryAction: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryActionText: { fontSize: 13, fontWeight: '700' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(3, 7, 18, 0.52)' },
  compactDrawer: { position: 'absolute', top: 12, right: 12, bottom: 12, borderWidth: 1, borderRadius: 24, overflow: 'hidden', maxHeight: '100%' },
});

export default LearningScreen;
