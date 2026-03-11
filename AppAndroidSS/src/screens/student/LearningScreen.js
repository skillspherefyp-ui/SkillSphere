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
              <Text style={[styles.sidebarItemStatus, { color: item.completed ? '#10B981' : isCurrent ? theme.colors.primary : theme.colors.textTertiary }]}>
                {item.completed ? 'Done' : item.status === 'locked' ? 'Locked' : isCurrent ? `${progress}%` : 'Ready'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderStructuredVisual = () => {
    const visualType = panelContent.visualType || currentChunk?.visualMode || 'none';
    const visualData = panelContent.visualData || currentChunk?.visualData || {};

    if (visualType === 'flowchart' && Array.isArray(visualData.steps) && visualData.steps.length > 0) {
      return visualData.steps.map((step, index) => (
        <View key={step.id || index} style={[styles.diagramRow, { borderColor: theme.colors.border }]}>
          <View style={[styles.diagramIndex, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.diagramIndexText}>{index + 1}</Text>
          </View>
          <Text style={[styles.diagramText, { color: theme.colors.textPrimary }]}>{step.label}</Text>
        </View>
      ));
    }

    if (visualType === 'comparison_table' && Array.isArray(visualData.rows) && visualData.rows.length > 0) {
      return (
        <View style={[styles.comparisonTable, { borderColor: theme.colors.border }]}>
          {visualData.rows.map((row, index) => (
            <View key={`${row.left}-${index}`} style={[styles.comparisonRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.comparisonCellTitle, { color: theme.colors.textPrimary }]}>{row.left}</Text>
              <Text style={[styles.comparisonCellBody, { color: theme.colors.textSecondary }]}>{row.right}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (Array.isArray(visualData.nodes) && visualData.nodes.length > 0) {
      return (
        <View style={styles.nodeWrap}>
          {visualData.nodes.map((node, index) => (
            <View key={node.id || index} style={[styles.nodeCard, { backgroundColor: isDark ? '#0f172a' : '#eff6ff', borderColor: theme.colors.border }]}>
              <Text style={[styles.nodeLabel, { color: theme.colors.textPrimary }]}>{node.label}</Text>
            </View>
          ))}
        </View>
      );
    }

    return <Text style={[styles.visualBody, { color: theme.colors.textSecondary }]}>{panelContent.visualCaption || currentChunk?.visualCaption || currentVisual?.caption || currentVisual?.suggestion || 'The tutor will use a structured explanation for this concept instead of a raw image.'}</Text>;
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
      showSidebar={false}
      showHeader={true}
      customSidebar={renderSidebar()}
      customSidebarVisible={showTopicsSidebar}
      onCustomSidebarToggle={setShowTopicsSidebar}
      customMenuIcon="book-open-variant"
    >
      <View style={[styles.container, { backgroundColor: isDark ? '#0f0f1a' : theme.colors.background }]}>
        <View style={styles.progressRow}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : theme.colors.surface }]} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.progressBarWrap}>
            <Text style={[styles.progressLabel, { color: theme.colors.textSecondary }]}>Chunk {Math.min(currentIndex + 1, totalChunks)} of {totalChunks}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.colors.primary }]} />
            </View>
          </View>
          <Text style={[styles.progressValue, { color: theme.colors.primary }]}>{progress}%</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={[styles.statusCard, { backgroundColor: isDark ? '#121a2b' : '#eef4ff', borderColor: `${tutorStatus.tone}33` }]}>
            <View style={styles.statusHeader}>
              <View style={styles.statusTitleWrap}>
                <View style={[styles.statusDot, { backgroundColor: tutorStatus.tone }]} />
                <Text style={[styles.statusTitle, { color: theme.colors.textPrimary }]}>{tutorStatus.label}</Text>
              </View>
              <Text style={[styles.statusMeta, { color: tutorStatus.tone }]}>{voiceMode ? 'Voice' : 'Text'}</Text>
            </View>
            <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>{tutorStatus.detail}</Text>
            <View style={styles.metaPills}>
              <View style={[styles.metaPill, { backgroundColor: isDark ? '#1f2937' : '#dbeafe' }]}>
                <Text style={[styles.metaPillText, { color: theme.colors.textPrimary }]}>{teachingStyleLabel}</Text>
              </View>
              <View style={[styles.metaPill, { backgroundColor: isDark ? '#1f2937' : '#dcfce7' }]}>
                <Text style={[styles.metaPillText, { color: theme.colors.textPrimary }]}>{conceptTypeLabel}</Text>
              </View>
            </View>
          </View>

          {!!transitionText && (
            <View style={[styles.transitionCard, { backgroundColor: isDark ? '#14213d' : '#fff7ed', borderColor: isDark ? '#2b3f67' : '#fdba74' }]}>
              <Text style={[styles.transitionLabel, { color: isDark ? '#93c5fd' : '#c2410c' }]}>Teacher transition</Text>
              <Text style={[styles.transitionText, { color: theme.colors.textPrimary }]}>{transitionText}</Text>
            </View>
          )}

          <View style={styles.topRow}>
            <View style={[styles.whiteboard, { backgroundColor: isDark ? '#1a1a2e' : '#1e293b' }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderText}>Virtual Whiteboard</Text>
                <TouchableOpacity onPress={() => setShowNotesModal(true)}>
                  <Icon name="document-text-outline" size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              <Text style={styles.whiteboardTitle}>{currentChunk.title}</Text>
              <Text style={styles.whiteboardSummary}>{panelContent.learningObjective || currentChunk.learningObjective || currentChunk.summary}</Text>
              <Text style={styles.sectionLabel}>Whiteboard explanation</Text>
              <Text style={styles.sectionText}>{panelContent.whiteboardExplanation || currentChunk.whiteboardExplanation || currentChunk.whiteboardSuggestion || 'Break the concept into simple teaching notes for the learner.'}</Text>
              <Text style={styles.sectionLabel}>Key terms</Text>
              {(panelContent.keyTerms || currentChunk.keyTerms || []).map((term, index) => (
                <Text key={`${term}-${index}`} style={styles.sectionText}>- {term}</Text>
              ))}
              <Text style={styles.sectionLabel}>Examples</Text>
              {(panelContent.examples || currentChunk.examples || []).map((example, index) => (
                <Text key={`${example}-${index}`} style={styles.sectionText}>- {example}</Text>
              ))}
              {!!(panelContent.analogy || currentChunk.analogyIfHelpful) && (
                <>
                  <Text style={styles.sectionLabel}>Analogy</Text>
                  <Text style={styles.sectionText}>{panelContent.analogy || currentChunk.analogyIfHelpful}</Text>
                </>
              )}
              {!!(panelContent.checkpointQuestion || currentChunk.checkpointQuestion) && (
                <>
                  <Text style={styles.sectionLabel}>Checkpoint</Text>
                  <Text style={styles.sectionText}>{checkpointText}</Text>
                </>
              )}
              {!!reinforcementPoints.length && (
                <>
                  <Text style={styles.sectionLabel}>Reinforcement</Text>
                  {reinforcementPoints.slice(0, 2).map((point, index) => (
                    <Text key={`${point}-${index}`} style={styles.sectionText}>- {point}</Text>
                  ))}
                </>
              )}
              <Text style={styles.sectionLabel}>Slide bullets</Text>
              {(panelContent.slideBullets || currentChunk.slideBullets || []).map((bullet, index) => (
                <Text key={`${bullet}-${index}`} style={styles.sectionText}>- {bullet}</Text>
              ))}
            </View>

            {!isMobile && (
              <View style={[styles.tutorPanel, { backgroundColor: isDark ? '#1a1a2e' : '#f8fafc' }]}>
                <Text style={[styles.tutorLabel, { color: theme.colors.textPrimary }]}>AI Tutor</Text>
                <RNAnimated.View style={[styles.avatarRing, { transform: [{ scale: pulseAnim }] }]}>
                  <View style={styles.avatarInner}>
                    <Text style={styles.avatarText}>AI</Text>
                  </View>
                </RNAnimated.View>
                <Text style={[styles.tutorMeta, { color: theme.colors.textSecondary }]}>{lecture.title}</Text>
                <Text style={[styles.tutorMeta, { color: theme.colors.textSecondary }]}>Section {currentChunk.sectionIndex + 1} | Chunk {currentChunk.chunkIndex + 1}</Text>
              </View>
            )}
          </View>

          <View style={styles.visualRow}>
            <View style={[styles.visualCard, { backgroundColor: isDark ? '#131c31' : '#ffffff', borderColor: theme.colors.border }]}>
              <View style={styles.visualHeader}>
                <Text style={[styles.visualEyebrow, { color: theme.colors.primary }]}>Slide Outline</Text>
                <MaterialIcon name="presentation" size={18} color={theme.colors.primary} />
              </View>
              <Text style={[styles.visualTitle, { color: theme.colors.textPrimary }]}>{currentSlide?.title || currentChunk.title}</Text>
              <Text style={[styles.visualBody, { color: theme.colors.textSecondary }]}>{currentSlide?.notes || panelContent.learningObjective || currentChunk.learningObjective || currentChunk.summary || lecture.summary}</Text>
              {(panelContent.slideBullets || currentChunk.slideBullets || []).map((bullet, index) => (
                <Text key={`${bullet}-${index}`} style={[styles.sectionText, { color: theme.colors.textPrimary }]}>- {bullet}</Text>
              ))}
            </View>
            <View style={[styles.visualCard, { backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: theme.colors.border }]}>
              <View style={styles.visualHeader}>
                <Text style={[styles.visualEyebrow, { color: '#10b981' }]}>Teaching Visual</Text>
                <MaterialIcon name="vector-square" size={18} color="#10b981" />
              </View>
              <Text style={[styles.visualTitle, { color: theme.colors.textPrimary }]}>{currentDelivery?.current_mode_label || 'Structured visual support'}</Text>
              {renderStructuredVisual()}
              <View style={[styles.visualHint, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ecfdf5' }]}>
                <Text style={[styles.visualHintLabel, { color: '#10b981' }]}>Visual hint</Text>
                <Text style={[styles.visualHintText, { color: theme.colors.textPrimary }]}>{panelContent.visualCaption || currentChunk.visualCaption || currentVisual?.caption || currentVisual?.suggestion || 'Use a concise teaching visual instead of dumping raw topic content.'}</Text>
              </View>
            </View>
          </View>

          {(checkpointText || reinforcementPoints.length > 0 || confusionPoints.length > 0) && (
            <View style={styles.teacherCardsRow}>
              {!!checkpointText && (
                <View style={[styles.teacherCard, { backgroundColor: isDark ? '#111827' : '#fffbeb', borderColor: isDark ? '#374151' : '#fde68a' }]}>
                  <Text style={[styles.teacherCardLabel, { color: '#d97706' }]}>Mini checkpoint</Text>
                  <Text style={[styles.teacherCardText, { color: theme.colors.textPrimary }]}>{checkpointText}</Text>
                </View>
              )}
              {!!reinforcementPoints.length && (
                <View style={[styles.teacherCard, { backgroundColor: isDark ? '#0f172a' : '#ecfeff', borderColor: isDark ? '#1e3a8a' : '#a5f3fc' }]}>
                  <Text style={[styles.teacherCardLabel, { color: '#0891b2' }]}>Takeaway</Text>
                  <Text style={[styles.teacherCardText, { color: theme.colors.textPrimary }]}>{reinforcementPoints[0]}</Text>
                </View>
              )}
              {!!confusionPoints.length && (
                <View style={[styles.teacherCard, { backgroundColor: isDark ? '#1f172a' : '#fef2f2', borderColor: isDark ? '#4c1d95' : '#fecaca' }]}>
                  <Text style={[styles.teacherCardLabel, { color: '#dc2626' }]}>Watch for this</Text>
                  <Text style={[styles.teacherCardText, { color: theme.colors.textPrimary }]}>{confusionPoints[0]}</Text>
                </View>
              )}
            </View>
          )}

          <View style={[styles.subtitlesCard, { backgroundColor: isDark ? '#1a1a2e' : '#f1f5f9' }]}>
            <View style={styles.subtitlesHeader}>
              <Text style={[styles.subtitlesTitle, { color: theme.colors.textPrimary }]}>Live Subtitles</Text>
              <Text style={styles.modeBadge}>{teachingStyleLabel.toUpperCase()}</Text>
            </View>
            <Text style={[styles.subtitlesText, { color: theme.colors.textPrimary }]}>{currentNarration}</Text>
          </View>

          {showQuestionPanel && (
            <View style={[styles.qaCard, { backgroundColor: isDark ? '#1a1a2e' : '#fff' }]}>
              <View style={styles.qaHeader}>
                <Text style={[styles.qaTitle, { color: theme.colors.textPrimary }]}>Ask Your Question</Text>
                <TouchableOpacity onPress={() => setShowQuestionPanel(false)}>
                  <Icon name="close" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.chatScroll} contentContainerStyle={styles.chatScrollContent}>
                {!chatMessages.length && !submittingQuestion && (
                  <View style={[styles.chatEmptyState, { borderColor: theme.colors.border }]}>
                    <MaterialIcon name="chat-processing-outline" size={20} color={theme.colors.primary} />
                    <Text style={[styles.chatEmptyTitle, { color: theme.colors.textPrimary }]}>Ask about this lecture point</Text>
                    <Text style={[styles.chatEmptyText, { color: theme.colors.textSecondary }]}>The AI Tutor will answer from the current lecture context and then you can resume from this chunk.</Text>
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
              <View style={[styles.inputRow, { borderColor: theme.colors.border, backgroundColor: isDark ? '#111827' : '#f8fafc' }]}>
                <TouchableOpacity style={[styles.iconButton, { backgroundColor: isRecording ? theme.colors.error : theme.colors.primary }]} onPress={startVoiceInput}>
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
                <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.colors.primary }]} onPress={askQuestion} disabled={submittingQuestion}>
                  {submittingQuestion ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="send" size={18} color="#fff" />}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!showQuestionPanel && (
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.action, { backgroundColor: '#3b82f6' }]} onPress={() => setShowNotesModal(true)}>
                <Icon name="document-text" size={20} color="#fff" />
                <Text style={styles.actionText}>Notes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.action, { backgroundColor: '#a855f7' }]} onPress={() => setShowFlashcardsModal(true)}>
                <MaterialIcon name="cards" size={20} color="#fff" />
                <Text style={styles.actionText}>Flashcards</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.action, { backgroundColor: '#10b981' }]} onPress={openQuiz}>
                <MaterialIcon name="help-circle" size={20} color="#fff" />
                <Text style={styles.actionText}>Quiz</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.action, { backgroundColor: '#f97316' }]} onPress={exportFlashcards}>
                <Icon name="download" size={20} color="#fff" />
                <Text style={styles.actionText}>Materials</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.pauseButton, { backgroundColor: isPlaying ? '#10b981' : '#4f46e5' }]} onPress={togglePause}>
            <Icon name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
            <Text style={styles.pauseText}>{isPlaying ? 'Pause' : 'Resume'}</Text>
          </TouchableOpacity>
          <View style={styles.footerControls}>
            <TouchableOpacity style={[styles.iconButton, styles.footerIcon, { backgroundColor: isDark ? '#2d2d44' : '#e2e8f0' }]} onPress={goToNextChunk} disabled={lectureCompleted}>
              <Icon name="play-skip-forward" size={18} color={lectureCompleted ? theme.colors.textTertiary : theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, styles.footerIcon, { backgroundColor: isDark ? '#2d2d44' : '#e2e8f0' }]} onPress={() => setVoiceMode((prev) => !prev)}>
              <MaterialIcon name={voiceMode ? 'volume-high' : 'volume-off'} size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, styles.footerIcon, { backgroundColor: isDark ? '#2d2d44' : '#e2e8f0' }]}
              onPress={openQuestionPanel}
            >
              <Icon name="chatbubble-outline" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, styles.footerIcon, { backgroundColor: isDark ? '#2d2d44' : '#e2e8f0' }]} onPress={startVoiceInput}>
              <Icon name={isRecording ? 'stop' : 'mic'} size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ConfirmDialog
        visible={showCompleteDialog}
        title="Lecture Complete"
        message="The lecture is finished. Open the quiz to unlock the next topic."
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
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  progressBarWrap: { flex: 1 },
  progressLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  progressBar: { height: 8, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  progressFill: { height: '100%' },
  progressValue: { fontSize: 13, fontWeight: '700' },
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
  whiteboard: { flex: 1, borderRadius: 16, padding: 18 },
  tutorPanel: { width: 190, borderRadius: 16, padding: 16, alignItems: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardHeaderText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  whiteboardTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  whiteboardSummary: { color: '#cbd5e1', fontSize: 14, lineHeight: 22, marginBottom: 12 },
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
  comparisonTable: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  comparisonRow: { padding: 12, borderBottomWidth: 1 },
  comparisonCellTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  comparisonCellBody: { fontSize: 12, lineHeight: 18 },
  nodeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nodeCard: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  nodeLabel: { fontSize: 12, fontWeight: '600' },
  teacherCardsRow: { flexDirection: 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  teacherCard: { flex: 1, minWidth: 210, borderRadius: 16, padding: 14, borderWidth: 1 },
  teacherCardLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  teacherCardText: { fontSize: 13, lineHeight: 20 },
  subtitlesCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  subtitlesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  subtitlesTitle: { fontSize: 14, fontWeight: '700' },
  modeBadge: { color: '#fff', backgroundColor: '#3b82f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, fontSize: 10, fontWeight: '700' },
  subtitlesText: { fontSize: 15, lineHeight: 24 },
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
  actions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  action: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', gap: 6 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  pauseButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 24 },
  pauseText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  footerControls: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  footerIcon: { borderRadius: 12 },
  sidebar: { flex: 1, paddingTop: 8, paddingHorizontal: 8 },
  sidebarTitle: { fontSize: 14, fontWeight: '700', padding: 16 },
  sidebarItem: { borderLeftWidth: 3, borderLeftColor: 'transparent', padding: 12, marginHorizontal: 8, marginBottom: 4, borderRadius: 10 },
  sidebarItemText: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  sidebarItemStatus: { fontSize: 11 },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.72)', padding: 20 },
  modalCard: { borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
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
