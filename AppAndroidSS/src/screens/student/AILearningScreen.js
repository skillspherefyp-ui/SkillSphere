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

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const PANEL_KEYS = { CHAT: 'chat', NOTES: 'notes', FLASHCARDS: 'flashcards', MORE: 'more' };

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
  const [isPlaying, setIsPlaying] = useState(true);
  const [voiceMode, setVoiceMode] = useState(Platform.OS === 'web');
  const [isRecording, setIsRecording] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [lectureCompleted, setLectureCompleted] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [revealedFlashcards, setRevealedFlashcards] = useState({});
  const [teachingProgress, setTeachingProgress] = useState(0);
  const [raisedHandPulse] = useState(new RNAnimated.Value(1));

  const recognitionRef = useRef(null);
  const playbackRef = useRef(null);
  const audioRef = useRef(null);
  const baseHost = API_BASE.replace(/\/api$/, '');
  const isCompact = width < 1180;
  const isMobile = width < 768;
  const panelWidth = Math.min(380, Math.max(320, Math.round(width * (isMobile ? 0.92 : 0.3))));
  const stageHeight = Math.max(280, Math.min(height * (isMobile ? 0.46 : 0.54), 560));

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
  const currentModeLabel = activePanel === PANEL_KEYS.CHAT ? 'Question mode' : voiceMode ? 'Live voice teaching' : 'Guided text teaching';

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
    ? { label: 'Lecture complete', detail: 'Quiz is ready. Review notes or launch the assessment when you are ready.', tone: '#22c55e' }
    : activePanel === PANEL_KEYS.CHAT
      ? { label: 'Question time', detail: submittingQuestion ? 'AI Tutor is preparing a contextual answer.' : 'Your lecture is paused on this exact moment for discussion.', tone: '#f59e0b' }
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
  useEffect(() => { setTeachingProgress(0); }, [currentChunk?.id]);

  useEffect(() => {
    if (session && currentChunk && isPlaying && activePanel !== PANEL_KEYS.CHAT && !lectureCompleted) playChunk();
    else stopPlayback();
    return () => stopPlayback();
  }, [session?.id, currentChunk?.id, isPlaying, activePanel, lectureCompleted, voiceMode]);

  useEffect(() => {
    if (!currentChunk || !isPlaying || activePanel === PANEL_KEYS.CHAT || lectureCompleted) return undefined;
    const duration = recommendedDurationMs || Math.min(12000, Math.max(3600, currentNarration.length * 28));
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const nextProgress = Math.min(1, (Date.now() - startedAt) / duration);
      setTeachingProgress(nextProgress);
      if (nextProgress >= 1) clearInterval(timer);
    }, 180);
    return () => clearInterval(timer);
  }, [currentChunk?.id, isPlaying, activePanel, lectureCompleted, recommendedDurationMs, currentNarration]);

  const stopPlayback = () => {
    if (playbackRef.current) {
      clearTimeout(playbackRef.current);
      playbackRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause?.();
      audioRef.current = null;
    }
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
        Toast.show({ type: 'error', text1: 'Playback Paused', text2: error.message || 'Unable to continue the lecture.' });
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
      } catch (_) {}

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
        if (!response.success) throw new Error(response.error || 'Unable to pause tutor session');
        stopPlayback();
        setIsPlaying(false);
      } else {
        const response = await aiTutorAPI.resumeSession(session.id);
        if (!response.success) throw new Error(response.error || 'Unable to resume tutor session');
        setSession(response.session);
        setCurrentChunk(response.chunk);
        setIsPlaying(true);
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Session Error', text2: error.message || 'Unable to update tutor state.' });
    }
  };

  const openChatPanel = async () => {
    if (session && isPlaying) {
      try {
        const response = await aiTutorAPI.pauseSession(session.id);
        if (!response.success) throw new Error(response.error || 'Unable to pause tutor session');
        stopPlayback();
        setIsPlaying(false);
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Pause Failed', text2: error.message || 'Unable to pause for questions.' });
      }
    }
    setActivePanel(PANEL_KEYS.CHAT);
  };

  const closePanel = () => setActivePanel(null);

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
      setIsPlaying(true);
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
      setIsPlaying(true);
      setTeachingProgress(0);
      Toast.show({ type: 'success', text1: 'Lecture Restarted', text2: 'Starting again from the first chunk.' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Restart Failed', text2: error.message || 'Unable to restart this lecture right now.' });
    }
  };

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
    if (!boardContent) return <Text style={styles.boardBodyText}>{currentChunk.learningObjective || currentChunk.summary}</Text>;
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
        <View style={[styles.boardTable, { borderColor: 'rgba(148, 163, 184, 0.24)' }]}>
          {getProgressiveItems(boardContent.rows).map((row, index) => (
            <View key={`${row.left}-${index}`} style={[styles.boardTableRow, { borderBottomColor: 'rgba(148, 163, 184, 0.16)' }]}>
              <Text style={styles.boardTableTitle}>{row.left}</Text>
              <Text style={styles.boardTableBody}>{row.right}</Text>
            </View>
          ))}
        </View>
      );
    }
    if (boardContent.type === 'diagram') {
      return (
        <View style={styles.nodeWrap}>
          {getProgressiveItems(boardContent.nodes).map((node, index) => (
            <View key={node.id || index} style={styles.liveNodeCard}>
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
        <View style={styles.codePanel}>
          <Text style={styles.codeLanguage}>{(boardContent.snippetLanguage || 'text').toUpperCase()}</Text>
          <Text style={styles.codeText}>{visibleLines.join('\n')}</Text>
          {!!boardContent.snippetExplanation && <Text style={styles.codeHint}>{boardContent.snippetExplanation}</Text>}
        </View>
      );
    }
    if (boardContent.type === 'checkpoint') return <Text style={styles.boardQuestion}>{boardContent.question}</Text>;
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

  const renderMorePanel = () => (
    <View style={styles.drawerPanel}>
      <View style={styles.drawerHeader}>
        <View>
          <Text style={[styles.drawerEyebrow, { color: theme.colors.primary }]}>Lecture essentials</Text>
          <Text style={[styles.drawerTitle, { color: theme.colors.textPrimary }]}>Classroom tools</Text>
        </View>
        <TouchableOpacity style={[styles.drawerClose, { backgroundColor: isDark ? '#162130' : '#eef2ff' }]} onPress={closePanel}>
          <Icon name="close" size={18} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.moreBlock, { borderColor: theme.colors.border }]}>
          <Text style={[styles.moreBlockTitle, { color: theme.colors.textPrimary }]}>Current lecture</Text>
          <Text style={[styles.moreBlockText, { color: theme.colors.textSecondary }]}>{lecture.title}</Text>
          <Text style={[styles.moreBlockText, { color: theme.colors.textSecondary }]}>Section {currentChunk.sectionIndex + 1} - Chunk {currentChunk.chunkIndex + 1}</Text>
          {!!lectureDurationLabel && <Text style={[styles.moreBlockText, { color: theme.colors.textSecondary }]}>{lectureDurationLabel}</Text>}
        </View>
        {!!supportPanel && (
          <View style={[styles.moreBlock, { borderColor: theme.colors.border }]}>
            <Text style={[styles.moreBlockTitle, { color: theme.colors.textPrimary }]}>{supportPanel.title}</Text>
            <Text style={[styles.moreBlockText, { color: theme.colors.textSecondary }]}>{supportPanel.text}</Text>
          </View>
        )}
        {!!checkpointText && (
          <View style={[styles.moreBlock, { borderColor: theme.colors.border }]}>
            <Text style={[styles.moreBlockTitle, { color: theme.colors.textPrimary }]}>Checkpoint</Text>
            <Text style={[styles.moreBlockText, { color: theme.colors.textSecondary }]}>{checkpointText}</Text>
          </View>
        )}
        {!!reinforcementPoints.length && (
          <View style={[styles.moreBlock, { borderColor: theme.colors.border }]}>
            <Text style={[styles.moreBlockTitle, { color: theme.colors.textPrimary }]}>Reinforcement points</Text>
            {reinforcementPoints.slice(0, 4).map((point, index) => (
              <Text key={`${point}-${index}`} style={[styles.moreBullet, { color: theme.colors.textSecondary }]}>- {point}</Text>
            ))}
          </View>
        )}
        {!!confusionPoints.length && (
          <View style={[styles.moreBlock, { borderColor: theme.colors.border }]}>
            <Text style={[styles.moreBlockTitle, { color: theme.colors.textPrimary }]}>Watch for confusion</Text>
            {confusionPoints.slice(0, 4).map((point, index) => (
              <Text key={`${point}-${index}`} style={[styles.moreBullet, { color: theme.colors.textSecondary }]}>- {point}</Text>
            ))}
          </View>
        )}
        <View style={[styles.moreBlock, { borderColor: theme.colors.border }]}>
          <Text style={[styles.moreBlockTitle, { color: theme.colors.textPrimary }]}>Course topics</Text>
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
        </View>
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

  const renderPanel = () => {
    switch (activePanel) {
      case PANEL_KEYS.CHAT: return renderChatPanel();
      case PANEL_KEYS.NOTES: return renderNotesPanel();
      case PANEL_KEYS.FLASHCARDS: return renderFlashcardsPanel();
      case PANEL_KEYS.MORE: return renderMorePanel();
      default: return null;
    }
  };

  const renderTopButton = ({ key, icon, label, onPress, active, disabled, iconSet = 'ion' }) => {
    const IconComponent = iconSet === 'material' ? MaterialIcon : Icon;
    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.topActionButton,
          {
            backgroundColor: active ? `${theme.colors.primary}20` : (isDark ? 'rgba(15,23,42,0.78)' : 'rgba(255,255,255,0.86)'),
            borderColor: active ? `${theme.colors.primary}66` : theme.colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <IconComponent name={icon} size={18} color={active ? theme.colors.primary : theme.colors.textSecondary} />
        {!isMobile && <Text style={[styles.topActionLabel, { color: active ? theme.colors.textPrimary : theme.colors.textSecondary }]}>{label}</Text>}
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
    { key: 'mic', icon: isRecording ? 'stop' : 'mic-outline', label: isRecording ? 'Stop Mic' : 'Mic', onPress: startVoiceInput, active: isRecording, disabled: false },
    { key: 'raise-hand', icon: 'hand-right-outline', label: 'Raise Hand', onPress: openChatPanel, active: activePanel === PANEL_KEYS.CHAT, disabled: false },
    { key: 'chat', icon: 'chatbubble-ellipses-outline', label: 'AI Chat', onPress: openChatPanel, active: activePanel === PANEL_KEYS.CHAT, disabled: false },
    { key: 'notes', icon: 'document-text-outline', label: 'Notes', onPress: () => setActivePanel(PANEL_KEYS.NOTES), active: activePanel === PANEL_KEYS.NOTES, disabled: false },
    { key: 'flashcards', icon: 'cards-outline', label: 'Flashcards', onPress: () => setActivePanel(PANEL_KEYS.FLASHCARDS), active: activePanel === PANEL_KEYS.FLASHCARDS, disabled: !(lecture.flashcards || []).length, iconSet: 'material' },
    { key: 'quiz', icon: 'help-circle-outline', label: 'Quiz', onPress: openQuiz, active: false, disabled: false, iconSet: 'material' },
    { key: 'more', icon: 'ellipsis-horizontal', label: 'More', onPress: () => setActivePanel(PANEL_KEYS.MORE), active: activePanel === PANEL_KEYS.MORE, disabled: false },
  ];

  return (
    <MainLayout showSidebar={false} showHeader={false}>
      <View style={[styles.screen, { backgroundColor: isDark ? '#08111d' : '#eef4fb' }]}>
        <View style={[styles.backgroundGlow, styles.backgroundGlowTop, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : 'rgba(96, 165, 250, 0.18)' }]} />
        <View style={[styles.backgroundGlow, styles.backgroundGlowBottom, { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.12)' : 'rgba(14, 165, 233, 0.14)' }]} />

        <View style={[styles.shell, { padding: isMobile ? 12 : 20 }]}>
          <View style={[styles.topBar, isCompact && styles.topBarStack, { backgroundColor: isDark ? 'rgba(8,17,29,0.88)' : 'rgba(255,255,255,0.88)', borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.22)' }]}>
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
              <View style={[styles.progressCluster, isMobile && styles.progressClusterCompact, { backgroundColor: isDark ? '#0d1725' : '#f8fbff', borderColor: theme.colors.border }]}>
                <Text style={[styles.progressCaption, { color: theme.colors.textSecondary }]}>Progress</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.colors.primary }]} />
                </View>
                <Text style={[styles.progressValue, { color: theme.colors.textPrimary }]}>{progress}%</Text>
              </View>

              <View style={[styles.commandBar, isMobile && styles.commandBarCompact]}>
                {topActions.map(renderTopButton)}
              </View>
            </View>
          </View>

          <View style={[styles.mainRow, { flexDirection: isCompact ? 'column' : 'row' }]}>
            <View style={styles.stageColumn}>
              <View style={[styles.stageFrame, { minHeight: stageHeight, backgroundColor: isDark ? '#f8fbff' : '#ffffff', borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.20)' }]}>
                <View style={[styles.stageChrome, { borderBottomColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.18)' }]}>
                  <View style={styles.stageChromeLeft}>
                    <Text style={[styles.stageLabel, { color: theme.colors.textSecondary }]}>WHITEBOARD</Text>
                    <Text style={[styles.stageTopic, { color: '#0f172a' }]} numberOfLines={1}>{boardContent?.title || currentChunk.title}</Text>
                  </View>
                  <View style={styles.stageChips}>
                    <View style={[styles.stageChip, { backgroundColor: '#eff6ff' }]}>
                      <Text style={[styles.stageChipText, { color: '#1d4ed8' }]}>{classroomModeLabel}</Text>
                    </View>
                    <View style={[styles.stageChip, { backgroundColor: '#f8fafc' }]}>
                      <Text style={[styles.stageChipText, { color: '#334155' }]}>{teachingStyleLabel}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.stageBody}>
                  <View style={styles.boardHeader}>
                    <Text style={[styles.boardObjective, { color: '#475569' }]} numberOfLines={2}>{panelContent.learningObjective || currentChunk.learningObjective || currentChunk.summary}</Text>
                    <View style={styles.boardMetrics}>
                      <View style={[styles.metricCard, { backgroundColor: '#f8fafc' }]}>
                        <Text style={[styles.metricLabel, { color: '#64748b' }]}>Mode</Text>
                        <Text style={[styles.metricValue, { color: '#0f172a' }]}>{voiceMode ? 'Voice' : 'Text'}</Text>
                      </View>
                      <View style={[styles.metricCard, { backgroundColor: '#f8fafc' }]}>
                        <Text style={[styles.metricLabel, { color: '#64748b' }]}>Concept</Text>
                        <Text style={[styles.metricValue, { color: '#0f172a' }]}>{conceptTypeLabel}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.boardCanvas, { backgroundColor: '#f8fbff', borderColor: '#dbe7f5' }]}>
                    {transitionText ? (
                      <View style={[styles.transitionStrip, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                        <Text style={[styles.transitionLabel, { color: '#1d4ed8' }]}>Transition</Text>
                        <Text style={[styles.transitionText, { color: '#334155' }]} numberOfLines={2}>{transitionText}</Text>
                      </View>
                    ) : null}
                    <View style={[styles.boardContentWrap, isMobile && styles.boardContentWrapMobile]}>{renderBoardSurface()}</View>
                    {!!supportPanel && !isMobile && (
                      <View style={[styles.boardSupport, { backgroundColor: '#ffffff', borderColor: '#dbe7f5' }]}>
                        <Text style={[styles.boardSupportTitle, { color: '#0f172a' }]} numberOfLines={1}>{supportPanel.title}</Text>
                        <Text style={[styles.boardSupportText, { color: '#64748b' }]} numberOfLines={3}>{supportPanel.text}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.stageFooter, { borderTopColor: '#dbe7f5' }]}>
                  <View style={styles.stageStatus}>
                    <View style={[styles.statusPulse, { backgroundColor: tutorStatus.tone }]} />
                    <View style={styles.statusCopy}>
                      <Text style={[styles.stageStatusTitle, { color: '#0f172a' }]}>{tutorStatus.label}</Text>
                      <Text style={[styles.stageStatusText, { color: '#64748b' }]} numberOfLines={1}>{tutorStatus.detail}</Text>
                    </View>
                  </View>
                  <View style={styles.transportControls}>
                    <TouchableOpacity style={[styles.transportButton, { backgroundColor: isPlaying ? '#e0f2fe' : '#ede9fe' }]} onPress={togglePause}>
                      <Icon name={isPlaying ? 'pause' : 'play'} size={18} color={isPlaying ? '#0369a1' : '#5b21b6'} />
                      {!isMobile && <Text style={[styles.transportText, { color: isPlaying ? '#0369a1' : '#5b21b6' }]}>{isPlaying ? 'Pause' : 'Resume'}</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.transportButton, { backgroundColor: '#f8fafc' }]} onPress={goToNextChunk} disabled={lectureCompleted}>
                      <Icon name="play-skip-forward" size={18} color={lectureCompleted ? '#94a3b8' : '#334155'} />
                      {!isMobile && <Text style={[styles.transportText, { color: lectureCompleted ? '#94a3b8' : '#334155' }]}>Next</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.transportButton, { backgroundColor: '#f8fafc' }]} onPress={() => setVoiceMode((prev) => !prev)}>
                      <MaterialIcon name={voiceMode ? 'volume-high' : 'volume-off'} size={18} color="#334155" />
                      {!isMobile && <Text style={[styles.transportText, { color: '#334155' }]}>{voiceMode ? 'Voice On' : 'Voice Off'}</Text>}
                    </TouchableOpacity>
                    <RNAnimated.View style={{ transform: [{ scale: raisedHandPulse }] }}>
                      <TouchableOpacity style={[styles.transportButton, { backgroundColor: activePanel === PANEL_KEYS.CHAT ? '#fff7ed' : '#f8fafc' }]} onPress={openChatPanel}>
                        <Icon name="hand-right-outline" size={18} color={activePanel === PANEL_KEYS.CHAT ? '#c2410c' : '#334155'} />
                        {!isMobile && <Text style={[styles.transportText, { color: activePanel === PANEL_KEYS.CHAT ? '#c2410c' : '#334155' }]}>Ask</Text>}
                      </TouchableOpacity>
                    </RNAnimated.View>
                  </View>
                </View>
              </View>

              <View style={[styles.subtitleStrip, { backgroundColor: isDark ? 'rgba(8,17,29,0.92)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.22)' }]}>
                <View style={styles.subtitleHeader}>
                  <Text style={[styles.subtitleLabel, { color: theme.colors.primary }]}>Live subtitles</Text>
                  <Text style={[styles.subtitleMeta, { color: theme.colors.textSecondary }]}>{classroomModeLabel}</Text>
                </View>
                <Text style={[styles.subtitleText, { color: theme.colors.textPrimary }]} numberOfLines={isMobile ? 2 : 3}>{liveNarration || currentNarration || 'The lecture narration will appear here as the tutor teaches.'}</Text>
                {!!narrationSegments.length && !isMobile && (
                  <View style={styles.segmentRow}>
                    {narrationSegments.slice(0, 4).map((segment, index) => (
                      <View key={`${segment}-${index}`} style={[styles.segmentPill, { backgroundColor: index === 0 ? `${theme.colors.primary}16` : (isDark ? '#101827' : '#eff6ff') }]}>
                        <Text style={[styles.segmentText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{segment}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {!isCompact && activePanel && (
              <View style={[styles.drawerRail, { width: panelWidth, backgroundColor: isDark ? 'rgba(8,17,29,0.9)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.22)' }]}>
                {renderPanel()}
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
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  topBarRightStack: { flexDirection: 'column', alignItems: 'stretch' },
  progressCluster: { minWidth: 170, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  progressClusterCompact: { minWidth: 0, width: '100%' },
  progressCaption: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  progressTrack: { height: 7, borderRadius: 999, backgroundColor: 'rgba(148, 163, 184, 0.2)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  progressValue: { fontSize: 15, fontWeight: '800' },
  commandBar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, maxWidth: 720 },
  commandBarCompact: { maxWidth: '100%' },
  topActionButton: { height: 44, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  topActionLabel: { fontSize: 13, fontWeight: '700' },
  mainRow: { flex: 1, gap: 14, overflow: 'hidden' },
  stageColumn: { flex: 1, gap: 12, minHeight: 0 },
  stageFrame: { flex: 1, borderRadius: 28, borderWidth: 1, overflow: 'hidden', minHeight: 0 },
  stageChrome: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  stageChromeLeft: { flex: 1, minWidth: 0 },
  stageLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  stageTopic: { fontSize: 24, fontWeight: '800' },
  stageChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  stageChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  stageChipText: { fontSize: 12, fontWeight: '700' },
  stageBody: { flex: 1, padding: 20, gap: 16, minHeight: 0 },
  boardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  boardObjective: { flex: 1, fontSize: 15, lineHeight: 23, fontWeight: '600' },
  boardMetrics: { flexDirection: 'row', gap: 10 },
  metricCard: { minWidth: 100, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16 },
  metricLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  metricValue: { fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
  boardCanvas: { flex: 1, borderRadius: 24, borderWidth: 1, padding: 20, position: 'relative', minHeight: 0 },
  transitionStrip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14, maxWidth: '82%' },
  transitionLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  transitionText: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  boardContentWrap: { flex: 1, justifyContent: 'center', minHeight: 0, paddingRight: 150 },
  boardContentWrapMobile: { paddingRight: 0 },
  boardBodyText: { color: '#0f172a', fontSize: 19, lineHeight: 30, fontWeight: '500' },
  boardBullet: { color: '#0f172a', fontSize: 18, lineHeight: 28, marginBottom: 10 },
  boardEmphasis: { color: '#2563eb', fontSize: 15, lineHeight: 23, marginTop: 12, fontStyle: 'italic' },
  boardQuestion: { color: '#b45309', fontSize: 28, lineHeight: 38, fontWeight: '800' },
  flowStep: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  flowStepBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  flowStepBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  flowStepText: { flex: 1, color: '#0f172a', fontSize: 16, lineHeight: 24, fontWeight: '600' },
  boardTable: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  boardTableRow: { padding: 14, borderBottomWidth: 1 },
  boardTableTitle: { color: '#0f172a', fontSize: 14, fontWeight: '800', marginBottom: 6 },
  boardTableBody: { color: '#475569', fontSize: 14, lineHeight: 21 },
  nodeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  liveNodeCard: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe7f5' },
  liveNodeText: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  codePanel: { borderWidth: 1, borderRadius: 18, padding: 16, backgroundColor: '#0f172a', borderColor: '#1e293b' },
  codeLanguage: { color: '#93c5fd', fontSize: 11, fontWeight: '700', marginBottom: 10, letterSpacing: 1 },
  codeText: { color: '#e5e7eb', fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', fontSize: 14, lineHeight: 21 },
  codeHint: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginTop: 12 },
  boardSupport: { position: 'absolute', right: 20, bottom: 20, width: 140, borderRadius: 18, padding: 12, borderWidth: 1, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4 },
  boardSupportTitle: { fontSize: 12, fontWeight: '800', marginBottom: 6 },
  boardSupportText: { fontSize: 12, lineHeight: 18 },
  stageFooter: { borderTopWidth: 1, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', gap: 16, alignItems: 'center' },
  stageStatus: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  statusPulse: { width: 10, height: 10, borderRadius: 999 },
  statusCopy: { flex: 1, minWidth: 0 },
  stageStatusTitle: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  stageStatusText: { fontSize: 13 },
  transportControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  transportButton: { minHeight: 42, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  transportText: { fontSize: 13, fontWeight: '700' },
  subtitleStrip: { borderWidth: 1, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 14, minHeight: 92, justifyContent: 'center' },
  subtitleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subtitleLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  subtitleMeta: { fontSize: 12, fontWeight: '600' },
  subtitleText: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  segmentPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, maxWidth: '100%' },
  segmentText: { fontSize: 11, fontWeight: '600' },
  drawerRail: { borderWidth: 1, borderRadius: 26, overflow: 'hidden' },
  drawerPanel: { flex: 1, padding: 18, minHeight: 0 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 },
  drawerEyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  drawerTitle: { fontSize: 20, fontWeight: '800' },
  drawerClose: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  drawerScroll: { flex: 1, minHeight: 0 },
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
  moreBlockTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  moreBlockText: { fontSize: 13, lineHeight: 20, marginBottom: 4 },
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
  compactDrawer: { position: 'absolute', top: 12, right: 12, bottom: 12, borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
});

export default LearningScreen;
