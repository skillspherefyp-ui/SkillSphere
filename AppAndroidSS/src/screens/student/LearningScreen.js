import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import MainLayout from '../../components/ui/MainLayout';
import EmptyState from '../../components/ui/EmptyState';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { resolveFileUrl } from '../../utils/urlHelpers';
import { lectureChatAPI } from '../../services/apiClient';

const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      const videoId = parsed.pathname.replace('/', '').trim();
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
  } catch (_) {
    return null;
  }
  return null;
};

const getFileExtension = (url = '') => {
  const sanitized = `${url}`.split('?')[0].split('#')[0];
  const segments = sanitized.split('.');
  return segments.length > 1 ? segments.pop().toLowerCase() : '';
};

const isDirectVideoUrl = (url = '') => ['mp4', 'webm', 'ogg', 'mov', 'm4v'].includes(getFileExtension(url));
const isPdfUrl = (url = '') => getFileExtension(url) === 'pdf';
const isEmbeddableImage = (url = '') => ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(getFileExtension(url));

const LearningScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme, isDark } = useTheme();
  const { courseId, topicId } = route.params || {};
  const { courses, checkEnrollment, fetchCourses } = useData();

  const course = useMemo(() => courses.find((item) => item.id === courseId), [courses, courseId]);
  const topic = useMemo(() => course?.topics?.find((item) => item.id === topicId), [course, topicId]);
  const topicMaterials = topic?.materials || [];
  const isManualMode = course?.creationMode === 'manual';

  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const chatListRef = useRef(null);
  const recognitionRef = useRef(null);

  const selectedMaterial = useMemo(() => {
    if (!topicMaterials.length) return null;
    return topicMaterials.find((item) => item.id === selectedMaterialId) || topicMaterials[0];
  }, [topicMaterials, selectedMaterialId]);

  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      setIsEnrolled(false);
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const enrollment = await checkEnrollment(courseId);
        if (cancelled) return;
        setIsEnrolled(Boolean(enrollment?.success && enrollment?.enrolled));
      } catch (error) {
        if (!cancelled) {
          setIsEnrolled(false);
          Toast.show({ type: 'error', text1: 'Enrollment Error', text2: error.message || 'Unable to verify enrollment.' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    fetchCourses().catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [checkEnrollment, courseId, fetchCourses]);

  useEffect(() => {
    if (!loading && isEnrolled && course && !isManualMode) {
      navigation.replace('AILearning', { courseId, topicId });
    }
  }, [loading, isEnrolled, course, isManualMode, navigation, courseId, topicId]);

  useEffect(() => {
    setSelectedMaterialId(topicMaterials[0]?.id || null);
  }, [topicId, topicMaterials]);

  useEffect(() => {
    setChatMessages([]);
    setChatInput('');
    setShowChatModal(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, [topicId]);

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const openExternalMaterial = async (material) => {
    const url = resolveFileUrl(material?.url || material?.uri || material?.filePath || material?.path || material?.link || '');
    if (!url) {
      Toast.show({ type: 'error', text1: 'Material Missing', text2: 'This material does not have a valid URL.' });
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (_) {
      Toast.show({ type: 'error', text1: 'Open Failed', text2: 'Unable to open this material right now.' });
    }
  };

  const openChat = async () => {
    setShowChatModal(true);
    if (chatMessages.length || chatLoading) return;
    setChatLoading(true);
    try {
      const response = await lectureChatAPI.getHistory(courseId, topicId);
      const history = response?.messages || [];
      if (history.length) {
        setChatMessages(history.map((message) => ({
          id: message.id,
          sender: message.sender,
          content: message.content,
        })));
      } else {
        setChatMessages([
          {
            id: 'manual-intro',
            sender: 'ai',
            content: `Hello Danish. I can help explain "${topic?.title || 'this topic'}" and guide you through the current learning material.`,
          },
        ]);
      }
    } catch (error) {
      setChatMessages([
        {
          id: 'manual-intro-fallback',
          sender: 'ai',
          content: `Hello Danish. I can help explain "${topic?.title || 'this topic'}".`,
        },
      ]);
      Toast.show({ type: 'error', text1: 'Tutor Unavailable', text2: error.message || 'Unable to load AI tutor history right now.' });
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendChatMessage = async (overrideText = '') => {
    const text = `${overrideText || chatInput}`.trim();
    if (!text || chatSending) return;
    const tempId = `temp-${Date.now()}`;
    setChatInput('');
    setChatSending(true);
    setChatMessages((prev) => [...prev, { id: tempId, sender: 'user', content: text }]);

    try {
      const response = await lectureChatAPI.sendMessage(courseId, topicId, text);
      setChatMessages((prev) => [
        ...prev.filter((message) => message.id !== tempId),
        {
          id: response?.userMessage?.id || `${tempId}-user`,
          sender: 'user',
          content: response?.userMessage?.content || text,
        },
        {
          id: response?.aiMessage?.id || `${tempId}-reply`,
          sender: 'ai',
          content: response?.aiMessage?.content || 'I am here to help with this topic.',
        },
      ]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev.filter((message) => message.id !== tempId),
        { id: `${tempId}-user`, sender: 'user', content: text },
        {
          id: `${tempId}-reply-error`,
          sender: 'ai',
          content: error.message || 'I am having trouble answering right now. Please try again in a moment.',
        },
      ]);
      Toast.show({ type: 'error', text1: 'Tutor Error', text2: error.message || 'Unable to send your message right now.' });
    } finally {
      setChatSending(false);
      setTimeout(() => chatListRef.current?.scrollToEnd?.({ animated: true }), 80);
    }
  };

  const startVoiceInput = async () => {
    if (Platform.OS !== 'web') {
      Toast.show({ type: 'info', text1: 'Voice Input', text2: 'Voice input is currently available on web browsers.' });
      return;
    }

    await openChat();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      Toast.show({ type: 'error', text1: 'Voice Unsupported', text2: 'This browser does not support microphone speech recognition.' });
      return;
    }

    if (isRecording) {
      stopVoiceInput();
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const value = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalTranscript += `${value} `;
        } else {
          interim += value;
        }
      }
      setChatInput(`${finalTranscript}${interim}`.trim());
    };

    recognition.onerror = (event) => {
      setIsRecording(false);
      recognitionRef.current = null;
      if (event.error !== 'aborted') {
        Toast.show({
          type: 'error',
          text1: 'Microphone Error',
          text2: event.error === 'not-allowed' ? 'Please allow microphone access for voice questions.' : 'Voice input could not be captured.',
        });
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
      const transcript = finalTranscript.trim();
      if (transcript) {
        setChatInput(transcript);
        setTimeout(() => {
          handleSendChatMessage(transcript);
        }, 80);
      }
    };

    recognition.start();
  };

  const renderMaterialViewer = () => {
    if (!selectedMaterial) {
      return (
        <View style={styles.viewerEmpty}>
          <Icon name="folder-open-outline" size={42} color={theme.colors.textTertiary} />
          <Text style={[styles.viewerEmptyText, { color: theme.colors.textSecondary }]}>No materials available for this topic yet.</Text>
        </View>
      );
    }

    const materialType = `${selectedMaterial.type || ''}`.toLowerCase();
    const resolvedUri = resolveFileUrl(
      selectedMaterial.url || selectedMaterial.uri || selectedMaterial.filePath || selectedMaterial.path || selectedMaterial.link || ''
    );

    const youtubeEmbedUrl = selectedMaterial?.isYoutube ? getYouTubeEmbedUrl(resolvedUri) : getYouTubeEmbedUrl(resolvedUri);
    const isVideo = materialType === 'video' || selectedMaterial?.isYoutube || isDirectVideoUrl(resolvedUri);
    const isPdf = materialType === 'pdf' || isPdfUrl(resolvedUri);
    const isImage = materialType === 'image' || isEmbeddableImage(resolvedUri);

    if (isImage && resolvedUri) {
      return <Image source={{ uri: resolvedUri }} style={styles.materialImage} resizeMode="contain" />;
    }

    if (Platform.OS === 'web' && youtubeEmbedUrl) {
      return (
        <View style={styles.embeddedViewer}>
          <iframe
            title={selectedMaterial.title || topic?.title || 'Video material'}
            src={youtubeEmbedUrl}
            style={styles.webFrame}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </View>
      );
    }

    if (Platform.OS === 'web' && isVideo && resolvedUri) {
      return (
        <View style={styles.embeddedViewer}>
          <video
            controls
            preload="metadata"
            src={resolvedUri}
            style={styles.webFrame}
          />
        </View>
      );
    }

    if (Platform.OS === 'web' && isPdf && resolvedUri) {
      return (
        <View style={styles.embeddedViewer}>
          <iframe
            title={selectedMaterial.title || topic?.title || 'PDF material'}
            src={resolvedUri}
            style={styles.webFrame}
          />
        </View>
      );
    }

    return (
      <View style={styles.materialFallback}>
        <MaterialIcon name="file-document-outline" size={52} color={theme.colors.primary} />
        <Text style={[styles.materialFallbackTitle, { color: theme.colors.textPrimary }]}>
          {selectedMaterial.title || selectedMaterial.fileName || topic?.title || 'Topic Material'}
        </Text>
        <Text style={[styles.materialFallbackText, { color: theme.colors.textSecondary }]}>
          This material cannot be embedded here yet. Open it directly for full viewing.
        </Text>
        <TouchableOpacity
          style={[styles.openButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => openExternalMaterial(selectedMaterial)}
        >
          <Icon name="open-outline" size={16} color="#fff" />
          <Text style={styles.openButtonText}>Open Material</Text>
        </TouchableOpacity>
      </View>
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
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading learning workspace...</Text>
        </View>
      </MainLayout>
    );
  }

  if (!isEnrolled) {
    return (
      <MainLayout showSidebar={false} showHeader={false}>
        <View style={styles.centered}>
          <EmptyState icon="lock-closed-outline" title="Not Enrolled" subtitle="You need to enroll in this course to access this topic." />
        </View>
      </MainLayout>
    );
  }

  if (!isManualMode) {
    return (
      <MainLayout showSidebar={false} showHeader={false}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Opening the AI lecture classroom...</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout showSidebar={false} showHeader={false}>
      <View style={[styles.screen, { backgroundColor: isDark ? '#08111d' : '#eef4fb' }]}>
        <View style={[styles.topBar, { backgroundColor: isDark ? 'rgba(8,17,29,0.92)' : 'rgba(255,255,255,0.92)', borderColor: theme.colors.border }]}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: isDark ? '#0f1a2a' : '#ffffff', borderColor: theme.colors.border }]} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={18} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.topCopy}>
            <Text style={[styles.courseText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{course.title}</Text>
            <Text style={[styles.topicText, { color: theme.colors.textPrimary }]} numberOfLines={1}>{topic.title}</Text>
          </View>
          <TouchableOpacity style={[styles.iconActionButton, { backgroundColor: isRecording ? theme.colors.error : (isDark ? '#0f1a2a' : '#ffffff'), borderColor: theme.colors.border }]} onPress={startVoiceInput}>
            <Icon name={isRecording ? 'stop' : 'mic-outline'} size={18} color={isRecording ? '#fff' : theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.primary }]} onPress={openChat}>
            <Icon name="chatbubble-ellipses-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>AI Tutor</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.materialShell, { backgroundColor: isDark ? 'rgba(8,17,29,0.92)' : 'rgba(255,255,255,0.92)', borderColor: theme.colors.border }]}>
          {topicMaterials.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.materialTabs} contentContainerStyle={styles.materialTabsContent}>
              {topicMaterials.map((material, index) => {
                const active = (material.id || index) === (selectedMaterial?.id || 0);
                return (
                  <TouchableOpacity
                    key={material.id || index}
                    style={[styles.materialTab, { backgroundColor: active ? theme.colors.primary : (isDark ? '#132033' : '#f8fafc') }]}
                    onPress={() => setSelectedMaterialId(material.id || null)}
                  >
                    <Text style={[styles.materialTabText, { color: active ? '#fff' : theme.colors.textPrimary }]} numberOfLines={1}>
                      {material.title || material.fileName || `Material ${index + 1}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.viewerWrap}>
            {renderMaterialViewer()}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.quizButton, { backgroundColor: '#10b981' }]}
            onPress={() => navigation.navigate('Quiz', { courseId, topicId, topics: course?.topics || [] })}
          >
            <MaterialIcon name="help-circle-outline" size={18} color="#fff" />
            <Text style={styles.quizButtonText}>Take Quiz</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showChatModal} animationType="fade" transparent onRequestClose={() => setShowChatModal(false)}>
        <TouchableOpacity style={chatStyles.backdrop} activeOpacity={1} onPress={() => { stopVoiceInput(); setShowChatModal(false); }} />
        <View style={chatStyles.centerWrap} pointerEvents="box-none">
          <View style={[chatStyles.modalCard, { backgroundColor: isDark ? '#101827' : '#ffffff', borderColor: theme.colors.border }]}>
            <View style={[chatStyles.header, { borderBottomColor: theme.colors.border }]}>
              <View>
                <Text style={[chatStyles.headerTitle, { color: theme.colors.textPrimary }]}>AI Tutor</Text>
                <Text style={[chatStyles.headerSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>{topic.title}</Text>
              </View>
              <TouchableOpacity onPress={() => { stopVoiceInput(); setShowChatModal(false); }}>
                <Icon name="close" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {chatLoading ? (
              <View style={chatStyles.loadingState}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[chatStyles.loadingText, { color: theme.colors.textSecondary }]}>Loading conversation...</Text>
              </View>
            ) : (
              <FlatList
                ref={chatListRef}
                data={chatMessages}
                keyExtractor={(item, index) => `${item.id || item.createdAt || index}`}
                contentContainerStyle={chatStyles.listContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => chatListRef.current?.scrollToEnd?.({ animated: true })}
                ListEmptyComponent={
                  <View style={chatStyles.emptyState}>
                    <MaterialIcon name="chat-processing-outline" size={24} color={theme.colors.primary} />
                    <Text style={[chatStyles.emptyTitle, { color: theme.colors.textPrimary }]}>Ask about this topic</Text>
                    <Text style={[chatStyles.emptyText, { color: theme.colors.textSecondary }]}>The tutor can explain the current learning material and answer follow-up questions.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={[chatStyles.bubble, item.sender === 'user' ? chatStyles.userBubble : [chatStyles.aiBubble, { borderColor: theme.colors.border }]]}>
                    <Text style={[item.sender === 'user' ? chatStyles.userBubbleText : [chatStyles.aiBubbleText, { color: theme.colors.textPrimary }]]}>
                      {item.content}
                    </Text>
                  </View>
                )}
              />
            )}

            <View style={[chatStyles.inputRow, { borderTopColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[chatStyles.micButton, { backgroundColor: isRecording ? theme.colors.error : theme.colors.primary }]}
                onPress={startVoiceInput}
              >
                <Icon name={isRecording ? 'stop' : 'mic-outline'} size={16} color="#fff" />
              </TouchableOpacity>
              <TextInput
                style={[chatStyles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#172332' : '#f8fafc' }]}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ask about this topic..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[chatStyles.sendButton, { backgroundColor: chatInput.trim() && !chatSending ? theme.colors.primary : theme.colors.border }]}
                onPress={handleSendChatMessage}
                disabled={!chatInput.trim() || chatSending}
              >
                {chatSending ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="send" size={16} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16 },
  topBar: { borderWidth: 1, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topCopy: { flex: 1, minWidth: 0 },
  courseText: { fontSize: 12, marginBottom: 3 },
  topicText: { fontSize: 18, fontWeight: '800' },
  iconActionButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionButton: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  materialShell: { flex: 1, borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  materialTabs: { maxHeight: 56, borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.18)' },
  materialTabsContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
  materialTab: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, maxWidth: 220 },
  materialTabText: { fontSize: 13, fontWeight: '700' },
  viewerWrap: { flex: 1, padding: 18 },
  viewerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  viewerEmptyText: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  materialFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  materialFallbackTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  materialFallbackText: { fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 420 },
  embeddedViewer: { flex: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: '#020617' },
  webFrame: { width: '100%', height: '100%', borderWidth: 0, backgroundColor: '#020617' },
  openButton: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  openButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  materialImage: { flex: 1, width: '100%' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end' },
  quizButton: { borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  quizButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});

const chatStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 6, 23, 0.6)' },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: 380, maxWidth: '100%', height: 560, borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13 },
  listContent: { padding: 14, gap: 10, flexGrow: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 240 },
  bubble: { padding: 12, borderRadius: 16, maxWidth: '92%', marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#4f46e5' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#f8fafc', borderWidth: 1 },
  userBubbleText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  aiBubbleText: { fontSize: 14, lineHeight: 20 },
  inputRow: { borderTopWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  micButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 46, maxHeight: 120, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  sendButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});

export default LearningScreen;
