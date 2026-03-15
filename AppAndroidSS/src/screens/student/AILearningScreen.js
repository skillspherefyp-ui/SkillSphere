import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Animated as RNAnimated,
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
import AppButton from '../../components/ui/AppButton';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { aiTutorAPI, API_BASE } from '../../services/apiClient';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const LearningScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const sidebarItems = [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Browse Courses', icon: 'library-outline', iconActive: 'library', route: 'Courses' },
    { label: 'My Learning', icon: 'school-outline', iconActive: 'school', route: 'EnrolledCourses' },
    { label: 'AI Assistant', icon: 'sparkles-outline', iconActive: 'sparkles', route: 'AITutor' },
    { label: 'Certificates', icon: 'ribbon-outline', iconActive: 'ribbon', route: 'Certificates' },
    { label: 'Reminders', icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle', route: 'Todo' },
  ];
  const handleNavigate = (routeName) => navigation.navigate(routeName);
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
  const [showQuestionPanel, setShowQuestionPanel] = useState(false);
  const [activeToolPanel, setActiveToolPanel] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [voiceMode, setVoiceMode] = useState(Platform.OS === 'web');
  const [isRecording, setIsRecording] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [lectureCompleted, setLectureCompleted] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showTopicsSidebar, setShowTopicsSidebar] = useState(false);
  const [revealedFlashcards, setRevealedFlashcards] = useState({});
  const [teachingProgress, setTeachingProgress] = useState(0);
  const [quizPreview, setQuizPreview] = useState(null);
  const [quizPreviewLoading, setQuizPreviewLoading] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  const recognitionRef = useRef(null);
  const playbackRef = useRef(null);
  const audioRef = useRef(null);
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const baseHost = API_BASE.replace(/\/api$/, '');
  const isMobile = width < 768;

  const orderedChunks = useMemo(() => {
    return (lecture?.sections || []).slice().sort((a, b) => {
      if (a.sectionIndex === b.sectionIndex) {
        return a.chunkIndex - b.chunkIndex;
      }
      return a.sectionIndex - b.sectionIndex;
    });
  }, [lecture]);

  const currentIndex = useMemo(() => {
    if (!currentChunk) return 0;
    const index = orderedChunks.findIndex((item) => item.id === currentChunk.id);
    return index >= 0 ? index : 0;
  }, [orderedChunks, currentChunk]);

  const progress = orderedChunks.length ? Math.min(100, Math.round(((currentIndex + (lectureCompleted ? 1 : 0)) / orderedChunks.length) * 100)) : 0;
  const currentVisual = (lecture?.visualSuggestions || []).find((item) => item.sectionIndex === currentChunk?.sectionIndex);
  const currentSlides = (lecture?.slideOutlines || []).filter((slide) => slide.slideIndex === currentChunk?.sectionIndex);
  const totalChunks = orderedChunks.length || 1;
  const currentSlide = currentSlides[0];
  const currentDelivery = currentChunk?.delivery || null;
  const panelContent = currentDelivery?.panel_content || {};
  const teachingPlan = currentDelivery?.teaching_plan || currentChunk?.teachingPlan || {};
  const classroomMode = currentDelivery?.classroom_mode || 'narration_only';
  const classroomModeLabel = currentDelivery?.classroom_mode_label || 'Narration only';
  const boardContent = currentDelivery?.board_content || panelContent.boardContent || null;
  const supportPanel = currentDelivery?.support_panel || panelContent.supportPanel || null;
  const narrationSegments = currentDelivery?.narration_segments || [];
  const currentNarration = currentDelivery?.narration_text || currentChunk?.spokenExplanation || currentChunk?.text || '';
  const transitionText = currentDelivery?.transition_text || panelContent.transitionIn || '';
  const checkpointText = currentDelivery?.checkpoint_text || panelContent.checkpointQuestion || currentChunk?.checkpointQuestion || '';
  const reinforcementPoints = panelContent.reinforcementPoints || teachingPlan.reinforcement_points || [];
  const confusionPoints = panelContent.likelyConfusionPoints || teachingPlan.likely_confusion_points || [];
  const teachingStyleLabel = currentDelivery?.teaching_style_label || panelContent.teachingStyleLabel || 'Brief explanation';
  const conceptTypeLabel = teachingPlan?.concept_type ? teachingPlan.concept_type.replace(/-/g, ' ') : 'conceptual';
  const recommendedDurationMs = ((currentDelivery?.recommended_duration_seconds || currentChunk?.estimatedDurationSeconds || 0) > 0
    ? (currentDelivery?.recommended_duration_seconds || currentChunk?.estimatedDurationSeconds) * 1000
    : 0);
  const currentModeLabel = currentDelivery?.current_mode_label || (showQuestionPanel ? 'Answering your question' : voiceMode ? 'Explaining' : 'Teaching in text mode');
  const formatLectureDuration = (minutes) => {
    const value = Number(minutes);
    if (!Number.isFinite(value) || value <= 0) return '';
    if (value < 60) return `${value} min lecture`;

    const hours = Math.floor(value / 60);
    const remainingMinutes = value % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m lecture` : `${hours}h lecture`;
  };
  const lectureDurationLabel = formatLectureDuration(lecture?.estimatedDurationMinutes);
  const isDrawerOpen = Boolean(activeToolPanel);
  const tutorStatus = lectureCompleted
    ? { label: 'Lecture complete', detail: 'Open the stored quiz when you are ready to continue.', tone: '#10b981' }
    : showQuestionPanel
      ? { label: 'Paused for your question', detail: submittingQuestion ? 'AI Tutor is preparing a contextual answer.' : 'Ask for clarification, then resume from this exact chunk.', tone: '#f59e0b' }
      : isPlaying
        ? { label: currentModeLabel, detail: transitionText || (currentDelivery?.next_action ? `Sequence: ${(currentDelivery.teaching_sequence || []).join(' -> ')}.` : (voiceMode ? 'Voice delivery is active for this section.' : 'Stored lecture chunks are advancing in text mode.')), tone: '#3b82f6' }
        : { label: 'Ready to resume', detail: 'Resume when you are ready for the next chunk.', tone: '#6366f1' };

  useEffect(() => {
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: USE_NATIVE_DRIVER }),
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    if (voiceMode) pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, voiceMode]);

  useEffect(() => {
    loadLecture();
    return () => {
      stopPlayback();
      stopRecognition();
    };
  }, [topicId, voiceMode]);

  useEffect(() => {
    setRevealedFlashcards({});
  }, [lecture?.id]);

  useEffect(() => {
    if (activeToolPanel !== 'quiz' || !lecture?.id) {
      return;
    }

    let cancelled = false;
    const loadQuizPreview = async () => {
      setQuizPreviewLoading(true);
      try {
        const response = await aiTutorAPI.getQuiz(lecture.id);
        if (!cancelled && response.success) {
          setQuizPreview(response.quiz || null);
        }
      } catch (_) {
        if (!cancelled) {
          setQuizPreview(null);
        }
      } finally {
        if (!cancelled) {
          setQuizPreviewLoading(false);
        }
      }
    };

    loadQuizPreview();
    return () => {
      cancelled = true;
    };
  }, [activeToolPanel, lecture?.id]);

  useEffect(() => {
    if (session && currentChunk && isPlaying && !showQuestionPanel && !lectureCompleted) {
      playChunk();
    } else {
      stopPlayback();
    }

    return () => stopPlayback();
  }, [session?.id, currentChunk?.id, isPlaying, showQuestionPanel, lectureCompleted, voiceMode]);

  useEffect(() => {
    setTeachingProgress(0);
  }, [currentChunk?.id]);

  useEffect(() => {
    if (!currentChunk || !isPlaying || showQuestionPanel || lectureCompleted) {
      return undefined;
    }

    const duration = recommendedDurationMs || Math.min(12000, Math.max(3600, currentNarration.length * 28));
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const nextProgress = Math.min(1, (Date.now() - startedAt) / duration);
      setTeachingProgress(nextProgress);
      if (nextProgress >= 1) {
        clearInterval(timer);
      }
    }, 180);

    return () => clearInterval(timer);
  }, [currentChunk?.id, isPlaying, showQuestionPanel, lectureCompleted, recommendedDurationMs, currentNarration]);

  const stopPlayback = () => {
    if (playbackRef.current) {
      clearTimeout(playbackRef.current);
      playbackRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause?.();
      audioRef.current = null;
    }
    if (Platform.OS === 'web' && window?.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
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
      if (!response.success) {
        throw new Error(response.error || 'Unable to start tutor session');
      }

      let nextLecture = response.lecture;
      if (response.lecture?.id && !(response.lecture.flashcards || []).length) {
        try {
          const flashcardResponse = await aiTutorAPI.getFlashcards(response.lecture.id);
          if (flashcardResponse.success) {
            nextLecture = {
              ...response.lecture,
              flashcards: flashcardResponse.flashcards || [],
            };
          }
        } catch (_) {
        }
      }

      setLecture(nextLecture);
      setSession(response.session);
      setCurrentChunk(response.chunk);
      setLectureCompleted(response.session?.status === 'lecture_completed');
      setChatMessages((response.session?.messages || []).map((message) => ({
        type: message.sender === 'user' ? 'user' : 'ai',
        text: message.content,
      })));
    } catch (error) {
      setLecture(null);
      setSession(null);
      setCurrentChunk(null);
      Toast.show({
        type: 'error',
        text1: 'Lecture Unavailable',
        text2: error.message || 'Unable to load this AI lecture package.',
      });
    } finally {
      setLoading(false);
    }
  };

  const scheduleNext = (delay) => {
    if (!session?.id) {
      return;
    }

    stopPlayback();
    playbackRef.current = setTimeout(async () => {
      try {
        const response = await aiTutorAPI.getNextChunk(session.id);
        if (response.lectureCompleted || !response.chunk) {
          setLectureCompleted(true);
          setIsPlaying(false);
          setShowCompleteDialog(true);
          await fetchCourses();
          return;
        }

        setSession(response.session);
        setCurrentChunk(response.chunk);
      } catch (error) {
        setIsPlaying(false);
        Toast.show({
          type: 'error',
          text1: 'Playback Paused',
          text2: error.message || 'Unable to continue the lecture.',
        });
      }
    }, delay);
  };

  const playChunk = async () => {
    if (!currentNarration) return;

    if (!voiceMode) {
      const fallbackDelay = Math.min(12000, Math.max(3600, currentNarration.length * 28));
      scheduleNext(recommendedDurationMs || fallbackDelay);
      return;
    }

    if (Platform.OS === 'web') {
      try {
        const audioResponse = await aiTutorAPI.speakText({
          lectureId: lecture?.id,
          sessionId: session?.id,
          assetType: 'lecture_chunk',
          text: currentNarration,
        });

        if (audioResponse?.asset?.urlPath) {
          const audio = new Audio(`${baseHost}${audioResponse.asset.urlPath}`);
          audioRef.current = audio;
          audio.onended = () => scheduleNext(600);
          audio.onerror = () => scheduleNext(4000);
          await audio.play();
          return;
        }
      } catch (_) {
      }

      if (window?.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(currentNarration);
        utterance.onend = () => scheduleNext(600);
        utterance.onerror = () => scheduleNext(4000);
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
      if (isPlaying) {
        const response = await aiTutorAPI.pauseSession(session.id);
        if (!response.success) {
          throw new Error(response.error || 'Unable to pause tutor session');
        }
        stopPlayback();
        setShowQuestionPanel(true);
        setActiveToolPanel('chat');
        setIsPlaying(false);
      } else {
        const response = await aiTutorAPI.resumeSession(session.id);
        if (!response.success) {
          throw new Error(response.error || 'Unable to resume tutor session');
        }
        setSession(response.session);
        setCurrentChunk(response.chunk);
        setShowQuestionPanel(false);
        setActiveToolPanel(null);
        setIsPlaying(true);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Session Error',
        text2: error.message || 'Unable to update tutor state.',
      });
    }
  };

  const askQuestion = async () => {
    if (!question.trim() || !session) return;
    const prompt = question.trim();
    setQuestion('');
    setSubmittingQuestion(true);
    setChatMessages((prev) => [...prev, { type: 'user', text: prompt }]);

    try {
      const response = await aiTutorAPI.askQuestion(session.id, prompt);
      if (!response.success || !response.aiMessage?.content) {
        throw new Error(response.error || 'I could not answer that question right now.');
      }
      setChatMessages((prev) => [...prev, { type: 'ai', text: response.aiMessage.content }]);
    } catch (error) {
      setChatMessages((prev) => [...prev, { type: 'ai', text: error.message || 'I could not answer that question right now.' }]);
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const startVoiceInput = async () => {
    if (session && isPlaying) {
      await openQuestionPanel();
    } else {
      setShowQuestionPanel(true);
    }

    if (Platform.OS !== 'web') {
      Toast.show({
        type: 'info',
        text1: 'Voice Input',
        text2: 'Voice input currently requires the web speech API.',
      });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      Toast.show({
        type: 'error',
        text1: 'Not Supported',
        text2: 'Voice input is not supported in this browser.',
      });
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
      setShowQuestionPanel(true);
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

    const blob = new Blob([JSON.stringify(cards.map((card) => ({
      front: card.frontText,
      back: card.backText,
    })), null, 2)], { type: 'application/json' });
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
    setIsPlaying(false);

    try {
      const response = await aiTutorAPI.getNextChunk(session.id);
      if (response.lectureCompleted || !response.chunk) {
        setLectureCompleted(true);
        setShowCompleteDialog(true);
        await fetchCourses();
        return;
      }

      setSession(response.session);
      setCurrentChunk(response.chunk);
      setShowQuestionPanel(false);
      setIsPlaying(true);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Next Chunk Unavailable',
        text2: error.message || 'Unable to advance to the next lecture chunk.',
      });
    }
  };

  const openQuestionPanel = async () => {
    if (!session || !isPlaying) {
      setShowQuestionPanel(true);
      setActiveToolPanel('chat');
      return;
    }

    await togglePause();
  };

  const closeToolPanel = () => {
    if (activeToolPanel === 'chat') {
      setShowQuestionPanel(false);
    }
    setActiveToolPanel(null);
  };

  const openToolPanel = async (panel) => {
    if (panel === 'chat') {
      await openQuestionPanel();
      return;
    }

    setActiveToolPanel((current) => (current === panel ? null : panel));
    if (showQuestionPanel) {
      setShowQuestionPanel(false);
    }
  };

  const toggleFlashcardReveal = (cardId) => {
    setRevealedFlashcards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const openQuiz = () => {
    if (!lecture?.id) {
      Toast.show({
        type: 'error',
        text1: 'Quiz Unavailable',
        text2: 'This lecture package is missing its quiz reference.',
      });
      return;
    }

    if (!lectureCompleted) {
      Toast.show({
        type: 'info',
        text1: 'Finish the Lecture',
        text2: 'Complete the lecture before opening the quiz.',
      });
      return;
    }

    navigation.navigate('Quiz', { courseId, topicId, lectureId: lecture.id });
  };

  const restartLecture = async () => {
    if (!session?.id) {
      return;
    }

    try {
      stopPlayback();
      stopRecognition();
      setShowCompleteDialog(false);
      const response = await aiTutorAPI.restartSession(session.id);
      if (!response.success) {
        throw new Error(response.error || 'Unable to restart this lecture');
      }

      setSession(response.session);
      setLecture(response.lecture || lecture);
      setCurrentChunk(response.chunk);
      setLectureCompleted(false);
      setShowQuestionPanel(false);
      setActiveToolPanel(null);
      setIsPlaying(true);
      setTeachingProgress(0);
      Toast.show({
        type: 'success',
        text1: 'Lecture Restarted',
        text2: 'Starting again from the first chunk.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Restart Failed',
        text2: error.message || 'Unable to restart this lecture right now.',
      });
    }
  };

  const renderSidebar = () => (
    <View style={styles.sidebar}>
      <Text style={[styles.sidebarTitle, { color: theme.colors.textPrimary }]}>Course Progress</Text>
      <ScrollView>
        {(course?.topics || []).map((item) => {
          const isCurrent = item.id === topicId;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.sidebarItem, isCurrent && { borderLeftColor: theme.colors.primary, backgroundColor: theme.colors.primary + '10' }]}
              disabled={item.status === 'locked'}
              onPress={() => navigation.replace('Learning', { courseId, topicId: item.id })}
            >
              <Text style={[styles.sidebarItemText, { color: item.status === 'locked' ? theme.colors.textTertiary : theme.colors.textPrimary }]}>
                {item.title}
              </Text>
              {isCurrent && !!lectureDurationLabel && (
                <Text style={[styles.sidebarItemDuration, { color: theme.colors.textSecondary }]}>{lectureDurationLabel}</Text>
              )}
              <Text style={[styles.sidebarItemStatus, { color: item.completed ? '#10B981' : isCurrent ? theme.colors.primary : theme.colors.textTertiary }]}>
                {item.completed ? 'Done' : item.status === 'locked' ? 'Locked' : isCurrent ? `${progress}%` : 'Ready'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const getProgressiveItems = (items, minimum = 1) => {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!list.length) return [];
    return list.slice(0, Math.min(list.length, Math.max(minimum, Math.ceil(list.length * Math.max(teachingProgress, 0.18)))));
  };

  const getVisibleNarration = () => {
    if (!currentNarration) return '';
    const words = currentNarration.split(/\s+/).filter(Boolean);
    const visibleWordCount = Math.min(words.length, Math.max(1, Math.ceil(words.length * Math.max(teachingProgress, isPlaying ? 0.08 : 1))));
    return words.slice(0, visibleWordCount).join(' ');
  };

  const liveNarration = getVisibleNarration();

  const renderBoardSurface = () => {
    if (!boardContent) {
      return <Text style={[styles.boardBodyText, { color: '#cbd5e1' }]}>{currentChunk.learningObjective || currentChunk.summary}</Text>;
    }

    if (boardContent.type === 'flowchart') {
      return getProgressiveItems(boardContent.steps).map((step, index) => (
        <View key={step.id || index} style={styles.flowStep}>
          <View style={[styles.flowStepBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.flowStepBadgeText}>{index + 1}</Text>
          </View>
          <Text style={styles.flowStepText}>{step.label}</Text>
        </View>
      ));
    }

    if (boardContent.type === 'comparison_table') {
      return (
        <View style={[styles.boardTable, { borderColor: theme.colors.border }]}>
          {getProgressiveItems(boardContent.rows).map((row, index) => (
            <View key={`${row.left}-${index}`} style={[styles.boardTableRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={styles.boardTableTitle}>{row.left}</Text>
              <Text style={[styles.boardTableBody, { color: '#cbd5e1' }]}>{row.right}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (boardContent.type === 'diagram') {
      return (
        <View style={styles.nodeWrap}>
          {getProgressiveItems(boardContent.nodes).map((node, index) => (
            <View key={node.id || index} style={[styles.liveNodeCard, { borderColor: 'rgba(255,255,255,0.12)' }]}>
              <Text style={styles.liveNodeText}>{node.label}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (boardContent.type === 'code') {
      const lines = `${boardContent.snippet || ''}`.split(/\r?\n/).filter(Boolean);
      const visibleLines = getProgressiveItems(lines, Math.min(2, lines.length || 1));
      return (
        <View style={[styles.codePanel, { borderColor: 'rgba(255,255,255,0.12)' }]}>
          <Text style={styles.codeLanguage}>{(boardContent.snippetLanguage || 'text').toUpperCase()}</Text>
          <Text style={styles.codeText}>{visibleLines.join('\n')}</Text>
          {!!boardContent.snippetExplanation && <Text style={styles.codeHint}>{boardContent.snippetExplanation}</Text>}
        </View>
      );
    }

    if (boardContent.type === 'checkpoint') {
      return <Text style={styles.boardQuestion}>{boardContent.question}</Text>;
    }

    if (boardContent.type === 'slide_summary' || boardContent.type === 'recap') {
      return getProgressiveItems(boardContent.bullets).map((bullet, index) => (
        <Text key={`${bullet}-${index}`} style={styles.boardBullet}>- {bullet}</Text>
      ));
    }

    if (boardContent.type === 'whiteboard_notes' || boardContent.type === 'narration') {
      return (
        <View>
          {getProgressiveItems(boardContent.notes).map((note, index) => (
            <Text key={`${note}-${index}`} style={styles.boardBullet}>- {note}</Text>
          ))}
          {!!boardContent.emphasis && <Text style={styles.boardEmphasis}>{boardContent.emphasis}</Text>}
        </View>
      );
    }

    return <Text style={styles.boardBodyText}>{currentChunk.learningObjective || currentChunk.summary}</Text>;
  };

  const renderSupportPanel = () => {
    if (!supportPanel) {
      return null;
    }

    const accent = supportPanel.type === 'checkpoint'
      ? '#f59e0b'
      : supportPanel.type === 'watch_for_this'
        ? '#ef4444'
        : '#06b6d4';

    return (
      <View style={[styles.supportCard, { backgroundColor: isDark ? '#101827' : '#ffffff', borderColor: `${accent}55` }]}>
        <Text style={[styles.supportLabel, { color: accent }]}>{supportPanel.title}</Text>
        <Text style={[styles.supportText, { color: theme.colors.textPrimary }]}>{supportPanel.text}</Text>
      </View>
    );
  };

  const renderStageInsights = () => {
    const visibleReinforcement = getProgressiveItems(reinforcementPoints, 2);
    const visibleConfusion = getProgressiveItems(confusionPoints, 1);

    if (!visibleReinforcement.length && !visibleConfusion.length && !supportPanel) {
      return null;
    }

    return (
      <View style={styles.stageInsightsGrid}>
        {!!supportPanel && renderSupportPanel()}
        {!!visibleReinforcement.length && (
          <View style={[styles.insightCard, { backgroundColor: isDark ? '#101827' : '#f8fafc', borderColor: isDark ? 'rgba(59,130,246,0.18)' : '#bfdbfe' }]}>
            <Text style={[styles.insightLabel, { color: '#60a5fa' }]}>Key explanation points</Text>
            {visibleReinforcement.map((point, index) => (
              <Text key={`${point}-${index}`} style={[styles.insightText, { color: theme.colors.textPrimary }]}>- {point}</Text>
            ))}
          </View>
        )}
        {!!visibleConfusion.length && (
          <View style={[styles.insightCard, { backgroundColor: isDark ? '#1a1408' : '#fff7ed', borderColor: isDark ? 'rgba(245,158,11,0.18)' : '#fdba74' }]}>
            <Text style={[styles.insightLabel, { color: '#f59e0b' }]}>Watch for this</Text>
            {visibleConfusion.map((point, index) => (
              <Text key={`${point}-${index}`} style={[styles.insightText, { color: theme.colors.textPrimary }]}>- {point}</Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderToolPanel = () => {
    if (!activeToolPanel) {
      return null;
    }

    if (activeToolPanel === 'chat') {
      return (
        <View style={[styles.toolPanelCard, { backgroundColor: isDark ? '#111827' : '#fff', borderColor: isDark ? 'rgba(148,163,184,0.12)' : theme.colors.border }]}>
          <View style={styles.toolPanelHeader}>
            <View>
              <Text style={[styles.toolPanelTitle, { color: theme.colors.textPrimary }]}>AI Chat</Text>
              <Text style={[styles.toolPanelSubtitle, { color: theme.colors.textSecondary }]}>Ask about the current chunk without losing your place.</Text>
            </View>
            <TouchableOpacity onPress={closeToolPanel} accessibilityRole="button" accessibilityLabel="Close AI chat panel">
              <Icon name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.chatScroll} contentContainerStyle={styles.chatScrollContent} showsVerticalScrollIndicator={false}>
            {!chatMessages.length && !submittingQuestion && (
              <View style={[styles.chatEmptyState, { borderColor: theme.colors.border }]}>
                <MaterialIcon name="chat-processing-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.chatEmptyTitle, { color: theme.colors.textPrimary }]}>Ask about this lecture point</Text>
                <Text style={[styles.chatEmptyText, { color: theme.colors.textSecondary }]}>The AI Tutor answers from the active lecture context and lets you continue smoothly.</Text>
              </View>
            )}
            {chatMessages.map((message, index) => (
              <View key={`${message.type}-${index}`} style={[styles.chatBubble, message.type === 'user' ? styles.chatBubbleUser : [styles.chatBubbleAi, { borderColor: theme.colors.border }]]}>
                <Text style={[styles.chatRole, { color: message.type === 'user' ? 'rgba(255,255,255,0.75)' : theme.colors.primary }]}>{message.type === 'user' ? 'You' : 'AI Tutor'}</Text>
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
          <View style={[styles.inputRow, { borderColor: theme.colors.border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: isRecording ? theme.colors.error : theme.colors.primary }]} onPress={startVoiceInput} accessibilityRole="button" accessibilityLabel="Start voice input">
              <Icon name={isRecording ? 'stop' : 'mic'} size={18} color="#fff" />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, {
                color: theme.colors.textPrimary,
                backgroundColor: isDark ? '#1f2937' : '#f1f5f9',
                borderColor: isDark ? '#334155' : '#e2e8f0',
              }]}
              value={question}
              onChangeText={setQuestion}
              onSubmitEditing={askQuestion}
              placeholder={isRecording ? 'Listening...' : 'Type your question...'}
              placeholderTextColor={theme.colors.textTertiary}
              multiline
            />
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.colors.primary }]} onPress={askQuestion} disabled={submittingQuestion} accessibilityRole="button" accessibilityLabel="Send AI question">
              {submittingQuestion ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (activeToolPanel === 'notes') {
      return (
        <View style={[styles.toolPanelCard, { backgroundColor: isDark ? '#111827' : '#fff', borderColor: isDark ? 'rgba(148,163,184,0.12)' : theme.colors.border }]}>
          <View style={styles.toolPanelHeader}>
            <View>
              <Text style={[styles.toolPanelTitle, { color: theme.colors.textPrimary }]}>Lecture Notes</Text>
              <Text style={[styles.toolPanelSubtitle, { color: theme.colors.textSecondary }]}>Condensed notes for the current lecture package.</Text>
            </View>
            <TouchableOpacity onPress={closeToolPanel} accessibilityRole="button" accessibilityLabel="Close notes panel">
              <Icon name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.toolPanelScrollContent}>
            <Text style={[styles.notesTitle, { color: theme.colors.textPrimary }]}>{lecture.title}</Text>
            <Text style={[styles.notesBody, { color: theme.colors.textSecondary }]}>{lecture.summary}</Text>
            {(currentSlides.length ? currentSlides : lecture.slideOutlines || []).map((slide, index) => (
              <View key={slide.id || index} style={styles.noteSection}>
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
    }

    if (activeToolPanel === 'flashcards') {
      return (
        <View style={[styles.toolPanelCard, { backgroundColor: isDark ? '#111827' : '#fff', borderColor: isDark ? 'rgba(148,163,184,0.12)' : theme.colors.border }]}>
          <View style={styles.toolPanelHeader}>
            <View>
              <Text style={[styles.toolPanelTitle, { color: theme.colors.textPrimary }]}>Flashcards</Text>
              <Text style={[styles.toolPanelSubtitle, { color: theme.colors.textSecondary }]}>Review core prompts and reveal answers when ready.</Text>
            </View>
            <TouchableOpacity onPress={closeToolPanel} accessibilityRole="button" accessibilityLabel="Close flashcards panel">
              <Icon name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.toolPanelScrollContent}>
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
          <AppButton title="Export Flashcards" onPress={exportFlashcards} variant="outline" />
        </View>
      );
    }

    if (activeToolPanel === 'quiz') {
      const questions = quizPreview?.questions || [];
      return (
        <View style={[styles.toolPanelCard, { backgroundColor: isDark ? '#111827' : '#fff', borderColor: isDark ? 'rgba(148,163,184,0.12)' : theme.colors.border }]}>
          <View style={styles.toolPanelHeader}>
            <View>
              <Text style={[styles.toolPanelTitle, { color: theme.colors.textPrimary }]}>Quiz Panel</Text>
              <Text style={[styles.toolPanelSubtitle, { color: theme.colors.textSecondary }]}>Preview readiness before opening the full quiz flow.</Text>
            </View>
            <TouchableOpacity onPress={closeToolPanel} accessibilityRole="button" accessibilityLabel="Close quiz panel">
              <Icon name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.quizPreviewCard, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: theme.colors.border }]}>
            <Text style={[styles.quizPreviewLabel, { color: theme.colors.textSecondary }]}>Quiz status</Text>
            <Text style={[styles.quizPreviewValue, { color: theme.colors.textPrimary }]}>{lectureCompleted ? 'Ready to attempt' : 'Locked until lecture completion'}</Text>
            <Text style={[styles.quizPreviewMeta, { color: theme.colors.textSecondary }]}>
              {lectureCompleted ? 'Finish with the stored lecture and move straight into the graded quiz.' : 'Complete this lecture first to unlock the next topic through the quiz.'}
            </Text>
          </View>
          {quizPreviewLoading ? (
            <View style={styles.quizLoadingWrap}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.toolPanelSubtitle, { color: theme.colors.textSecondary }]}>Loading quiz preview...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.toolPanelScrollContent}>
              {!!quizPreview?.instructions && <Text style={[styles.notesBody, { color: theme.colors.textSecondary }]}>{quizPreview.instructions}</Text>}
              {questions.slice(0, 3).map((item, index) => (
                <View key={item.id || index} style={[styles.quizQuestionPreview, { borderColor: theme.colors.border }]}>
                  <Text style={[styles.quizQuestionIndex, { color: theme.colors.primary }]}>Question {index + 1}</Text>
                  <Text style={[styles.quizQuestionText, { color: theme.colors.textPrimary }]}>{item.prompt}</Text>
                </View>
              ))}
              {!questions.length && (
                <Text style={[styles.notesBody, { color: theme.colors.textSecondary }]}>No preview questions are available yet for this lecture package.</Text>
              )}
            </ScrollView>
          )}
          <AppButton title="Open Full Quiz" onPress={openQuiz} variant="primary" disabled={!lectureCompleted} />
        </View>
      );
    }

    return (
      <View style={[styles.toolPanelCard, { backgroundColor: isDark ? '#111827' : '#fff', borderColor: isDark ? 'rgba(148,163,184,0.12)' : theme.colors.border }]}>
        <View style={styles.toolPanelHeader}>
          <View>
            <Text style={[styles.toolPanelTitle, { color: theme.colors.textPrimary }]}>Essentials</Text>
            <Text style={[styles.toolPanelSubtitle, { color: theme.colors.textSecondary }]}>Quick classroom utilities and lecture actions.</Text>
          </View>
          <TouchableOpacity onPress={closeToolPanel} accessibilityRole="button" accessibilityLabel="Close essentials panel">
            <Icon name="close" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.essentialsGrid}>
          <TouchableOpacity style={[styles.essentialsCard, { backgroundColor: '#0f766e' }]} onPress={restartLecture}>
            <Icon name="refresh" size={18} color="#fff" />
            <Text style={styles.essentialsTitle}>Restart</Text>
            <Text style={styles.essentialsMeta}>Start this lecture from the beginning.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.essentialsCard, { backgroundColor: '#3b82f6' }]} onPress={exportFlashcards}>
            <Icon name="download" size={18} color="#fff" />
            <Text style={styles.essentialsTitle}>Export</Text>
            <Text style={styles.essentialsMeta}>Download revision flashcards.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.essentialsCard, { backgroundColor: voiceMode ? '#4f46e5' : '#475569' }]} onPress={() => setVoiceMode((prev) => !prev)}>
            <MaterialIcon name={voiceMode ? 'volume-high' : 'volume-off'} size={18} color="#fff" />
            <Text style={styles.essentialsTitle}>{voiceMode ? 'Voice On' : 'Voice Off'}</Text>
            <Text style={styles.essentialsMeta}>Switch spoken delivery mode.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.essentialsCard, { backgroundColor: handRaised ? '#f59e0b' : '#334155' }]} onPress={() => setHandRaised((prev) => !prev)}>
            <MaterialIcon name="hand-wave-outline" size={18} color="#fff" />
            <Text style={styles.essentialsTitle}>{handRaised ? 'Hand Raised' : 'Raise Hand'}</Text>
            <Text style={styles.essentialsMeta}>Mark attention for the current topic.</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!course || !topic) {
    return (
      <MainLayout showSidebar={false} showHeader={true} showBack={true}>
        <View style={styles.centered}>
          <EmptyState icon="alert-circle-outline" title="Topic not found" subtitle="The topic you're looking for doesn't exist." />
        </View>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout showSidebar={false} showHeader={true} showBack={true}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading AI lecture package...</Text>
        </View>
      </MainLayout>
    );
  }

  if (!isEnrolled) {
    return (
      <MainLayout showSidebar={false} showHeader={true} showBack={true}>
        <View style={styles.centered}>
          <EmptyState icon="lock-closed-outline" title="Not Enrolled" subtitle="You need to enroll in this course to access lectures." />
        </View>
      </MainLayout>
    );
  }

  if (!lecture || !currentChunk) {
    return (
      <MainLayout showSidebar={false} showHeader={true} showBack={true}>
        <View style={styles.centered}>
          <EmptyState icon="sparkles-outline" title="Lecture Not Ready" subtitle="This topic does not have a generated lecture package yet." />
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      showSidebar={true}
      sidebarItems={sidebarItems}
      activeRoute="EnrolledCourses"
      onNavigate={handleNavigate}
      showHeader={true}
      customSidebar={renderSidebar()}
      customSidebarVisible={showTopicsSidebar}
      onCustomSidebarToggle={setShowTopicsSidebar}
      customMenuIcon="book-open-variant"
      hideHeaderToggle={true}
    >
      <View style={[styles.container, styles.sessionShell, { backgroundColor: isDark ? '#090b13' : '#eef2ff' }]}>
        {(() => {
          const controlItems = [
            { key: 'mic', label: isRecording ? 'Stop Mic' : 'Mic', icon: isRecording ? 'stop' : 'mic', onPress: startVoiceInput, active: isRecording },
            { key: 'hand', label: handRaised ? 'Lower Hand' : 'Raise Hand', icon: 'hand-left-outline', onPress: () => setHandRaised((prev) => !prev), active: handRaised },
            { key: 'chat', label: 'AI Chat', icon: 'chatbubble-ellipses-outline', onPress: () => openToolPanel('chat'), active: activeToolPanel === 'chat' },
            { key: 'notes', label: 'Notes', icon: 'document-text-outline', onPress: () => openToolPanel('notes'), active: activeToolPanel === 'notes' },
            { key: 'flashcards', label: 'Flashcards', icon: 'albums-outline', onPress: () => openToolPanel('flashcards'), active: activeToolPanel === 'flashcards' },
            { key: 'quiz', label: 'Quiz', icon: 'help-circle-outline', onPress: () => openToolPanel('quiz'), active: activeToolPanel === 'quiz' },
            { key: 'more', label: 'More', icon: 'ellipsis-horizontal', onPress: () => openToolPanel('more'), active: activeToolPanel === 'more' },
          ];

          return (
        <View style={[styles.sessionToolbar, { backgroundColor: isDark ? 'rgba(10,14,25,0.92)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(99,102,241,0.12)' }]}>
          <View style={styles.sessionToolbarLeft}>
            <TouchableOpacity style={[styles.iconButton, styles.toolbarBackButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#eef2ff' }]} onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={18} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.sessionIdentity}>
              <Text style={[styles.sessionEyebrow, { color: theme.colors.primary }]}>AI CLASSROOM</Text>
              <Text style={[styles.sessionTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>{lecture.title}</Text>
              <Text style={[styles.sessionSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>{course.name} · {topic.title}</Text>
            </View>
          </View>

          <View style={styles.sessionToolbarCenter}>
            <View style={styles.progressBarWrap}>
              <Text style={[styles.progressLabel, { color: theme.colors.textSecondary }]}>Chunk {Math.min(currentIndex + 1, totalChunks)} of {totalChunks}</Text>
              <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.1)' }]}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.colors.primary }]} />
              </View>
            </View>
            <View style={styles.toolbarBadges}>
              {!!lectureDurationLabel && (
                <View style={[styles.toolbarBadge, { backgroundColor: isDark ? '#111827' : '#eff6ff', borderColor: isDark ? '#1f2937' : '#bfdbfe' }]}>
                  <Icon name="time-outline" size={14} color={theme.colors.primary} />
                  <Text style={[styles.toolbarBadgeText, { color: theme.colors.textPrimary }]}>{lectureDurationLabel}</Text>
                </View>
              )}
              <View style={[styles.toolbarBadge, { backgroundColor: isDark ? '#1a2338' : '#eef4ff', borderColor: `${tutorStatus.tone}33` }]}>
                <View style={[styles.statusDot, { backgroundColor: tutorStatus.tone }]} />
                <Text style={[styles.toolbarBadgeText, { color: theme.colors.textPrimary }]}>{tutorStatus.label}</Text>
              </View>
            </View>
          </View>

          <View style={styles.sessionToolbarRight}>
            {controlItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.toolbarAction,
                  {
                    backgroundColor: item.active
                      ? (isDark ? 'rgba(79,70,229,0.22)' : '#e0e7ff')
                      : (isDark ? '#152033' : '#f8fafc'),
                    borderColor: item.active ? 'rgba(99,102,241,0.45)' : 'transparent',
                    borderWidth: 1,
                  },
                ]}
                onPress={item.onPress}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Icon name={item.icon} size={16} color={item.active ? theme.colors.primary : theme.colors.textPrimary} />
                <Text style={[styles.toolbarActionText, { color: item.active ? theme.colors.primary : theme.colors.textPrimary }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={[styles.liveIndicator, { backgroundColor: isDark ? '#0f172a' : '#eef2ff', borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(99,102,241,0.14)' }]}>
              <View style={[styles.liveIndicatorDot, { backgroundColor: voiceMode ? '#10b981' : '#f59e0b' }]} />
              <Text style={[styles.liveIndicatorText, { color: theme.colors.textPrimary }]}>{voiceMode ? 'Live Voice' : 'Text Live'}</Text>
            </View>
          </View>
        </View>
          );
        })()}

        <View style={[styles.classroomStage, isMobile && styles.classroomStageStack]}>
          <View style={styles.classroomMainColumn}>
            <View style={[styles.stageHeroCard, { backgroundColor: isDark ? '#0d1424' : '#ffffff', borderColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.14)' }]}>
              <View style={styles.stageHeroTopRow}>
                <View style={styles.stageHeroLeft}>
                  <View style={[styles.stageModePill, { backgroundColor: isDark ? 'rgba(79,70,229,0.22)' : '#ede9fe' }]}>
                    <Text style={styles.stageModePillText}>{classroomModeLabel}</Text>
                  </View>
                  <View style={[styles.stageModePill, { backgroundColor: isDark ? '#132033' : '#e0f2fe' }]}>
                    <Text style={[styles.stageMetaPillText, { color: theme.colors.textPrimary }]}>{teachingStyleLabel}</Text>
                  </View>
                  <View style={[styles.stageModePill, { backgroundColor: isDark ? '#11271f' : '#dcfce7' }]}>
                    <Text style={[styles.stageMetaPillText, { color: theme.colors.textPrimary }]}>{conceptTypeLabel}</Text>
                  </View>
                </View>
                <Text style={[styles.sessionClockText, { color: theme.colors.primary }]}>{progress}% complete</Text>
              </View>

              <View style={styles.stageMetaRow}>
                <View style={[styles.stageTutorChip, { backgroundColor: isDark ? '#111827' : '#eef2ff', borderColor: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(99,102,241,0.14)' }]}>
                  <RNAnimated.View style={[styles.stageTutorPulse, { transform: [{ scale: pulseAnim }] }]}>
                    <MaterialIcon name="robot-excited-outline" size={16} color="#fff" />
                  </RNAnimated.View>
                  <View style={styles.stageTutorMeta}>
                    <Text style={[styles.stageTutorName, { color: theme.colors.textPrimary }]}>AI Tutor</Text>
                    <Text style={[styles.stageTutorLine, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      Section {currentChunk.sectionIndex + 1} | Chunk {currentChunk.chunkIndex + 1}
                    </Text>
                  </View>
                </View>
                {!!supportPanel && (
                  <View style={[styles.stageSupportChip, { backgroundColor: isDark ? '#111827' : '#fff7ed', borderColor: isDark ? 'rgba(245,158,11,0.16)' : '#fdba74' }]}>
                    <Text style={[styles.stageSupportLabel, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      {supportPanel.title}
                    </Text>
                  </View>
                )}
              </View>

              {!!transitionText && (
                <View style={[styles.inlineTransitionCard, { backgroundColor: isDark ? '#14213d' : '#fff7ed', borderColor: isDark ? '#2b3f67' : '#fdba74' }]}>
                  <Text style={[styles.transitionLabel, { color: isDark ? '#93c5fd' : '#c2410c' }]}>Teacher transition</Text>
                  <Text style={[styles.transitionText, { color: theme.colors.textPrimary }]} numberOfLines={2}>{transitionText}</Text>
                </View>
              )}

              <View style={[styles.stageCanvasFrame, { backgroundColor: isDark ? '#050816' : '#e2e8f0' }]}>
                <View style={[styles.whiteboard, styles.liveBoard, styles.stageWhiteboard, { backgroundColor: isDark ? '#111827' : '#1e293b' }]}>
                  <View style={styles.stageBoardHeader}>
                    <View>
                      <Text style={styles.cardHeaderText}>Live Lecture Stage</Text>
                      <Text style={styles.stageBoardSubtext}>{panelContent.learningObjective || currentChunk.learningObjective || currentChunk.summary}</Text>
                    </View>
                    <View style={styles.stageBoardHeaderActions}>
                      <TouchableOpacity style={[styles.stageMiniControl, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={togglePause}>
                        <Icon name={isPlaying ? 'pause' : 'play'} size={16} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.stageMiniControl, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={goToNextChunk} disabled={lectureCompleted}>
                        <Icon name="play-skip-forward" size={16} color={lectureCompleted ? '#64748b' : '#fff'} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.whiteboardTitle}>{boardContent?.title || currentChunk.title}</Text>

                  <View style={styles.boardSurface}>
                    {renderBoardSurface()}
                  </View>
                </View>
              </View>

              {renderStageInsights()}

              <View style={[styles.subtitleDock, { backgroundColor: isDark ? '#0f172a' : '#eef2ff', borderColor: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(99,102,241,0.12)' }]}>
                <View style={styles.subtitlesHeader}>
                  <View style={styles.subtitleDockTitleWrap}>
                    <MaterialIcon name="subtitles-outline" size={16} color={theme.colors.primary} />
                    <Text style={[styles.subtitlesTitle, { color: theme.colors.textPrimary }]}>Live Teaching Text</Text>
                  </View>
                  <Text style={styles.modeBadge}>{voiceMode ? 'VOICE ON' : 'TEXT MODE'}</Text>
                </View>
                <Text style={[styles.subtitleDockText, { color: theme.colors.textPrimary }]} numberOfLines={3}>{liveNarration}</Text>
                {!!narrationSegments.length && (
                  <View style={styles.segmentRow}>
                    {narrationSegments.slice(0, 4).map((segment, index) => (
                      <View key={`${segment}-${index}`} style={[styles.segmentPill, { backgroundColor: index === 0 ? `${theme.colors.primary}22` : isDark ? '#111827' : '#e2e8f0' }]}>
                        <Text style={[styles.segmentText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{segment}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          {isDrawerOpen && (
            <View style={[styles.contextDrawer, isMobile && styles.contextDrawerOverlay, { backgroundColor: isDark ? '#0d1424' : 'rgba(255,255,255,0.96)', borderColor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(99,102,241,0.12)' }]}>
              {renderToolPanel()}
            </View>
          )}
        </View>

        <View style={[styles.footer, styles.sessionFooter, { backgroundColor: isDark ? 'rgba(10,14,25,0.96)' : 'rgba(255,255,255,0.96)', borderColor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(99,102,241,0.12)' }]}>
          <TouchableOpacity style={[styles.pauseButton, { backgroundColor: isPlaying ? '#10b981' : '#4f46e5' }]} onPress={togglePause}>
            <Icon name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
            <Text style={styles.pauseText}>{isPlaying ? 'Pause Lecture' : 'Resume Lecture'}</Text>
          </TouchableOpacity>
          <View style={styles.footerControls}>
            <TouchableOpacity style={[styles.iconButton, styles.footerIcon, { backgroundColor: isDark ? '#111827' : '#e2e8f0' }]} onPress={goToNextChunk} disabled={lectureCompleted}>
              <Icon name="play-skip-forward" size={18} color={lectureCompleted ? theme.colors.textTertiary : theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, styles.footerIcon, { backgroundColor: isDark ? '#111827' : '#e2e8f0' }]}
              onPress={openQuestionPanel}
            >
              <Icon name="chatbubble-outline" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, styles.footerIcon, { backgroundColor: isDark ? '#111827' : '#e2e8f0' }]} onPress={startVoiceInput}>
              <Icon name={isRecording ? 'stop' : 'mic'} size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ConfirmDialog
        visible={showCompleteDialog}
        title="Lecture Complete"
        message="The lecture is finished. Open the quiz to unlock the next topic, or take the lecture again from the beginning."
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
  container: { flex: 1, padding: 16 },
  sessionShell: { gap: 14 },
  sessionToolbar: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sessionToolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0, flex: 1.2 },
  toolbarBackButton: { borderRadius: 14 },
  sessionIdentity: { flex: 1, minWidth: 0 },
  sessionEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  sessionTitle: { fontSize: 18, fontWeight: '800' },
  sessionSubtitle: { fontSize: 12, marginTop: 2 },
  sessionToolbarCenter: { flex: 1.4, gap: 10 },
  toolbarBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  toolbarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  toolbarBadgeText: { fontSize: 12, fontWeight: '700' },
  sessionToolbarRight: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', flex: 1, flexWrap: 'wrap' },
  toolbarAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toolbarActionText: { fontSize: 12, fontWeight: '700' },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  liveIndicatorDot: { width: 10, height: 10, borderRadius: 5 },
  liveIndicatorText: { fontSize: 12, fontWeight: '800' },
  classroomStage: { flex: 1, flexDirection: 'row', gap: 14, minHeight: 0 },
  classroomStageStack: { flexDirection: 'column' },
  classroomMainColumn: { flex: 1, minHeight: 0 },
  stageHeroCard: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    minHeight: 0,
  },
  stageHeroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stageHeroLeft: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  stageMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  stageModePill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  stageModePillText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  stageMetaPillText: { fontSize: 11, fontWeight: '700' },
  sessionClockText: { fontSize: 12, fontWeight: '800' },
  stageTutorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  stageTutorPulse: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageTutorMeta: { flex: 1, minWidth: 0 },
  stageTutorName: { fontSize: 13, fontWeight: '800' },
  stageTutorLine: { fontSize: 12, marginTop: 2 },
  stageSupportChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    maxWidth: '100%',
  },
  stageSupportLabel: { fontSize: 12, fontWeight: '700' },
  inlineTransitionCard: { borderRadius: 16, padding: 12, borderWidth: 1 },
  stageCanvasFrame: {
    flex: 1,
    minHeight: 420,
    borderRadius: 24,
    padding: 10,
  },
  stageWhiteboard: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.24,
    shadowRadius: 30,
    elevation: 12,
  },
  stageBoardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  stageBoardSubtext: { color: '#cbd5e1', fontSize: 13, lineHeight: 20, marginTop: 4, maxWidth: 680 },
  stageBoardHeaderActions: { flexDirection: 'row', gap: 8 },
  stageMiniControl: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  subtitleDock: { borderRadius: 20, borderWidth: 1, padding: 16 },
  subtitleDockTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subtitleDockText: { fontSize: 14, lineHeight: 22, fontWeight: '500' },
  contextDrawer: {
    width: 360,
    borderRadius: 28,
    borderWidth: 1,
    padding: 12,
    minHeight: 0,
  },
  contextDrawerOverlay: {
    width: '100%',
    maxHeight: 360,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  progressBarWrap: { flex: 1 },
  progressLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  progressBar: { height: 8, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  progressFill: { height: '100%' },
  progressValue: { fontSize: 13, fontWeight: '700' },
  lectureTimeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16, alignSelf: 'flex-start' },
  lectureTimeBannerText: { fontSize: 13, fontWeight: '700' },
  statusCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 },
  statusTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusTitle: { fontSize: 15, fontWeight: '700' },
  statusMeta: { fontSize: 12, fontWeight: '700' },
  statusText: { fontSize: 13, lineHeight: 20 },
  metaPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  metaPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  metaPillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  transitionCard: { borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1 },
  transitionLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  transitionText: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
  topRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  topRowStack: { flexDirection: 'column' },
  whiteboard: { flex: 1, borderRadius: 16, padding: 18 },
  liveBoard: { minHeight: 360 },
  sideStack: { width: 220, gap: 12 },
  tutorPanel: { width: 190, borderRadius: 16, padding: 16, alignItems: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardHeaderText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  boardHeaderRow: { marginBottom: 14, gap: 10 },
  boardModeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  boardModeText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  boardObjective: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },
  whiteboardTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  whiteboardSummary: { color: '#cbd5e1', fontSize: 14, lineHeight: 22, marginBottom: 12 },
  boardSurface: { flex: 1, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', padding: 16, gap: 10, justifyContent: 'center' },
  boardBodyText: { color: '#e2e8f0', fontSize: 15, lineHeight: 24 },
  boardBullet: { color: '#e2e8f0', fontSize: 15, lineHeight: 24, marginBottom: 8 },
  boardEmphasis: { color: '#93c5fd', fontSize: 14, lineHeight: 22, marginTop: 12, fontStyle: 'italic' },
  boardQuestion: { color: '#fef3c7', fontSize: 22, lineHeight: 30, fontWeight: '700' },
  sectionLabel: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  sectionText: { color: '#cbd5e1', fontSize: 13, lineHeight: 21 },
  tutorLabel: { fontSize: 14, fontWeight: '700', marginBottom: 16 },
  avatarRing: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: 'rgba(79,70,229,0.3)', justifyContent: 'center', alignItems: 'center' },
  avatarInner: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#a855f7', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  tutorMeta: { fontSize: 11, textAlign: 'center', marginTop: 8 },
  visualRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  visualCard: { flex: 1, borderRadius: 16, padding: 16, borderWidth: 1 },
  visualHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  visualEyebrow: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  visualTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  visualBody: { fontSize: 13, lineHeight: 21 },
  visualHint: { borderRadius: 12, padding: 12, marginTop: 12 },
  visualHintLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  visualHintText: { fontSize: 13, lineHeight: 20 },
  diagramRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  diagramIndex: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  diagramIndexText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  diagramText: { flex: 1, fontSize: 13, lineHeight: 20 },
  flowStep: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  flowStepBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  flowStepBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  flowStepText: { flex: 1, color: '#e2e8f0', fontSize: 14, lineHeight: 21 },
  boardTable: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  boardTableRow: { padding: 12, borderBottomWidth: 1 },
  boardTableTitle: { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  boardTableBody: { fontSize: 12, lineHeight: 18 },
  comparisonTable: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  comparisonRow: { padding: 12, borderBottomWidth: 1 },
  comparisonCellTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  comparisonCellBody: { fontSize: 12, lineHeight: 18 },
  nodeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nodeCard: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  nodeLabel: { fontSize: 12, fontWeight: '600' },
  liveNodeCard: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  liveNodeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  codePanel: { borderWidth: 1, borderRadius: 14, padding: 14, backgroundColor: 'rgba(15,23,42,0.92)' },
  codeLanguage: { color: '#93c5fd', fontSize: 11, fontWeight: '700', marginBottom: 10, letterSpacing: 1 },
  codeText: { color: '#e5e7eb', fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', fontSize: 13, lineHeight: 20 },
  codeHint: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginTop: 12 },
  teacherCardsRow: { flexDirection: 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  teacherCard: { flex: 1, minWidth: 210, borderRadius: 16, padding: 14, borderWidth: 1 },
  teacherCardLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  teacherCardText: { fontSize: 13, lineHeight: 20 },
  supportCard: { borderWidth: 1, borderRadius: 16, padding: 14 },
  supportLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  supportText: { fontSize: 13, lineHeight: 20 },
  stageInsightsGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  insightCard: { flex: 1, minWidth: 220, borderWidth: 1, borderRadius: 18, padding: 14 },
  insightLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  insightText: { fontSize: 13, lineHeight: 20, marginBottom: 6 },
  subtitlesCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  subtitlesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  subtitlesTitle: { fontSize: 14, fontWeight: '700' },
  modeBadge: { color: '#fff', backgroundColor: '#3b82f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, fontSize: 10, fontWeight: '700' },
  subtitlesText: { fontSize: 15, lineHeight: 24 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  segmentPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, maxWidth: '100%' },
  segmentText: { fontSize: 11, fontWeight: '600' },
  qaCard: { borderRadius: 16, padding: 16, marginBottom: 16, maxHeight: 340 },
  qaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  qaTitle: { fontSize: 15, fontWeight: '700' },
  chatScroll: { maxHeight: 180, marginBottom: 12 },
  chatScrollContent: { paddingBottom: 4 },
  chatEmptyState: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 10 },
  chatEmptyTitle: { fontSize: 14, fontWeight: '700', marginTop: 8, marginBottom: 6 },
  chatEmptyText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  chatBubble: { padding: 12, borderRadius: 14, marginBottom: 8, maxWidth: '92%', borderWidth: 1 },
  chatBubbleUser: { backgroundColor: '#4F46E5', alignSelf: 'flex-end', borderColor: '#4F46E5' },
  chatBubbleAi: { backgroundColor: 'rgba(79,70,229,0.1)', alignSelf: 'flex-start' },
  chatRole: { fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  inputRow: { flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: 18, padding: 10, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 44, maxHeight: 92, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 },
  toolPanelCard: { flex: 1, borderWidth: 1, borderRadius: 22, padding: 16, minHeight: 0, gap: 14 },
  toolPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  toolPanelTitle: { fontSize: 18, fontWeight: '800' },
  toolPanelSubtitle: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  toolPanelScrollContent: { paddingBottom: 4, gap: 12 },
  quizPreviewCard: { borderWidth: 1, borderRadius: 18, padding: 14 },
  quizPreviewLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  quizPreviewValue: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  quizPreviewMeta: { fontSize: 13, lineHeight: 19 },
  quizLoadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  quizQuestionPreview: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 10 },
  quizQuestionIndex: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  quizQuestionText: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
  essentialsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  essentialsCard: { flexBasis: '48%', flexGrow: 1, borderRadius: 18, padding: 14, minHeight: 120 },
  essentialsTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 10 },
  essentialsMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 12, lineHeight: 18, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  action: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', gap: 6 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  sessionFooter: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingBottom: 0,
    paddingTop: 14,
  },
  pauseButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 24 },
  pauseText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  footerControls: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  footerIcon: { borderRadius: 12 },
  sidebar: { flex: 1, paddingTop: 8, paddingHorizontal: 8 },
  sidebarTitle: { fontSize: 14, fontWeight: '700', padding: 16 },
  sidebarItem: { borderLeftWidth: 3, borderLeftColor: 'transparent', padding: 12, marginHorizontal: 8, marginBottom: 4, borderRadius: 10 },
  sidebarItemText: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  sidebarItemDuration: { fontSize: 11, marginBottom: 4 },
  sidebarItemStatus: { fontSize: 11 },
  flashcard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  flashcardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12 },
  flashcardLabel: { fontSize: 12, fontWeight: '700' },
  flashcardHint: { fontSize: 11, fontWeight: '600' },
  flashcardFront: { fontSize: 16, lineHeight: 24, marginBottom: 12, fontWeight: '600' },
  flashcardDivider: { height: 1, marginBottom: 12 },
  flashcardMeta: { fontSize: 12, lineHeight: 18 },
  notesTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  notesBody: { fontSize: 14, lineHeight: 22, marginBottom: 6 },
  noteSection: { marginBottom: 14 },
  noteSectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
});

export default LearningScreen;
