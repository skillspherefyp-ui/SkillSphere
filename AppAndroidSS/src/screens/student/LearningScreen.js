import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  TextInput,
  Image,
  Linking,
  Animated as RNAnimated,
  PanResponder,
  Modal,
  FlatList,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import MainLayout from '../../components/ui/MainLayout';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import MarkdownText from '../../components/ui/MarkdownText';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { lectureChatAPI } from '../../services/apiClient';
import { resolveFileUrl } from '../../utils/urlHelpers';

const LearningScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();

  const sidebarItems = [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Browse Courses', icon: 'library-outline', iconActive: 'library', route: 'Courses' },
    { label: 'My Learning', icon: 'school-outline', iconActive: 'school', route: 'EnrolledCourses' },
    { label: 'AI Assistant', icon: 'sparkles-outline', iconActive: 'sparkles', route: 'AITutor' },
    { label: 'Certificates', icon: 'ribbon-outline', iconActive: 'ribbon', route: 'Certificates' },
    { label: 'Reminders', icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle', route: 'Todo' },
  ];
  const handleNavigate = (routeName) => navigation.navigate(routeName);
  const { width: windowWidth } = useWindowDimensions();
  const { courseId, topicId } = route.params;
  const { courses, checkEnrollment, fetchCourses, enrollments, fetchMyEnrollments, updateTopicProgress } = useData();
  const course = courses.find(c => c.id === courseId);
  const topic = course?.topics?.find(t => t.id === topicId);

  const isManualMode = course?.creationMode === 'manual';
  const topicMaterials = topic?.materials || [];

  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const chatListRef = useRef(null);

  // Draggable chat popup position
  const chatPosition = useRef(new RNAnimated.ValueXY({ x: 0, y: 0 })).current;
  const chatPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        chatPosition.setOffset({ x: chatPosition.x._value, y: chatPosition.y._value });
        chatPosition.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: RNAnimated.event(
        [null, { dx: chatPosition.x, dy: chatPosition.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        chatPosition.flattenOffset();
      },
    })
  ).current;

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showTopicsSidebar, setShowTopicsSidebar] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(true);
  const [currentSubtitle, setCurrentSubtitle] = useState("Welcome to today's lesson on Machine Learning fundamentals.");
  // Real enrollment progress
  const enrollmentProgress = (() => {
    const e = enrollments.find(en => String(en.courseId) === String(courseId) || String(en.course?.id) === String(courseId));
    return Math.round(e?.progress ?? 0);
  })();

  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const autoNavDone = useRef(false);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = windowWidth >= 1024;
  const isMobile = windowWidth < 768;

  // Pulse animation for AI avatar
  useEffect(() => {
    if (aiSpeaking) {
      const pulse = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          RNAnimated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [aiSpeaking]);

  useEffect(() => {
    checkEnrollmentStatus();
    fetchCourses(); // refresh so topic completion state is current
  }, [courseId]);

  // Auto-navigate to first non-completed topic — skip if user is revisiting a completed one
  useEffect(() => {
    if (autoNavDone.current || !course?.topics?.length) return;
    autoNavDone.current = true;
    const currentTopic = course.topics.find(t => String(t.id) === String(topicId));
    // User intentionally opened a completed topic — don't redirect
    if (currentTopic?.completed) return;
    const sorted = [...course.topics].sort((a, b) => a.order - b.order);
    const firstNonCompleted = sorted.find(t => !t.completed) || sorted[0];
    if (String(firstNonCompleted.id) !== String(topicId)) {
      navigation.replace('Learning', { courseId, topicId: firstNonCompleted.id, topics: course.topics });
    }
  }, [course?.topics]);

  // Redirect AI courses to the real AI lecture screen once enrollment is confirmed
  useEffect(() => {
    if (!enrollmentLoading && isEnrolled && course && !isManualMode) {
      navigation.replace('AILearning', { courseId, topicId });
    }
  }, [enrollmentLoading, isEnrolled, isManualMode, course]);

  useEffect(() => {
    if (isManualMode && topicMaterials.length > 0) {
      setSelectedMaterial(topicMaterials[0]);
    } else {
      setSelectedMaterial(null);
    }
  }, [topicId, isManualMode]);

  const checkEnrollmentStatus = async () => {
    setEnrollmentLoading(true);
    const result = await checkEnrollment(courseId);
    if (result.success) {
      setIsEnrolled(result.enrolled);
      if (!result.enrolled) {
        Toast.show({
          type: 'error',
          text1: 'Not Enrolled',
          text2: 'You need to enroll in this course first!',
        });
        navigation.navigate('CourseDetail', { courseId });
      }
    }
    setEnrollmentLoading(false);
  };

  // Topic item for course progress sidebar
  const TopicItem = ({ item, index }) => {
    const isCompleted = item.completed;
    const isCurrent = String(item.id) === String(topicId);
    const isLocked = item.status === 'locked' && !item.completed;
    const topicProgress = isCurrent ? enrollmentProgress : 0;

    return (
      <TouchableOpacity
        style={[
          styles.topicItem,
          isCurrent && styles.topicItemCurrent,
          { backgroundColor: isCurrent ? 'rgba(79, 70, 229, 0.1)' : 'transparent' }
        ]}
        onPress={() => {
          if (!isLocked) {
            setShowTopicsSidebar(false);
            navigation.replace('Learning', { courseId, topicId: item.id });
          }
        }}
        disabled={isLocked}
      >
        <View style={styles.topicIcon}>
          {isCompleted ? (
            <View style={[styles.topicStatusIcon, { backgroundColor: '#10B981' }]}>
              <Icon name="checkmark" size={14} color="#fff" />
            </View>
          ) : isCurrent ? (
            <View style={[styles.topicStatusIcon, { backgroundColor: theme.colors.primary }]}>
              <Icon name="play" size={12} color="#fff" />
            </View>
          ) : (
            <View style={[styles.topicStatusIcon, { backgroundColor: '#6B7280' }]}>
              <Icon name="lock-closed" size={12} color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.topicInfo}>
          <Text style={[styles.topicTitle, { color: isLocked ? theme.colors.textTertiary : theme.colors.textPrimary }]}>
            {item.title}
          </Text>
          <View style={styles.topicMeta}>
            <Text style={[styles.topicDuration, { color: theme.colors.textTertiary }]}>
              {item.duration || '15 min'}
            </Text>
            {isCompleted && (
              <Text style={[styles.topicStatus, { color: '#10B981' }]}>Completed</Text>
            )}
            {isCurrent && (
              <Text style={[styles.topicStatus, { color: theme.colors.primary }]}>{topicProgress}%</Text>
            )}
            {isLocked && (
              <Text style={[styles.topicStatus, { color: theme.colors.textTertiary }]}>Locked</Text>
            )}
          </View>
          {isCurrent && (
            <View style={styles.topicProgressBar}>
              <View style={[styles.topicProgressFill, { width: `${topicProgress}%`, backgroundColor: theme.colors.primary }]} />
            </View>
          )}
        </View>
        <Icon name="chevron-forward" size={20} color={theme.colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  // Topics Sidebar Content
  const renderTopicsSidebar = () => (
    <View style={styles.topicsSidebarContent}>
      <View style={styles.sidebarHeader}>
        <View style={styles.sidebarHeaderIcon}>
          <MaterialIcon name="book-open-variant" size={20} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sidebarTitle, { color: theme.colors.textPrimary }]}>Course Progress</Text>
          <Text style={[styles.sidebarSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>{course?.name}</Text>
        </View>
        {!isLargeScreen && (
          <TouchableOpacity onPress={() => setShowTopicsSidebar(false)} style={styles.closeSidebar}>
            <Icon name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.sidebarProgress}>
        <Text style={[styles.sidebarProgressText, { color: theme.colors.textSecondary }]}>
          {course?.topics?.filter(t => t.completed).length || 0} of {course?.topics?.length || 0} topics
        </Text>
        <Text style={[styles.sidebarProgressPercent, { color: theme.colors.primary }]}>
          {Math.round(((course?.topics?.filter(t => t.completed).length || 0) / (course?.topics?.length || 1)) * 100)}%
        </Text>
      </View>
      <View style={[styles.sidebarProgressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border }]}>
        <View
          style={[
            styles.sidebarProgressFill,
            {
              width: `${((course?.topics?.filter(t => t.completed).length || 0) / (course?.topics?.length || 1)) * 100}%`,
              backgroundColor: theme.colors.primary
            }
          ]}
        />
      </View>

      <ScrollView style={styles.topicsList} showsVerticalScrollIndicator={false}>
        {course?.topics?.map((item, index) => (
          <TopicItem key={item.id} item={item} index={index} />
        ))}
      </ScrollView>
    </View>
  );

  if (!course || !topic) {
    return (
      <MainLayout
        showSidebar={false}
        showHeader={true}
        showBack={true}
      >
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="alert-circle-outline"
            title="Topic not found"
            subtitle="The topic you're looking for doesn't exist"
          />
        </View>
      </MainLayout>
    );
  }

  if (enrollmentLoading) {
    return (
      <MainLayout
        showSidebar={false}
        showHeader={true}
        showBack={true}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Checking enrollment...
          </Text>
        </View>
      </MainLayout>
    );
  }

  if (!isEnrolled) {
    return (
      <MainLayout
        showSidebar={false}
        showHeader={true}
        showBack={true}
      >
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="lock-closed-outline"
            title="Not Enrolled"
            subtitle="You need to enroll in this course to access lectures"
          />
        </View>
      </MainLayout>
    );
  }

  const openChat = async () => {
    setShowChatModal(true);
    if (chatMessages.length === 0) {
      setChatLoading(true);
      try {
        const res = await lectureChatAPI.getHistory(courseId, topicId);
        if (res.success) {
          setChatMessages(res.messages || []);
        }
      } catch (e) {
        // start fresh if history load fails
      } finally {
        setChatLoading(false);
      }
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || chatSending) return;
    const text = chatInput.trim();
    setChatInput('');
    setChatSending(true);

    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    setChatMessages(prev => [...prev, { id: tempId, sender: 'user', content: text, createdAt: new Date().toISOString() }]);

    try {
      const res = await lectureChatAPI.sendMessage(courseId, topicId, text);
      if (res.success) {
        setChatMessages(prev => [
          ...prev.filter(m => m.id !== tempId),
          res.userMessage,
          res.aiMessage,
        ]);
      }
    } catch (e) {
      setChatMessages(prev => prev.filter(m => m.id !== tempId));
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to send message' });
    } finally {
      setChatSending(false);
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handlePauseAsk = () => {
    setIsPlaying(!isPlaying);
    if (isPlaying) {
      setAiSpeaking(false);
      openChat();
    } else {
      setAiSpeaking(true);
    }
  };

  const handleCompleteTopic = () => {
    setShowCompleteDialog(true);
  };

  const confirmCompleteTopic = async () => {
    setShowCompleteDialog(false);
    const result = await updateTopicProgress({
      courseId,
      topicId,
      completed: true,
    });

    if (!result.success) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: result.error || 'Failed to update topic progress',
      });
      return;
    }

    await Promise.all([fetchCourses(), fetchMyEnrollments()]);

    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Topic completed!',
    });

    setTimeout(() => navigation.goBack(), 1200);
  };

  // ─── Manual-mode helpers ──────────────────────────────────────────────────

  const getYouTubeEmbedUrl = (url) => {
    const watchMatch = url.match(/[?&]v=([^&]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=0&rel=0`;
    const shortMatch = url.match(/youtu\.be\/([^?]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}?autoplay=0&rel=0`;
    return url;
  };

  const isYouTubeUrl = (url = '') =>
    url.includes('youtube.com') || url.includes('youtu.be');

  const isGoogleUrl = (url = '') =>
    url.includes('drive.google.com') || url.includes('docs.google.com');

  const getGoogleEmbedUrl = (url) => {
    // drive.google.com/file/d/ID/view → .../preview
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
    if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
    // docs/sheets/slides: replace /edit or /view with /preview
    if (url.includes('docs.google.com')) {
      return url.replace(/\/(edit|view|pub)(\?.*)?$/, '/preview');
    }
    return url;
  };

  const getLinkMeta = (url = '') => {
    if (isYouTubeUrl(url))                           return { label: 'YouTube',      icon: 'logo-youtube',  color: '#FF0000' };
    if (url.includes('drive.google.com'))             return { label: 'Google Drive', icon: 'logo-google',   color: '#4285F4' };
    if (url.includes('docs.google.com/spreadsheets')) return { label: 'Google Sheets',icon: 'logo-google',   color: '#0F9D58' };
    if (url.includes('docs.google.com/presentation'))return { label: 'Google Slides',icon: 'logo-google',   color: '#F4B400' };
    if (url.includes('docs.google.com'))              return { label: 'Google Docs',  icon: 'logo-google',   color: '#4285F4' };
    if (url.includes('vimeo.com'))                    return { label: 'Vimeo',         icon: 'videocam',      color: '#1AB7EA' };
    if (url.includes('github.com'))                   return { label: 'GitHub',        icon: 'logo-github',   color: '#24292e' };
    if (url.includes('figma.com'))                    return { label: 'Figma',         icon: 'color-palette', color: '#F24E1E' };
    return { label: 'Link', icon: 'link', color: '#6366f1' };
  };

  const getEmbedUrl = (url) => {
    if (isYouTubeUrl(url)) return getYouTubeEmbedUrl(url);
    if (isGoogleUrl(url))  return getGoogleEmbedUrl(url);
    return url;
  };

  const openMaterial = (material) => {
    const url = resolveFileUrl(material.uri);
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => {});
    }
  };

  const getMaterialIcon = (type) => {
    if (type === 'pdf') return 'document-text';
    if (type === 'image') return 'image';
    if (type === 'link') return 'link';
    return 'document';
  };

  const getMaterialColor = (type) =>
    type === 'link' ? '#6366f1' : theme.colors.primary;

  const renderMaterialViewer = (material) => {
    if (!material) {
      return (
        <View style={styles.viewerEmpty}>
          <Icon name="folder-open-outline" size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.viewerEmptyText}>No materials added to this topic yet</Text>
        </View>
      );
    }

    const resolvedUri = resolveFileUrl(material.uri);
    const isYT = material.isYoutube || isYouTubeUrl(material.uri);

    if (material.type === 'link') {
      const meta = getLinkMeta(material.uri);
      const embedUrl = getEmbedUrl(material.uri);

      if (Platform.OS === 'web') {
        return (
          <View style={styles.embeddedLinkWrapper}>
            <View style={styles.iframeWrapper}>
              <iframe
                src={embedUrl}
                title={material.title || meta.label}
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </View>
            <TouchableOpacity
              style={[styles.openExternalBtn, { borderColor: meta.color + '50' }]}
              onPress={() => openMaterial(material)}
              activeOpacity={0.75}
            >
              <Icon name={meta.icon} size={15} color={meta.color} />
              <Text style={[styles.openExternalText, { color: meta.color }]}>
                Open in {meta.label}
              </Text>
              <Icon name="open-outline" size={14} color={meta.color} />
            </TouchableOpacity>
          </View>
        );
      }

      // Mobile fallback
      return (
        <View style={styles.videoFallback}>
          <Icon name={meta.icon} size={72} color={meta.color} />
          <Text style={styles.videoFallbackTitle}>{material.title || meta.label}</Text>
          <TouchableOpacity
            style={[styles.linkViewerBtn, { backgroundColor: meta.color }]}
            onPress={() => openMaterial(material)}
          >
            <Icon name="open-outline" size={20} color="#fff" />
            <Text style={styles.linkViewerBtnText}>Open in {meta.label}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (material.type === 'pdf') {
      return Platform.OS === 'web' ? (
        <View style={styles.iframeWrapper}>
          <iframe
            src={resolvedUri}
            title={material.title || 'PDF'}
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
          />
        </View>
      ) : (
        <TouchableOpacity style={styles.videoFallback} onPress={() => openMaterial(material)}>
          <Icon name="document-text" size={72} color="#e74c3c" />
          <Text style={styles.videoFallbackTitle}>{material.title || material.fileName || 'PDF Document'}</Text>
          <Text style={styles.videoFallbackSub}>Tap to open PDF</Text>
        </TouchableOpacity>
      );
    }

    if (material.type === 'image') {
      return (
        <Image
          source={{ uri: resolvedUri }}
          style={styles.materialImage}
          resizeMode="contain"
        />
      );
    }

    // Fallback for any other type
    return (
      <TouchableOpacity style={styles.videoFallback} onPress={() => openMaterial(material)}>
        <Icon name="document" size={72} color={theme.colors.primary} />
        <Text style={styles.videoFallbackTitle}>{material.title || material.fileName || 'Open Material'}</Text>
        <Text style={styles.videoFallbackSub}>Tap to open</Text>
      </TouchableOpacity>
    );
  };

  // ─── AI-mode data ─────────────────────────────────────────────────────────

  // Key concepts data
  const keyConcepts = [
    'Neurons process info',
    'Connection weights',
    'Activation functions'
  ];

  return (
    <MainLayout
      showSidebar={true}
      sidebarItems={sidebarItems}
      activeRoute="EnrolledCourses"
      onNavigate={handleNavigate}
      showHeader={true}
      customSidebar={renderTopicsSidebar()}
      customSidebarVisible={showTopicsSidebar}
      onCustomSidebarToggle={setShowTopicsSidebar}
      customMenuIcon="book-open-variant"
      hideHeaderToggle={true}
    >
      <View style={[styles.mainContent, { backgroundColor: isDark ? '#0f0f1a' : theme.colors.background }]}>
        {/* Main Learning Area */}
        <View style={styles.learningArea}>
          {/* Progress Bar with Sidebar Toggle */}
          <View style={styles.progressSection}>
            <TouchableOpacity
              style={[
                styles.backButton,
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
                <View style={[styles.progressFillGreen, { width: `${enrollmentProgress * 0.7}%` }]} />
                <View style={[styles.progressFillPurple, { width: `${enrollmentProgress * 0.3}%`, left: `${enrollmentProgress * 0.7}%` }]} />
              </View>
            </View>
            <Text style={[styles.progressPercent, { color: theme.colors.primary }]}>{enrollmentProgress}%</Text>
          </View>

          {isManualMode ? (
            /* ── Manual Mode: fills all available height, no ScrollView ─── */
            <View style={styles.manualFlexArea}>
              {/* Material viewer card */}
              <View style={[styles.manualContentArea, { flex: 1 }]}>
                {/* Header bar */}
                <View style={[styles.manualHeader, { backgroundColor: isDark ? '#1a1a2e' : '#1e293b' }]}>
                  <Icon name={getMaterialIcon(selectedMaterial?.type)} size={16}
                    color={getMaterialColor(selectedMaterial?.type)} />
                  <Text style={styles.manualHeaderTitle} numberOfLines={1}>
                    {selectedMaterial?.title || selectedMaterial?.fileName || topic?.title || 'Topic Materials'}
                  </Text>
                  {selectedMaterial?.type === 'link' && (
                    <TouchableOpacity style={styles.manualOpenBtn} onPress={() => openMaterial(selectedMaterial)}>
                      <Icon name="open-outline" size={14} color="#fff" />
                      <Text style={styles.manualOpenBtnText}>Open</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Material tabs (shown when >1 material) */}
                {topicMaterials.length > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={[styles.materialTabsBar, { backgroundColor: isDark ? '#12122a' : '#0f172a' }]}
                    contentContainerStyle={styles.materialTabsContent}
                  >
                    {topicMaterials.map((mat, idx) => {
                      const isActive = selectedMaterial?.id === mat.id
                        || (!selectedMaterial && idx === 0);
                      return (
                        <TouchableOpacity
                          key={mat.id || idx}
                          style={[
                            styles.materialTab,
                            isActive && { backgroundColor: theme.colors.primary },
                          ]}
                          onPress={() => setSelectedMaterial(mat)}
                        >
                          <Icon
                            name={getMaterialIcon(mat.type)}
                            size={13}
                            color={isActive ? '#fff' : '#9ca3af'}
                          />
                          <Text style={[styles.materialTabText, { color: isActive ? '#fff' : '#9ca3af' }]}
                            numberOfLines={1}>
                            {mat.title || mat.fileName || `Material ${idx + 1}`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Viewer — flex:1 so it fills all remaining height */}
                <View style={[styles.materialViewerBox, { backgroundColor: isDark ? '#1a1a2e' : '#1e293b', flex: 1 }]}>
                  {topicMaterials.length === 0 ? (
                    <View style={styles.viewerEmpty}>
                      <Icon name="folder-open-outline" size={48} color="rgba(255,255,255,0.25)" />
                      <Text style={styles.viewerEmptyText}>No materials added to this topic yet</Text>
                    </View>
                  ) : (
                    renderMaterialViewer(selectedMaterial || topicMaterials[0])
                  )}
                </View>
              </View>

            </View>
          ) : (
            /* ── AI Mode ─────── */
            <View style={styles.aiFlexArea}>
              <View style={[styles.manualContentArea, { flex: 1, backgroundColor: isDark ? '#1a1a2e' : '#1e293b' }]}>

                {/* Header — presentation icon + title + Live badge + Pause/Resume button */}
                <View style={[styles.manualHeader, { backgroundColor: isDark ? '#12122a' : '#0f172a' }]}>
                  <MaterialIcon name="presentation" size={16} color="#fff" />
                  <Text style={styles.manualHeaderTitle} numberOfLines={1}>Virtual Whiteboard</Text>
                  {aiSpeaking && (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveBadgeText}>Live</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.manualOpenBtn, { marginLeft: 4 }]}
                    onPress={() => { setIsPlaying(p => !p); setAiSpeaking(s => !s); }}
                  >
                    <Icon name={isPlaying ? 'pause' : 'play'} size={13} color="#fff" />
                    <Text style={styles.manualOpenBtnText}>{isPlaying ? 'Pause' : 'Resume'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Scrollable whiteboard + subtitles content inside card */}
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>

                  {/* Compact AI Tutor status bar — horizontal, above diagram */}
                  <View style={styles.aiStatusBar}>
                    <RNAnimated.View style={[styles.aiStatusAvatar, { transform: [{ scale: pulseAnim }], opacity: aiSpeaking ? 1 : 0.5 }]}>
                      <MaterialIcon name="robot" size={20} color="#fff" />
                    </RNAnimated.View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aiStatusName}>AI Tutor</Text>
                      <Text style={styles.aiStatusSub} numberOfLines={1}>{currentSubtitle}</Text>
                    </View>
                    {aiSpeaking ? (
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

                    {/* Whiteboard diagram */}
                    <View style={styles.whiteboardContent}>
                      <Text style={styles.diagramTitle}>Neural Network Architecture</Text>
                      <View style={styles.neuralNetwork}>
                        <View style={styles.nnLayer}>
                          {['I1', 'I2', 'I3', 'I4'].map((node) => (
                            <View key={node} style={[styles.nnNode, styles.nnNodeInput]}>
                              <Text style={styles.nnNodeText}>{node}</Text>
                            </View>
                          ))}
                          <Text style={styles.nnLayerLabel}>Input</Text>
                        </View>
                        <View style={styles.nnLayer}>
                          {['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].map((node) => (
                            <View key={node} style={[styles.nnNode, styles.nnNodeHidden]}>
                              <Text style={styles.nnNodeText}>{node}</Text>
                            </View>
                          ))}
                          <Text style={styles.nnLayerLabel}>Hidden</Text>
                        </View>
                        <View style={styles.nnLayer}>
                          {['O1', 'O2', 'O3'].map((node) => (
                            <View key={node} style={[styles.nnNode, styles.nnNodeOutput]}>
                              <Text style={styles.nnNodeText}>{node}</Text>
                            </View>
                          ))}
                          <Text style={styles.nnLayerLabel}>Output</Text>
                        </View>
                      </View>
                      <View style={styles.keyConcepts}>
                        <Text style={styles.keyConceptsTitle}>Key Concepts:</Text>
                        <View style={styles.keyConceptsList}>
                          {keyConcepts.map((concept, i) => (
                            <View key={i} style={styles.keyConceptItem}>
                              <View style={[styles.keyConceptDot, { backgroundColor: i === 0 ? '#3b82f6' : i === 1 ? '#8b5cf6' : '#10b981' }]} />
                              <Text style={styles.keyConceptText}>{concept}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>

                    {/* Live Subtitles */}
                    <View style={[styles.subtitlesSection, { backgroundColor: 'rgba(0,0,0,0.25)', margin: 12, marginTop: 8 }]}>
                      <View style={styles.subtitlesHeader}>
                        <MaterialIcon name="subtitles" size={14} color="#9ca3af" />
                        <Text style={[styles.subtitlesTitle, { color: '#cbd5e1', fontSize: 12 }]}>Subtitles</Text>
                        <View style={[styles.languageBadge, { marginLeft: 'auto' }]}>
                          <Text style={styles.languageBadgeText}>EN</Text>
                        </View>
                      </View>
                      <Text style={[styles.subtitlesText, { color: '#e2e8f0', fontSize: 14 }]}>
                        {currentSubtitle}
                      </Text>
                    </View>

                </ScrollView>
              </View>
            </View>
          )}

          {/* Bottom Control Bar */}
          <View style={styles.bottomBar}>
            {isManualMode ? (
              /* Manual mode: Quiz + Chat */
              <>
                <TouchableOpacity
                  style={[styles.pauseAskButton, { backgroundColor: '#10b981', flex: 1 }]}
                  onPress={() => navigation.navigate('Quiz', { courseId, topicId, topics: course?.topics || [] })}
                >
                  <MaterialIcon name="help-circle" size={20} color="#fff" />
                  <Text style={styles.pauseAskText}>Take Quiz</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bottomControlButton, { backgroundColor: isDark ? '#2d2d44' : '#e2e8f0' }]}
                  onPress={openChat}
                >
                  <Icon name="chatbubble-ellipses-outline" size={22} color={theme.colors.primary} />
                </TouchableOpacity>
              </>
            ) : (
              /* AI mode: Quiz | Flashcards | Chat */
              <>
                <TouchableOpacity
                  style={[styles.pauseAskButton, { backgroundColor: '#10b981', flex: 1 }]}
                  onPress={() => navigation.navigate('Quiz', { courseId, topicId, topics: course?.topics || [] })}
                >
                  <MaterialIcon name="help-circle" size={20} color="#fff" />
                  <Text style={styles.pauseAskText}>Take Quiz</Text>
                </TouchableOpacity>

                <View style={styles.bottomControls}>
                  <TouchableOpacity
                    style={[styles.bottomControlButton, { backgroundColor: isDark ? '#2d2d44' : '#e2e8f0' }]}
                    onPress={() => navigation.navigate('Flashcards', { courseId, topicId })}
                  >
                    <MaterialIcon name="cards-outline" size={22} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.bottomControlButton, { backgroundColor: isDark ? '#2d2d44' : '#e2e8f0' }]}
                    onPress={openChat}
                  >
                    <Icon name="chatbubble-ellipses-outline" size={22} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      {/* ── AI Lecture Chat Floating Popup ─────────────────────────────── */}
      <Modal
        visible={showChatModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowChatModal(false)}
      >
        {/* Backdrop — tap anywhere outside popup to close */}
        <TouchableOpacity
          style={chatStyles.backdrop}
          activeOpacity={1}
          onPress={() => setShowChatModal(false)}
        />

        {/* Centering wrapper — passes touches through to backdrop */}
        <View style={chatStyles.centerWrapper} pointerEvents="box-none">
          <RNAnimated.View
            style={[
              chatStyles.popup,
              {
                backgroundColor: isDark ? '#1e1e2e' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              },
              { transform: chatPosition.getTranslateTransform() },
            ]}
          >
            {/* Drag handle bar */}
            <View
              {...chatPanResponder.panHandlers}
              style={[chatStyles.dragHandle, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f5' }]}
            >
              <View style={[chatStyles.dragBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
              <View style={chatStyles.headerRow}>
                <View style={[chatStyles.headerIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Icon name="sparkles" size={16} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[chatStyles.headerTitle, { color: theme.colors.textPrimary }]}>AI Tutor</Text>
                  <Text style={[chatStyles.headerSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {topic?.title || 'Current Topic'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowChatModal(false)} style={chatStyles.closeBtn}>
                  <Icon name="close" size={18} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages */}
            {chatLoading ? (
              <View style={chatStyles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[chatStyles.loadingText, { color: theme.colors.textTertiary }]}>Loading history...</Text>
              </View>
            ) : (
              <FlatList
                ref={chatListRef}
                data={chatMessages}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                contentContainerStyle={chatStyles.messagesList}
                onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={chatStyles.emptyChat}>
                    <View style={[chatStyles.emptyIconWrap, { backgroundColor: theme.colors.primary + '12' }]}>
                      <Icon name="sparkles-outline" size={28} color={theme.colors.primary} />
                    </View>
                    <Text style={[chatStyles.emptyTitle, { color: theme.colors.textPrimary }]}>Ask your AI Tutor</Text>
                    <Text style={[chatStyles.emptySub, { color: theme.colors.textTertiary }]}>
                      Questions about this topic answered instantly
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={[
                    chatStyles.messageBubble,
                    item.sender === 'user' ? chatStyles.userBubble : chatStyles.aiBubble,
                  ]}>
                    {item.sender === 'ai' && (
                      <View style={[chatStyles.aiAvatar, { backgroundColor: theme.colors.primary + '18' }]}>
                        <Icon name="sparkles" size={12} color={theme.colors.primary} />
                      </View>
                    )}
                    <View style={[
                      chatStyles.bubbleContent,
                      item.sender === 'user'
                        ? { backgroundColor: theme.colors.primary }
                        : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f4f4f8', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e8e8f0' },
                    ]}>
                      {item.sender === 'user' ? (
                        <Text style={chatStyles.userText}>{item.content}</Text>
                      ) : (
                        <MarkdownText textColor={theme.colors.textPrimary}>
                          {item.content}
                        </MarkdownText>
                      )}
                    </View>
                  </View>
                )}
                ListFooterComponent={chatSending ? (
                  <View style={[chatStyles.messageBubble, chatStyles.aiBubble]}>
                    <View style={[chatStyles.aiAvatar, { backgroundColor: theme.colors.primary + '18' }]}>
                      <Icon name="sparkles" size={12} color={theme.colors.primary} />
                    </View>
                    <View style={[chatStyles.bubbleContent, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f4f4f8', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e8e8f0', paddingVertical: 12 }]}>
                      <View style={chatStyles.typingDots}>
                        <View style={[chatStyles.dot, { backgroundColor: theme.colors.primary }]} />
                        <View style={[chatStyles.dot, { backgroundColor: theme.colors.primary, opacity: 0.55 }]} />
                        <View style={[chatStyles.dot, { backgroundColor: theme.colors.primary, opacity: 0.25 }]} />
                      </View>
                    </View>
                  </View>
                ) : null}
              />
            )}

            {/* Input */}
            <View style={[chatStyles.inputRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f5', backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#fafafa' }]}>
              <TextInput
                style={[chatStyles.input, {
                  color: theme.colors.textPrimary,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e2ec',
                }]}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ask about this topic..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                maxLength={500}
                onSubmitEditing={handleSendChatMessage}
              />
              <TouchableOpacity
                style={[chatStyles.sendBtn, {
                  backgroundColor: chatInput.trim() && !chatSending ? theme.colors.primary : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e2ec'),
                }]}
                onPress={handleSendChatMessage}
                disabled={!chatInput.trim() || chatSending}
              >
                {chatSending
                  ? <ActivityIndicator size="small" color={chatInput.trim() ? '#fff' : theme.colors.textTertiary} />
                  : <Icon name="send" size={16} color={chatInput.trim() ? '#fff' : theme.colors.textTertiary} />
                }
              </TouchableOpacity>
            </View>
          </RNAnimated.View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={showCompleteDialog}
        title="Complete Topic"
        message="Have you finished this topic?"
        confirmText="Complete"
        confirmVariant="primary"
        onConfirm={confirmCompleteTopic}
        onCancel={() => setShowCompleteDialog(false)}
      />
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mainContent: {
    flex: 1,
  },

  // Topics Sidebar Content
  topicsSidebarContent: {
    flex: 1,
    paddingTop: 8,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  sidebarHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sidebarSubtitle: {
    fontSize: 12,
  },
  closeSidebar: {
    marginLeft: 'auto',
    padding: 4,
  },
  sidebarProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sidebarProgressText: {
    fontSize: 12,
  },
  sidebarProgressPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  sidebarProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
    borderRadius: 2,
    marginBottom: 16,
  },
  sidebarProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  topicsList: {
    flex: 1,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  topicItemCurrent: {
    borderLeftColor: '#4F46E5',
  },
  topicIcon: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicStatusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicInfo: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  topicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topicDuration: {
    fontSize: 11,
  },
  topicStatus: {
    fontSize: 11,
    fontWeight: '500',
  },
  topicProgressBar: {
    height: 3,
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    borderRadius: 2,
    marginTop: 6,
  },
  topicProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Learning Area
  learningArea: {
    flex: 1,
    padding: 16,
  },
  learningScrollView: {
    flex: 1,
  },

  // Progress Section with Back Button
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressFillGreen: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  progressFillPurple: {
    height: '100%',
    backgroundColor: '#a855f7',
    position: 'absolute',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Content Row
  contentRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },

  // Whiteboard
  whiteboardContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  whiteboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  whiteboardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whiteboardTitleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  whiteboardEdit: {
    padding: 4,
  },
  whiteboardContent: {
    padding: 20,
    minHeight: 280,
  },
  diagramTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Neural Network
  neuralNetwork: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
  },
  nnLayer: {
    alignItems: 'center',
    gap: 8,
  },
  nnNode: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nnNodeInput: {
    backgroundColor: '#3b82f6',
  },
  nnNodeHidden: {
    backgroundColor: '#a855f7',
  },
  nnNodeOutput: {
    backgroundColor: '#10b981',
  },
  nnNodeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  nnLayerLabel: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 8,
  },

  // Key Concepts
  keyConcepts: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  keyConceptsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  keyConceptsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  keyConceptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  keyConceptDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  keyConceptText: {
    color: '#d1d5db',
    fontSize: 13,
  },

  // AI Tutor Status Bar
  aiStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  aiStatusAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiStatusName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  aiStatusSub: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#10b981',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d1fae5',
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  soundWaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 28,
  },
  soundBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#10b981',
  },

  // Subtitles
  subtitlesSection: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  subtitlesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  subtitlesTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  languageBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  languageBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  subtitlesText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },

  // Question Panel
  questionPanel: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    maxHeight: 300,
  },
  questionPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  questionPanelTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  chatMessages: {
    maxHeight: 150,
    marginBottom: 12,
  },
  chatMessage: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: '80%',
  },
  chatMessageUser: {
    backgroundColor: '#4F46E5',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  chatMessageAi: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  chatMessageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  questionInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  questionInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 14,
    borderWidth: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  pauseAskButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 25,
  },
  pauseAskText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomControls: {
    flexDirection: 'row',
    gap: 8,
  },
  bottomControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
  },

  // ── AI Mode ────────────────────────────────────────────────────────────────
  aiFlexArea: {
    flex: 1,
    flexDirection: 'column',
  },

  // ── Manual Mode ────────────────────────────────────────────────────────────
  manualFlexArea: {
    flex: 1,
    flexDirection: 'column',
  },
  manualContentArea: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  manualHeaderTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  manualOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  manualOpenBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  materialTabsBar: {
    maxHeight: 40,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  materialTabsContent: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  materialTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    maxWidth: 160,
  },
  materialTabText: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  materialViewerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  iframeWrapper: {
    flex: 1,
  },
  embeddedLinkWrapper: {
    flex: 1,
    flexDirection: 'column',
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  openExternalText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewerEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  viewerEmptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
  },
  videoFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    padding: 40,
    minHeight: 260,
  },
  ytPlayButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoFallbackTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: '80%',
  },
  videoFallbackSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
    textAlign: 'center',
  },
  linkViewer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    padding: 40,
    minHeight: 260,
  },
  linkViewerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: '80%',
  },
  linkViewerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
  },
  linkViewerBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  materialImage: {
    flex: 1,
    width: '100%',
    minHeight: 200,
  },
});

