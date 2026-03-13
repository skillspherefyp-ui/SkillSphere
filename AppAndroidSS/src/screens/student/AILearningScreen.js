import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
  const [showFlashcardsModal, setShowFlashcardsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [voiceMode, setVoiceMode] = useState(Platform.OS === 'web');
  const [isRecording, setIsRecording] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [lectureCompleted, setLectureCompleted] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showTopicsSidebar, setShowTopicsSidebar] = useState(false);
  const [revealedFlashcards, setRevealedFlashcards] = useState({});
  const [teachingProgress, setTeachingProgress] = useState(0);

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
        setIsPlaying(false);
      } else {
        const response = await aiTutorAPI.resumeSession(session.id);
        if (!response.success) {
          throw new Error(response.error || 'Unable to resume tutor session');
        }
        setSession(response.session);
        setCurrentChunk(response.chunk);
        setShowQuestionPanel(false);
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
      return;
    }

    await togglePause();
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

  const sidebarItems = [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Browse Courses', icon: 'library-outline', iconActive: 'library', route: 'Courses' },
    { label: 'My Learning', icon: 'school-outline', iconActive: 'school', route: 'EnrolledCourses' },
    { label: 'AI Assistant', icon: 'sparkles-outline', iconActive: 'sparkles', route: 'AITutor' },
    { label: 'Certificates', icon: 'ribbon-outline', iconActive: 'ribbon', route: 'Certificates' },
    { label: 'Reminders', icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle', route: 'Todo' },
  ];
  const handleNavigate = (routeName) => navigation.navigate(routeName);

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
      <View style={[styles.mainContent, { backgroundColor: isDark ? '#0f0f1a' : theme.colors.background }]}>
        <View style={styles.learningArea}>

          {/* ── Progress bar row ── */}
          <View style={styles.progressSection}>
            <TouchableOpacity
              style={[
                styles.sidebarToggleBtn,
                {
                  backgroundColor: showTopicsSidebar
                    ? 'rgba(255,140,66,0.25)'
                    : (isDark ? 'rgba(255,255,255,0.1)' : theme.colors.surface),
                  borderWidth: 1,
                  borderColor: showTopicsSidebar ? 'rgba(255,140,66,0.5)' : 'transparent',
                },
              ]}
              onPress={() => setShowTopicsSidebar(!showTopicsSidebar)}
            >
              <Icon
                name={showTopicsSidebar ? 'close' : 'book-open-outline'}
                size={20}
                color={showTopicsSidebar ? '#FF8C42' : theme.colors.textPrimary}
              />
            </TouchableOpacity>
            <View style={styles.progressLabel}>
              <Icon name="trending-up" size={16} color={theme.colors.primary} />
              <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>Progress</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFillGreen, { width: `${progress * 0.7}%` }]} />
                <View style={[styles.progressFillPurple, { width: `${progress * 0.3}%`, left: `${progress * 0.7}%` }]} />
              </View>
            </View>
            <Text style={[styles.progressPercent, { color: theme.colors.primary }]}>{progress}%</Text>
          </View>

          {/* ── Main card (mirrors manualFlexArea / manualContentArea) ── */}
          <View style={styles.cardFlexArea}>
            <View style={[styles.cardContentArea, { flex: 1, backgroundColor: isDark ? '#1a1a2e' : '#1e293b' }]}>

              {/* Header: presentation icon + title + Live/Paused badge + Pause/Resume */}
              <View style={[styles.cardHeader, { backgroundColor: isDark ? '#12122a' : '#0f172a' }]}>
                <MaterialIcon name="presentation" size={16} color="#fff" />
                <Text style={styles.cardHeaderTitle} numberOfLines={1}>
                  {lecture?.title || topic?.title || 'AI Lecture'}
                </Text>
                {isPlaying ? (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>Live</Text>
                  </View>
                ) : (
                  <View style={[styles.liveBadge, { backgroundColor: '#374151' }]}>
                    <Icon name="pause" size={10} color="#9ca3af" />
                    <Text style={[styles.liveBadgeText, { color: '#9ca3af' }]}>Paused</Text>
                  </View>
                )}
                <TouchableOpacity style={[styles.headerBtn, { marginLeft: 4 }]} onPress={togglePause}>
                  <Icon name={isPlaying ? 'pause' : 'play'} size={13} color="#fff" />
                  <Text style={styles.headerBtnText}>{isPlaying ? 'Pause' : 'Resume'}</Text>
                </TouchableOpacity>
              </View>

              {/* Compact AI status bar */}
              <View style={styles.aiStatusBar}>
                <RNAnimated.View style={[styles.aiStatusAvatar, { transform: [{ scale: pulseAnim }], opacity: isPlaying ? 1 : 0.5 }]}>
                  <MaterialIcon name="robot" size={20} color="#fff" />
                </RNAnimated.View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiStatusName}>AI Tutor</Text>
                  <Text style={styles.aiStatusSub} numberOfLines={1}>{tutorStatus.label}</Text>
                </View>
                {isPlaying ? (
                  <View style={styles.soundWaveRow}>
                    {[6, 12, 18, 24, 16, 20, 12, 7].map((h, i) => (
                      <View key={i} style={[styles.soundBar, { height: h }]} />
                    ))}
                  </View>
                ) : (
                  <View style={[styles.liveBadge, { backgroundColor: '#374151' }]}>
                    <Icon name="pause" size={10} color="#9ca3af" />
                    <Text style={[styles.liveBadgeText, { color: '#9ca3af' }]}>Paused</Text>
                  </View>
                )}
              </View>

              {/* Scrollable lecture content */}
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>

                {/* Whiteboard / board surface */}
                <View style={[styles.whiteboardBox, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                  <View style={styles.boardTopRow}>
                    <View style={[styles.boardModeBadge, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                      <Text style={styles.boardModeText}>{classroomModeLabel}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowNotesModal(true)} style={{ marginLeft: 'auto' }}>
                      <Icon name="document-text-outline" size={18} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.boardObjective} numberOfLines={2}>
                    {panelContent.learningObjective || currentChunk.learningObjective || currentChunk.summary}
                  </Text>
                  <Text style={styles.boardTitle}>{boardContent?.title || currentChunk.title}</Text>
                  <View style={styles.boardSurface}>
                    {renderBoardSurface()}
                  </View>
                  {renderSupportPanel()}
                </View>

                {/* Live narration / subtitles */}
                <View style={[styles.narrationBox, { backgroundColor: 'rgba(0,0,0,0.25)' }]}>
                  <View style={styles.narrationHeader}>
                    <MaterialIcon name="subtitles" size={14} color="#9ca3af" />
                    <Text style={styles.narrationTitle}>Live Teaching Text</Text>
                    <View style={[styles.modeBadge, { marginLeft: 'auto' }]}>
                      <Text style={styles.modeBadgeText}>{classroomModeLabel.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.narrationText}>{liveNarration}</Text>
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

                {/* Question / chat panel (when open) */}
                {showQuestionPanel && (
                  <View style={[styles.qaCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' }]}>
                    <View style={styles.qaHeader}>
                      <Text style={[styles.qaTitle, { color: '#e2e8f0' }]}>Ask Your Question</Text>
                      <TouchableOpacity onPress={() => setShowQuestionPanel(false)}>
                        <Icon name="close" size={20} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.chatScroll} contentContainerStyle={styles.chatScrollContent}>
                      {!chatMessages.length && !submittingQuestion && (
                        <View style={[styles.chatEmptyState, { borderColor: 'rgba(255,255,255,0.1)' }]}>
                          <MaterialIcon name="chat-processing-outline" size={20} color={theme.colors.primary} />
                          <Text style={[styles.chatEmptyTitle, { color: '#e2e8f0' }]}>Ask about this lecture point</Text>
                          <Text style={[styles.chatEmptyText, { color: '#9ca3af' }]}>The AI Tutor will answer from the current lecture context.</Text>
                        </View>
                      )}
                      {chatMessages.map((message, index) => (
                        <View key={`${message.type}-${index}`} style={[styles.chatBubble, message.type === 'user' ? styles.chatBubbleUser : styles.chatBubbleAi]}>
                          <Text style={[styles.chatRole, { color: message.type === 'user' ? 'rgba(255,255,255,0.75)' : theme.colors.primary }]}>
                            {message.type === 'user' ? 'You' : 'AI Tutor'}
                          </Text>
                          <Text style={{ color: message.type === 'user' ? '#fff' : '#e2e8f0', lineHeight: 21 }}>{message.text}</Text>
                        </View>
                      ))}
                      {submittingQuestion && (
                        <View style={[styles.chatBubble, styles.chatBubbleAi]}>
                          <Text style={[styles.chatRole, { color: theme.colors.primary }]}>AI Tutor</Text>
                          <Text style={{ color: '#9ca3af' }}>Preparing a contextual explanation...</Text>
                        </View>
                      )}
                    </ScrollView>
                    <View style={[styles.inputRow, { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: isDark ? '#111827' : '#f8fafc' }]}>
                      <TouchableOpacity style={[styles.inputIconBtn, { backgroundColor: isRecording ? theme.colors.error : theme.colors.primary }]} onPress={startVoiceInput}>
                        <Icon name={isRecording ? 'stop' : 'mic'} size={18} color="#fff" />
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.input, {
                          color: theme.colors.textPrimary,
                          backgroundColor: isDark ? '#2d2d44' : '#f1f5f9',
                          borderColor: isDark ? '#3d3d5c' : '#e2e8f0',
                        }]}
                        value={question}
                        onChangeText={setQuestion}
                        onSubmitEditing={askQuestion}
                        placeholder={isRecording ? 'Listening...' : 'Type your question...'}
                        placeholderTextColor={theme.colors.textTertiary}
                        multiline
                      />
                      <TouchableOpacity style={[styles.inputIconBtn, { backgroundColor: theme.colors.primary }]} onPress={askQuestion} disabled={submittingQuestion}>
                        {submittingQuestion ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="send" size={18} color="#fff" />}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

              </ScrollView>
            </View>
          </View>

          {/* ── Bottom control bar (mirrors LearningScreen bottomBar) ── */}
          <View style={styles.bottomBar}>
            {/* Quiz — full-width green pill */}
            <TouchableOpacity
              style={[styles.quizButton, { backgroundColor: lectureCompleted ? '#10b981' : '#374151' }]}
              onPress={openQuiz}
            >
              <MaterialIcon name="help-circle" size={20} color={lectureCompleted ? '#fff' : '#9ca3af'} />
              <Text style={[styles.quizButtonText, { color: lectureCompleted ? '#fff' : '#9ca3af' }]}>
                {lectureCompleted ? 'Take Quiz' : 'Finish Lecture First'}
              </Text>
            </TouchableOpacity>

            {/* Icon buttons */}
            <View style={styles.bottomControls}>
              {lectureCompleted && (
                <TouchableOpacity style={[styles.bottomIconBtn, { backgroundColor: isDark ? '#2d2d44' : '#e2e8f0' }]} onPress={restartLecture}>
                  <Icon name="refresh" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.bottomIconBtn, { backgroundColor: isDark ? '#2d2d44' : '#e2e8f0' }]} onPress={() => setShowFlashcardsModal(true)}>
                <MaterialIcon name="cards-outline" size={22} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bottomIconBtn, { backgroundColor: isDark ? '#2d2d44' : '#e2e8f0' }]} onPress={() => setShowNotesModal(true)}>
                <Icon name="document-text-outline" size={22} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bottomIconBtn, { backgroundColor: showQuestionPanel ? theme.colors.primary : (isDark ? '#2d2d44' : '#e2e8f0') }]} onPress={openQuestionPanel}>
                <Icon name="chatbubble-ellipses-outline" size={22} color={showQuestionPanel ? '#fff' : theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bottomIconBtn, { backgroundColor: isDark ? '#2d2d44' : '#e2e8f0' }]} onPress={goToNextChunk} disabled={lectureCompleted}>
                <Icon name="play-skip-forward" size={22} color={lectureCompleted ? theme.colors.textTertiary : theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bottomIconBtn, { backgroundColor: voiceMode ? theme.colors.primary : (isDark ? '#2d2d44' : '#e2e8f0') }]} onPress={() => setVoiceMode(prev => !prev)}>
                <MaterialIcon name={voiceMode ? 'volume-high' : 'volume-off'} size={22} color={voiceMode ? '#fff' : theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
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

      <Modal visible={showFlashcardsModal} transparent animationType="slide" onRequestClose={() => setShowFlashcardsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? theme.colors.card : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Flashcards</Text>
              <TouchableOpacity onPress={() => setShowFlashcardsModal(false)}>
                <Icon name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
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
        </View>
      </Modal>

      <Modal visible={showNotesModal} transparent animationType="slide" onRequestClose={() => setShowNotesModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? theme.colors.card : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Lecture Notes</Text>
              <TouchableOpacity onPress={() => setShowNotesModal(false)}>
                <Icon name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
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
        </View>
      </Modal>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  // ── Outer wrappers (mirrors LearningScreen) ────────────────────────────────
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16 },
  mainContent: { flex: 1 },
  learningArea: { flex: 1, padding: 16 },

  // ── Progress section (identical to LearningScreen) ─────────────────────────
  progressSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  sidebarToggleBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  progressLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressText: { fontSize: 12, fontWeight: '500' },
  progressBarContainer: { flex: 1 },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', flexDirection: 'row' },
  progressFillGreen: { height: '100%', backgroundColor: '#10b981' },
  progressFillPurple: { height: '100%', backgroundColor: '#a855f7', position: 'absolute' },
  progressPercent: { fontSize: 12, fontWeight: '600' },

  // ── Main card (mirrors manualFlexArea / manualContentArea) ─────────────────
  cardFlexArea: { flex: 1, flexDirection: 'column' },
  cardContentArea: { borderRadius: 12, overflow: 'hidden' },

  // ── Card header (mirrors manualHeader) ─────────────────────────────────────
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  cardHeaderTitle: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  headerBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // ── Live / Paused badge ────────────────────────────────────────────────────
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: '#10b981' },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#d1fae5' },
  liveBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  // ── AI status bar (mirrors LearningScreen aiStatusBar) ────────────────────
  aiStatusBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginTop: 12, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(139, 92, 246, 0.1)', borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)' },
  aiStatusAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center' },
  aiStatusName: { fontSize: 12, fontWeight: '700', color: '#e2e8f0' },
  aiStatusSub: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  soundWaveRow: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 28 },
  soundBar: { width: 3, borderRadius: 2, backgroundColor: '#10b981' },

  // ── Whiteboard box ────────────────────────────────────────────────────────
  whiteboardBox: { margin: 12, marginTop: 10, borderRadius: 12, padding: 14, minHeight: 200 },
  boardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  boardModeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  boardModeText: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  boardObjective: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginBottom: 6 },
  boardTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  boardSurface: { borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', padding: 14, gap: 8 },
  boardBodyText: { color: '#e2e8f0', fontSize: 14, lineHeight: 22 },
  boardBullet: { color: '#e2e8f0', fontSize: 14, lineHeight: 22, marginBottom: 6 },
  boardEmphasis: { color: '#93c5fd', fontSize: 13, lineHeight: 20, marginTop: 10, fontStyle: 'italic' },
  boardQuestion: { color: '#fef3c7', fontSize: 20, lineHeight: 28, fontWeight: '700' },

  // ── Board content types ───────────────────────────────────────────────────
  flowStep: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  flowStepBadge: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  flowStepBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  flowStepText: { flex: 1, color: '#e2e8f0', fontSize: 13, lineHeight: 20 },
  boardTable: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  boardTableRow: { padding: 10, borderBottomWidth: 1 },
  boardTableTitle: { color: '#fff', fontSize: 12, fontWeight: '700', marginBottom: 3 },
  boardTableBody: { fontSize: 11, lineHeight: 17, color: '#cbd5e1' },
  nodeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  liveNodeCard: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  liveNodeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  codePanel: { borderWidth: 1, borderRadius: 12, padding: 12, backgroundColor: 'rgba(15,23,42,0.92)' },
  codeLanguage: { color: '#93c5fd', fontSize: 10, fontWeight: '700', marginBottom: 8, letterSpacing: 1 },
  codeText: { color: '#e5e7eb', fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', fontSize: 12, lineHeight: 19 },
  codeHint: { color: '#cbd5e1', fontSize: 11, lineHeight: 17, marginTop: 10 },

  // ── Support card ──────────────────────────────────────────────────────────
  supportCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10 },
  supportLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  supportText: { fontSize: 13, lineHeight: 19 },

  // ── Narration / subtitles box ─────────────────────────────────────────────
  narrationBox: { borderRadius: 10, padding: 14, margin: 12, marginTop: 0 },
  narrationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  narrationTitle: { fontSize: 12, fontWeight: '600', color: '#cbd5e1' },
  modeBadge: { backgroundColor: '#3b82f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  modeBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  narrationText: { fontSize: 14, lineHeight: 22, color: '#e2e8f0' },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  segmentPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, maxWidth: '100%' },
  segmentText: { fontSize: 10, fontWeight: '600' },

  // ── Question / chat panel ─────────────────────────────────────────────────
  qaCard: { borderRadius: 12, padding: 14, margin: 12, marginTop: 0, maxHeight: 340 },
  qaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  qaTitle: { fontSize: 14, fontWeight: '700' },
  chatScroll: { maxHeight: 170, marginBottom: 10 },
  chatScrollContent: { paddingBottom: 4 },
  chatEmptyState: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 8 },
  chatEmptyTitle: { fontSize: 13, fontWeight: '700', marginTop: 6, marginBottom: 4 },
  chatEmptyText: { fontSize: 11, lineHeight: 17, textAlign: 'center' },
  chatBubble: { padding: 10, borderRadius: 12, marginBottom: 6, maxWidth: '92%' },
  chatBubbleUser: { backgroundColor: '#4F46E5', alignSelf: 'flex-end' },
  chatBubbleAi: { backgroundColor: 'rgba(79,70,229,0.12)', alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  chatRole: { fontSize: 10, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  inputRow: { flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: 16, padding: 8, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 40, maxHeight: 80, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, fontSize: 13 },
  inputIconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  // ── Bottom bar (mirrors LearningScreen bottomBar) ─────────────────────────
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  quizButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 25 },
  quizButtonText: { fontSize: 14, fontWeight: '600' },
  bottomControls: { flexDirection: 'row', gap: 8 },
  bottomIconBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 13, borderRadius: 8 },

  // ── Topics sidebar ────────────────────────────────────────────────────────
  sidebar: { flex: 1, paddingTop: 8, paddingHorizontal: 8 },
  sidebarTitle: { fontSize: 14, fontWeight: '700', padding: 16 },
  sidebarItem: { borderLeftWidth: 3, borderLeftColor: 'transparent', padding: 12, marginHorizontal: 8, marginBottom: 4, borderRadius: 10 },
  sidebarItemText: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  sidebarItemDuration: { fontSize: 11, marginBottom: 4 },
  sidebarItemStatus: { fontSize: 11 },

  // ── Modals ────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.72)', padding: 20 },
  modalCard: { borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  flashcard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  flashcardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 },
  flashcardLabel: { fontSize: 12, fontWeight: '700' },
  flashcardHint: { fontSize: 11, fontWeight: '600' },
  flashcardFront: { fontSize: 15, lineHeight: 22, marginBottom: 10, fontWeight: '600' },
  flashcardDivider: { height: 1, marginBottom: 10 },
  flashcardMeta: { fontSize: 12, lineHeight: 17 },
  notesTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  notesBody: { fontSize: 13, lineHeight: 21, marginBottom: 6 },
  noteSection: { marginBottom: 12 },
  noteSectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 5 },
});

export default LearningScreen;
