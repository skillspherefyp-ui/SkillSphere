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
  // Real enrollment progress
  const enrollmentProgress = (() => {
    const e = enrollments.find(en => String(en.courseId) === String(courseId) || String(en.course?.id) === String(courseId));
    return Math.round(e?.progress ?? 0);
  })();

  const autoNavDone = useRef(false);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = windowWidth >= 1024;
  const isMobile = windowWidth < 768;

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

  if (!isManualMode) {
    return (
      <MainLayout
        showSidebar={false}
        showHeader={false}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Opening the AI lecture classroom...
          </Text>
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

                    <View style={styles.manualFlexArea}>
            <View style={[styles.manualContentArea, { flex: 1 }]}>
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

          <View style={styles.bottomBar}>
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
          </View>
        </View>
      </View>
      {/* AI Lecture Chat Floating Popup */}
      <Modal
        visible={showChatModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowChatModal(false)}
      >
        <TouchableOpacity
          style={chatStyles.backdrop}
          activeOpacity={1}
          onPress={() => setShowChatModal(false)}
        />

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