// ── Lecture Chat Floating Popup Styles ────────────────────────────────────
const chatStyles = StyleSheet.create({
  // Full-screen glassmorphic backdrop
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'web' ? 'rgba(10,10,30,0.4)' : 'rgba(0,0,0,0.55)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
    } : {}),
  },
  // Transparent centering wrapper — passes touches through to backdrop
  centerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // The floating popup card
  popup: {
    width: 360,
    height: 520,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 8px 40px rgba(0,0,0,0.28)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 20,
        elevation: 20,
      },
    }),
  },
  // Drag handle section at top (user grabs this to move popup)
  dragHandle: {
    paddingTop: 10,
    paddingBottom: 0,
    borderBottomWidth: 1,
    cursor: 'grab',
  },
  dragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Loading state inside popup
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
  },
  // Message list
  messagesList: {
    padding: 12,
    paddingBottom: 4,
    flexGrow: 1,
  },
  // Empty state
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 220,
  },
  // Message bubbles
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
    gap: 6,
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  aiBubble: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  bubbleContent: {
    maxWidth: '82%',
    borderRadius: 14,
    padding: 10,
  },
  userText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 19,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Input bar at bottom
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    fontSize: 13,
    maxHeight: 80,
    lineHeight: 18,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});

export default LearningScreen;
