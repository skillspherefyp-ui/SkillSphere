import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MainLayout from '../../components/ui/MainLayout';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import AddMaterialModal from '../../components/AddMaterialModal';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { resolveFileUrl } from '../../utils/urlHelpers';
import { aiTutorAPI } from '../../services/apiClient';

const ORANGE = '#FF8C42';

// Color palette for topic cards
const TOPIC_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#F59E0B', // Amber
];

const AddTopicsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { courseId, creationMode: routeCreationMode } = route.params;
  const { courses, addTopic, updateTopic, deleteTopic, fetchCourses } = useData();
  const { user, logout } = useAuth();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const course = courses.find(c => c.id === courseId);
  const creationMode = routeCreationMode || course?.creationMode || 'ai';
  const isManualMode = creationMode === 'manual';

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;
  const isTablet = width > 768;
  const isMobile = width <= 480;

  // Check permissions
  const isOwner = course?.user?.id === user?.id;
  const isSuperAdmin = user?.role === 'superadmin';
  const canManageAllCourses = user?.permissions?.canManageAllCourses === true;
  const canAddTopics = isOwner || isSuperAdmin || canManageAllCourses;

  // State
  const [topicTitle, setTopicTitle] = useState('');
  const [topicMaterials, setTopicMaterials] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [selectedTopicMaterials, setSelectedTopicMaterials] = useState(null);
  const [topicToDelete, setTopicToDelete] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerationReportModal, setShowGenerationReportModal] = useState(false);
  const [generationReport, setGenerationReport] = useState([]);
  const [lectureMetaByTopic, setLectureMetaByTopic] = useState({});
  const [replaceExistingGeneration, setReplaceExistingGeneration] = useState(false);
  const [generationStatus, setGenerationStatus] = useState(null);

  const topics = course?.topics || [];

  useEffect(() => {
    let active = true;

    const loadLectureMeta = async () => {
      if (!courseId || isManualMode) return;

      try {
        await refreshLectureGenerationData(active);
      } catch (_) {
      }
    };

    loadLectureMeta();
    return () => {
      active = false;
    };
  }, [courseId, isManualMode, topics.length]);

  useEffect(() => {
    if (!courseId || isManualMode || !generationStatus?.isRunning) return undefined;
    const interval = setInterval(() => {
      refreshLectureGenerationData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [courseId, isManualMode, generationStatus?.isRunning]);

  // Sidebar navigation items based on user role
  const sidebarItems = isSuperAdmin ? [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Manage Admins', icon: 'person-outline', iconActive: 'person', route: 'ManageAdmins' },
    { label: 'Manage Experts', icon: 'people-outline', iconActive: 'people', route: 'ManageExperts' },
    { label: 'All Courses', icon: 'book-outline', iconActive: 'book', route: 'Courses' },
    { label: 'All Students', icon: 'school-outline', iconActive: 'school', route: 'Students' },
    { label: 'Categories', icon: 'layers-outline', iconActive: 'layers', route: 'Categories' },
    { label: 'Certificates', icon: 'ribbon-outline', iconActive: 'ribbon', route: 'CertificateManagement' },
  ] : [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Skill Categories', icon: 'layers-outline', iconActive: 'layers', route: 'CategoryManagement' },
    { label: 'Manage Courses', icon: 'book-outline', iconActive: 'book', route: 'Courses' },
    { label: 'Students', icon: 'people-outline', iconActive: 'people', route: 'Students' },
    { label: 'Certificates', icon: 'ribbon-outline', iconActive: 'ribbon', route: 'CertificateManagement' },
    { label: 'Expert Feedback', icon: 'chatbubbles-outline', iconActive: 'chatbubbles', route: 'Feedback' },
  ];

  // Calculate stats
  const stats = useMemo(() => {
    const totalTopics = topics.length;
    const totalMaterials = topics.reduce((acc, topic) => acc + (topic.materials?.length || 0), 0);
    const completedTopics = topics.filter(t => t.status === 'completed').length;
    return { totalTopics, totalMaterials, completedTopics };
  }, [topics]);

  const generatedLectureCount = useMemo(() => (
    Object.values(lectureMetaByTopic || {}).filter((lecture) => (
      lecture && ['ready', 'processing', 'failed'].includes(`${lecture.status || ''}`.trim())
    )).length
  ), [lectureMetaByTopic]);

  const formatExpectedTime = (targetIso, waitMs) => {
    if (!targetIso && !waitMs) return null;
    const waitMinutes = Math.max(1, Math.round((Number(waitMs) || 0) / 60000));
    const targetLabel = targetIso ? new Date(targetIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null;
    return targetLabel ? `Expected by ${targetLabel} (~${waitMinutes} min)` : `Expected in ~${waitMinutes} min`;
  };

  const refreshLectureGenerationData = async (active = true) => {
    if (!courseId || isManualMode) return null;
    const [statusResponse, lectureResponse] = await Promise.all([
      aiTutorAPI.getGenerationStatus(courseId).catch(() => null),
      aiTutorAPI.listLectures(courseId).catch(() => null),
    ]);

    if (!active) return statusResponse;

    const statusByTopic = (statusResponse?.topics || []).reduce((acc, item) => {
      acc[item.topicId] = item;
      return acc;
    }, {});
    const lectureByTopic = (lectureResponse?.lectures || []).reduce((acc, lecture) => {
      acc[lecture.topicId] = lecture;
      return acc;
    }, {});

    setGenerationStatus(statusResponse?.success ? statusResponse : null);
    setLectureMetaByTopic(
      topics.reduce((acc, topic) => {
        acc[topic.id] = {
          ...(lectureByTopic[topic.id] || {}),
          ...(statusByTopic[topic.id] || {}),
        };
        return acc;
      }, {})
    );
    return statusResponse;
  };

  // Get color for topic based on index
  const getTopicColor = (index) => {
    return TOPIC_COLORS[index % TOPIC_COLORS.length];
  };

  const normalizeQuizQuestions = (rawQuestions) => {
    if (Array.isArray(rawQuestions)) return rawQuestions;
    if (typeof rawQuestions === 'string') {
      try {
        const parsed = JSON.parse(rawQuestions);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  };

  const handleNavigate = (navRoute) => {
    if (isSuperAdmin) {
      if (navRoute === 'ManageAdmins') {
        navigation.navigate('ManageUsers', { userType: 'admin' });
      } else if (navRoute === 'ManageExperts') {
        navigation.navigate('ManageUsers', { userType: 'expert' });
      } else if (navRoute === 'Categories') {
        navigation.navigate('CategoryManagement');
      } else {
        navigation.navigate(navRoute);
      }
    } else {
      navigation.navigate(navRoute);
    }
  };

  const handleAddTopicMaterial = (newMaterial) => {
    setTopicMaterials((prev) => [...prev, newMaterial]);
  };

  const handleRemoveTopicMaterial = (id) => {
    setTopicMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const handleOpenAddModal = () => {
    setEditingTopic(null);
    setTopicTitle('');
    setTopicMaterials([]);
    setQuizQuestions([]);
    setShowAddModal(true);
  };

  const handleEditTopic = (topic) => {
    setEditingTopic(topic);
    setTopicTitle(topic.title);
    setTopicMaterials(topic.materials || []);
    const existingQuestions = normalizeQuizQuestions(topic.quizzes?.[0]?.questions);
    setQuizQuestions(
      existingQuestions.map((question, index) => ({
        id: question.id?.toString() || `${topic.id}-${index + 1}`,
        question: question.question || question.prompt || '',
        options: Array.isArray(question.options) ? question.options : ['', '', '', ''],
        correctAnswer: Number.isInteger(question.correctAnswer) ? question.correctAnswer : 0,
      }))
    );
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingTopic(null);
    setTopicTitle('');
    setTopicMaterials([]);
    setQuizQuestions([]);
  };

  // MCQ question helpers
  const handleAddQuestion = () => {
    setQuizQuestions(prev => [...prev, {
      id: Date.now().toString(),
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
    }]);
  };

  const handleUpdateQuestion = (qId, value) => {
    setQuizQuestions(prev => prev.map(q => q.id === qId ? { ...q, question: value } : q));
  };

  const handleUpdateOption = (qId, optIdx, value) => {
    setQuizQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const opts = [...q.options];
      opts[optIdx] = value;
      return { ...q, options: opts };
    }));
  };

  const handleSetCorrectAnswer = (qId, optIdx) => {
    setQuizQuestions(prev => prev.map(q => q.id === qId ? { ...q, correctAnswer: optIdx } : q));
  };

  const handleRemoveQuestion = (qId) => {
    setQuizQuestions(prev => prev.filter(q => q.id !== qId));
  };

  const handleViewMaterials = (topic) => {
    setSelectedTopicMaterials({
      title: topic.title,
      materials: topic.materials || [],
    });
    setShowMaterialsModal(true);
  };

  const handleOpenMaterial = (material) => {
    const fileUrl = resolveFileUrl(material.uri);

    if (Platform.OS === 'web') {
      window.open(fileUrl, '_blank');
    } else {
      Linking.openURL(fileUrl);
    }
  };

  const syncOutline = async (topicId, outlineText) => {
    if (!topicId || !outlineText?.trim() || isManualMode) {
      return;
    }

    try {
      await aiTutorAPI.updateOutline(topicId, outlineText.trim());
    } catch (error) {
      Toast.show({
        type: 'info',
        text1: 'Outline Not Synced',
        text2: error.message || 'The topic was saved, but the AI outline could not be updated yet.',
      });
    }
  };

  const handleSaveTopic = async () => {
    if (!topicTitle.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter a topic title' });
      return;
    }

    if (isManualMode) {
      if (quizQuestions.length === 0) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Please add at least one quiz question' });
        return;
      }
      for (const q of quizQuestions) {
        if (!q.question.trim()) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'All quiz questions must have text' });
          return;
        }
        if (q.options.some(opt => !opt.trim())) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'All answer options must be filled in' });
          return;
        }
      }
    }

    const formattedMaterials = topicMaterials.map(material => ({
      type: material.type,
      uri: material.uri,
      title: material.fileName || material.uri,
      description: material.description || '',
    }));

    const formattedQuestions = isManualMode ? quizQuestions.map((q, i) => ({
      id: q.id || (i + 1).toString(),
      question: q.question.trim(),
      prompt: q.question.trim(),
      options: q.options.map(o => o.trim()),
      correctAnswer: q.correctAnswer,
    })) : undefined;

    if (editingTopic) {
      const result = await updateTopic(editingTopic.id, {
        title: topicTitle,
        materials: formattedMaterials,
        questions: formattedQuestions,
      });
      if (result.success) {
        await syncOutline(editingTopic.id, topicTitle);
        handleCloseModal();
        Toast.show({ type: 'success', text1: 'Success', text2: 'Topic updated successfully!' });
        await fetchCourses();
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: result.error || 'Failed to update topic' });
      }
    } else {
      const result = await addTopic({
        courseId: courseId,
        title: topicTitle,
        materials: formattedMaterials,
        questions: formattedQuestions,
      });

      if (result.success) {
        await syncOutline(result.topic?.id, topicTitle);
        handleCloseModal();
        Toast.show({ type: 'success', text1: 'Success', text2: 'Topic added successfully!' });
        await fetchCourses();
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: result.error || 'Failed to add topic' });
      }
    }
  };

  const handleDeleteClick = (topic) => {
    setTopicToDelete(topic);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTopic = async () => {
    setShowDeleteDialog(false);
    if (topicToDelete) {
      const result = await deleteTopic(topicToDelete.id);
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Topic deleted successfully!',
        });
        await fetchCourses();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: result.error || 'Failed to delete topic',
        });
      }
      setTopicToDelete(null);
    }
  };

  const handleSubmitForAI = () => {
    if (topics.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please add at least one topic',
      });
      return;
    }
    setReplaceExistingGeneration(generatedLectureCount > 0);
    setShowConfirmDialog(true);
  };

  const confirmSubmitForAI = async () => {
    setShowConfirmDialog(false);
    setIsGenerating(true);

    try {
      const response = await aiTutorAPI.generateCoursePackage(courseId, {
        replaceExisting: replaceExistingGeneration,
      });
      if (!response.success) {
        throw new Error(response.error || 'AI generation failed');
      }

      const startedMessage = response.alreadyRunning
        ? 'AI generation is already running for this course.'
        : 'AI generation started. We will keep tracking progress for you.';

      Toast.show({
        type: 'info',
        text1: 'Generation Started',
        text2: startedMessage,
      });

      let statusResponse = null;
      for (let attempt = 0; attempt < 48; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        statusResponse = await refreshLectureGenerationData(true);

        if (statusResponse?.isCompleted && !statusResponse?.isRunning) {
          break;
        }
      }

      await fetchCourses();
      await refreshLectureGenerationData(true);

      if (!statusResponse) {
        throw new Error('AI generation started, but progress could not be checked automatically. Please refresh in a moment.');
      }

      const reportItems = (statusResponse.topics || []).map((item) => ({
        ...item,
        displayStatus: item.status === 'ready'
          ? item.generationModel === 'fallback-template'
            ? 'fallback used'
            : 'ready'
          : item.status,
        displayMessage: item.errorMessage
          || (item.status === 'ready'
            ? item.generationModel === 'fallback-template'
              ? 'Fallback lecture package stored successfully.'
              : 'Lecture package generated successfully.'
            : item.status === 'processing'
              ? 'Generation is still running for this topic.'
              : item.status === 'pending'
                ? 'This topic has not started generation yet.'
                : 'Generation failed for this topic.'),
        expectedTimeLabel: formatExpectedTime(item.expectedReadyAt, item.expectedWaitMs),
      }));

      setGenerationReport(reportItems);
      setShowGenerationReportModal(true);

      const failed = (statusResponse.topics || []).filter((item) => item.status === 'failed');
      const processingCount = (statusResponse.topics || []).filter((item) => item.status === 'processing' || item.status === 'pending').length;
      const fallbackCount = (statusResponse.topics || []).filter((item) => item.status === 'ready' && item.generationModel === 'fallback-template').length;

      Toast.show({
        type: failed.length > 0 ? 'error' : processingCount > 0 || fallbackCount > 0 ? 'info' : 'success',
        text1: failed.length > 0
          ? 'Generation Partial'
          : processingCount > 0
            ? 'Generation Still Running'
            : fallbackCount > 0
              ? 'Fallback Generation Used'
              : 'AI Generation Complete',
        text2: failed.length > 0
          ? `${statusResponse.summary?.ready || 0} ready, ${fallbackCount} fallback, ${failed.length} failed.`
          : processingCount > 0
            ? `${statusResponse.summary?.ready || 0} ready, ${processingCount} still processing. You can reopen this report anytime.`
          : fallbackCount > 0
            ? `${fallbackCount} topics used fallback packages. Open the report for exact details.`
            : `${statusResponse.summary?.ready || 0} topic packages stored successfully.`,
      });
    } catch (error) {
      setGenerationReport([{
        topicId: 'request',
        topicTitle: course?.name || 'Course',
        displayStatus: 'failed',
        displayMessage: error.message || 'Unable to generate AI lecture content',
      }]);
      setShowGenerationReportModal(true);
      Toast.show({
        type: 'error',
        text1: 'Generation Failed',
        text2: error.message || 'Unable to generate AI lecture content',
      });
    } finally {
      setIsGenerating(false);
      setReplaceExistingGeneration(false);
    }
  };

  const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile, isManualMode);

  const renderTopicCard = (topic, index) => {
    const color = getTopicColor(index);
    const materialsCount = topic.materials?.length || 0;
    const lectureMeta = lectureMetaByTopic[topic.id];
    const expectedTimeLabel = formatExpectedTime(lectureMeta?.expectedReadyAt, lectureMeta?.expectedWaitMs);

    return (
      <Animated.View
        key={topic.id}
        entering={FadeInDown.duration(400).delay(index * 80)}
        style={styles.topicCardWrapper}
      >
        <View
          style={[
            styles.topicCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,46,0.08)',
              borderLeftColor: color,
              borderLeftWidth: 3,
            },
          ]}
        >
          {/* Top Right Section - Materials Count & Actions */}
          <View style={styles.topRightSection}>
            <View style={[styles.materialsCountBadge, { backgroundColor: color + '15', borderColor: color + '30' }]}>
              <Text style={[styles.materialsCountNumber, { color }]}>
                {materialsCount}
              </Text>
              <Text style={[styles.materialsCountLabel, { color: theme.colors.textSecondary }]}>
                mats
              </Text>
            </View>
            {canAddTopics && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: theme.colors.primary + '15' }]}
                  onPress={() => handleEditTopic(topic)}
                >
                  <Icon name="create-outline" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: theme.colors.error + '15' }]}
                  onPress={() => handleDeleteClick(topic)}
                >
                  <Icon name="trash-outline" size={16} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Large Topic Number */}
          <View style={[styles.topicNumberContainer, { backgroundColor: color + '15' }]}>
            <Text style={[styles.topicNumberLarge, { color }]}>
              {String(index + 1).padStart(2, '0')}
            </Text>
          </View>

          {/* Topic Title */}
          <Text style={[styles.topicName, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {topic.title}
          </Text>

          {!isManualMode && lectureMeta?.status === 'ready' && (
            <>
              <View style={[styles.viewMaterialsBtn, { backgroundColor: color + '10', borderColor: color + '30', marginBottom: 10 }]}>
                <Icon name="sparkles-outline" size={16} color={color} />
                <Text style={[styles.viewMaterialsText, { color }]}>
                  {`${lectureMeta.estimatedDurationMinutes || 0} min AI lecture`}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.viewMaterialsBtn, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '30', marginTop: 0 }]}
                onPress={() => navigation.navigate('AILectureReview', { courseId, topicId: topic.id })}
              >
                <Icon name="eye-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.viewMaterialsText, { color: theme.colors.primary }]}>
                  View AI Lecture
                </Text>
              </TouchableOpacity>
            </>
          )}

          {!isManualMode && lectureMeta?.status && (
            <View style={styles.lectureMetaStack}>
              <View style={[styles.viewMaterialsBtn, { backgroundColor: color + '10', borderColor: color + '30', marginBottom: 8 }]}>
                <Icon name="hardware-chip-outline" size={16} color={color} />
                <Text style={[styles.viewMaterialsText, { color }]}>
                  {lectureMeta.status === 'ready'
                    ? 'AI lecture ready'
                    : lectureMeta.status === 'processing'
                      ? 'AI lecture generating'
                      : lectureMeta.status === 'failed'
                        ? 'AI generation failed'
                        : 'Waiting for AI generation'}
                </Text>
              </View>
              {expectedTimeLabel ? (
                <Text style={[styles.lectureEtaText, { color: theme.colors.textSecondary }]}>
                  {expectedTimeLabel}
                </Text>
              ) : null}
            </View>
          )}

          {/* Status Badge */}
          <View style={styles.statusContainer}>
            <StatusBadge status={topic.status || 'pending'} />
          </View>

          {/* View Materials Button */}
          {materialsCount > 0 && (
            <TouchableOpacity
              style={[styles.viewMaterialsBtn, { backgroundColor: color + '10', borderColor: color + '30' }]}
              onPress={() => handleViewMaterials(topic)}
            >
              <Icon name="folder-open-outline" size={16} color={color} />
              <Text style={[styles.viewMaterialsText, { color }]}>
                View Materials
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <MainLayout
      showSidebar={true}
      sidebarItems={sidebarItems}
      activeRoute="Courses"
      onNavigate={handleNavigate}
      userInfo={{ name: user?.name, role: isSuperAdmin ? 'Super Admin' : 'Administrator', avatar: user?.avatar }}
      onLogout={logout}
      onSettings={() => navigation.navigate('Settings')}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Banner */}
        <View style={{
          backgroundColor: isDark ? 'rgba(255,140,66,0.06)' : 'rgba(255,140,66,0.05)',
          borderColor: 'rgba(255,140,66,0.15)',
          borderRadius: 16,
          borderWidth: 1,
          padding: 20,
          marginBottom: 24,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}>
          <TouchableOpacity
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,46,0.08)',
              borderRadius: 10,
              padding: 10,
            }}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ backgroundColor: ORANGE + '20', borderRadius: 12, padding: 12 }}>
            <Icon name="list" size={22} color={ORANGE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' }}>
              Add Topics
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
              Build your course curriculum
            </Text>
          </View>
          {canAddTopics && (
            <TouchableOpacity
              style={{
                backgroundColor: ORANGE,
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                ...(Platform.OS === 'web' && { boxShadow: '0 2px 12px rgba(255,140,66,0.35)' }),
              }}
              onPress={handleOpenAddModal}
            >
              <Icon name="add" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Add Topic</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Permission Warning */}
        {!canAddTopics && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={[styles.permissionBox, { backgroundColor: theme.colors.warning + '15', borderColor: theme.colors.warning + '30' }]}>
              <Icon name="lock-closed" size={22} color={theme.colors.warning} />
              <Text style={[styles.permissionText, { color: theme.colors.warning }]}>
                You don't have permission to manage topics. Only the course creator or admins with proper permissions can add/edit topics.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Mode Toggle */}
        <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.06)', borderRadius: 12, padding: 4, marginBottom: 20 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: isManualMode ? ORANGE : 'transparent',
            }}
            onPress={() => {}}
          >
            <Text style={{ color: isManualMode ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: '700', fontSize: 13 }}>Manual</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: !isManualMode ? '#6366F1' : 'transparent',
            }}
            onPress={() => {}}
          >
            <Text style={{ color: !isManualMode ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: '700', fontSize: 13 }}>AI Generate</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={[styles.statCard, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.07)',
          }]}>
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
              <Icon name="list" size={20} color="#6366F1" />
            </View>
            <Text style={[styles.statValue, { color: '#6366F1' }]}>{stats.totalTopics}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Topics</Text>
          </View>
          <View style={[styles.statCard, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.07)',
          }]}>
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(6,182,212,0.12)' }]}>
              <Icon name="folder-open" size={20} color="#06B6D4" />
            </View>
            <Text style={[styles.statValue, { color: '#06B6D4' }]}>{stats.totalMaterials}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Materials</Text>
          </View>
          <View style={[styles.statCard, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.07)',
          }]}>
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
              <Icon name="checkmark-circle" size={20} color="#10B981" />
            </View>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.completedTopics}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Completed</Text>
          </View>
        </View>

        {/* Info Banner */}
        <Animated.View entering={FadeInDown.duration(400).delay(50)}>
          <View style={[styles.infoBox, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '30' }]}>
            <Icon name={isManualMode ? 'videocam' : 'sparkles'} size={22} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.primary }]}>
              {isManualMode
                ? 'Manual mode: add YouTube links, PDFs, and files to each topic. Topics unlock sequentially for students.'
                : 'AI mode: add topic titles, then click "Generate Content with AI" to auto-generate materials.'}
            </Text>
          </View>
        </Animated.View>

        {/* Topics Grid */}
        {topics.length > 0 ? (
          <View style={styles.topicsGrid}>
            {topics.map((topic, index) => renderTopicCard(topic, index))}
          </View>
        ) : (
          <View style={[styles.emptyContainer, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)',
          }]}>
            <EmptyState
              icon="list-outline"
              title="No topics yet"
              subtitle="Add your first topic to start building your course"
              actionLabel={canAddTopics ? "Add Topic" : undefined}
              onAction={canAddTopics ? handleOpenAddModal : undefined}
            />
          </View>
        )}

        {/* Bottom Action Button */}
        {topics.length > 0 && canAddTopics && (
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            {isManualMode ? (
              <AppButton
                title="Finish — Go to Courses"
                onPress={() => navigation.navigate('Courses')}
                variant="primary"
                style={styles.aiButton}
                leftIcon="checkmark-done"
              />
            ) : (
              <View style={styles.aiActionsStack}>
                <AppButton
                  title={isGenerating ? 'Generating AI Package...' : 'Generate Content with AI'}
                  onPress={handleSubmitForAI}
                  variant="primary"
                  style={styles.aiButton}
                  leftIcon="sparkles"
                  disabled={isGenerating}
                  loading={isGenerating}
                />
                <View style={styles.secondaryAiActions}>
                  <AppButton
                    title="Refresh AI Status"
                    onPress={() => refreshLectureGenerationData(true)}
                    variant="outline"
                    style={styles.secondaryAiButton}
                    leftIcon="refresh"
                  />
                  <AppButton
                    title="Open Last Report"
                    onPress={() => setShowGenerationReportModal(true)}
                    variant="ghost"
                    style={styles.secondaryAiButton}
                    leftIcon="document-text-outline"
                    disabled={!generationReport.length}
                  />
                </View>
                {!isManualMode && generationStatus ? (
                  <Text style={[styles.generationSummaryText, { color: theme.colors.textSecondary }]}>
                    {generationStatus.isRunning
                      ? `AI generation is running. ${generationStatus.summary?.ready || 0} ready, ${generationStatus.summary?.processing || 0} processing, ${generationStatus.summary?.pending || 0} pending. ${formatExpectedTime(generationStatus.estimatedCompletionAt, generationStatus.averageTopicDurationMs) || ''}`.trim()
                      : generationStatus.isCompleted
                        ? `AI generation completed. ${generationStatus.summary?.ready || 0} topics are ready.`
                        : `AI generation idle. ${generatedLectureCount} topic lectures currently stored.`}
                  </Text>
                ) : null}
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* Add/Edit Topic Modal — Glassmorphic */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          ...(Platform.OS === 'web' ? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } : {}),
        }}>
          <View style={{
            width: '100%',
            maxWidth: 480,
            maxHeight: '85%',
            backgroundColor: isDark ? 'rgba(15,15,30,0.92)' : 'rgba(255,255,255,0.95)',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(26,26,46,0.1)',
            padding: 28,
            ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } : {}),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: isDark ? 0.5 : 0.15,
            shadowRadius: 40,
            elevation: 20,
          }}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={{ backgroundColor: ORANGE + '20', borderRadius: 10, padding: 10 }}>
                  <Icon name="attach" size={20} color={ORANGE} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                    {editingTopic ? 'Edit Topic' : 'Add New Topic'}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                    {editingTopic ? 'Update topic details' : 'Create a new topic for your course'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseButton, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.06)',
                  borderRadius: 10,
                  padding: 8,
                }]}
                onPress={handleCloseModal}
              >
                <Icon name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={[styles.modalBodyScroll, { maxHeight: isManualMode ? 500 : 400 }]} showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <AppInput
                  label="Topic Title *"
                  value={topicTitle}
                  onChangeText={setTopicTitle}
                  placeholder="e.g., Introduction to Variables"
                />

                {/* Materials Section */}
                <View style={styles.materialsSection}>
                  <View style={styles.materialHeader}>
                    <Text style={[styles.materialLabel, { color: theme.colors.textPrimary }]}>
                      Materials ({topicMaterials.length})
                    </Text>
                    <TouchableOpacity
                      style={[styles.addMaterialBtn, { backgroundColor: ORANGE + '18', borderColor: ORANGE + '30', borderWidth: 1 }]}
                      onPress={() => setShowAddMaterialModal(true)}
                    >
                      <Icon name="add" size={18} color={ORANGE} />
                      <Text style={[styles.addMaterialText, { color: ORANGE }]}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  {topicMaterials.length === 0 ? (
                    <View style={[styles.emptyMaterials, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : theme.colors.border }]}>
                      <Icon name="folder-open-outline" size={24} color={theme.colors.textTertiary} />
                      <Text style={[styles.emptyMaterialsText, { color: theme.colors.textSecondary }]}>
                        No materials added
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.materialsList}>
                      {topicMaterials.map((material) => (
                        <View
                          key={material.id}
                          style={[styles.materialItem, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.04)',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,46,0.08)',
                          }]}
                        >
                          <Icon
                            name={
                              material.type === 'pdf' ? 'document-text-outline'
                              : material.type === 'image' ? 'image-outline'
                              : material.type === 'link' ? 'logo-youtube'
                              : 'code-slash-outline'
                            }
                            size={18}
                            color={material.type === 'link' ? '#FF0000' : theme.colors.primary}
                          />
                          <Text style={[styles.materialName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                            {material.fileName || material.uri || 'Material'}
                          </Text>
                          <TouchableOpacity onPress={() => handleRemoveTopicMaterial(material.id)}>
                            <Icon name="close-circle" size={20} color={theme.colors.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* MCQ Quiz Section — Manual Mode Only */}
                {isManualMode && (
                  <View style={styles.mcqSection}>
                    <View style={[styles.mcqSectionHeader, { borderColor: theme.colors.primary + '30', backgroundColor: theme.colors.primary + '08' }]}>
                      <Icon name="help-circle" size={18} color={theme.colors.primary} />
                      <Text style={[styles.mcqSectionTitle, { color: theme.colors.primary }]}>
                        Quiz Questions (Required)
                      </Text>
                      <TouchableOpacity
                        style={[styles.addQuestionBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={handleAddQuestion}
                      >
                        <Icon name="add" size={16} color="#fff" />
                        <Text style={styles.addQuestionBtnText}>Add</Text>
                      </TouchableOpacity>
                    </View>

                    {quizQuestions.length === 0 ? (
                      <View style={[styles.emptyMaterials, { borderColor: theme.colors.warning + '50' }]}>
                        <Icon name="alert-circle-outline" size={22} color={theme.colors.warning} />
                        <Text style={[styles.emptyMaterialsText, { color: theme.colors.warning }]}>
                          At least 1 MCQ question required
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.questionsList}>
                        {quizQuestions.map((q, qIdx) => (
                          <View
                            key={q.id}
                            style={[styles.questionCard, {
                              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.03)',
                              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,46,0.08)',
                            }]}
                          >
                            <View style={styles.questionCardHeader}>
                              <Text style={[styles.questionCardNum, { color: theme.colors.primary }]}>Q{qIdx + 1}</Text>
                              <TouchableOpacity onPress={() => handleRemoveQuestion(q.id)}>
                                <Icon name="close-circle" size={20} color={theme.colors.error} />
                              </TouchableOpacity>
                            </View>
                            <AppInput
                              value={q.question}
                              onChangeText={(val) => handleUpdateQuestion(q.id, val)}
                              placeholder="Enter question text..."
                              multiline
                              numberOfLines={2}
                            />
                            <Text style={[styles.optionsLabel, { color: theme.colors.textSecondary }]}>
                              Options (tap letter to mark correct answer):
                            </Text>
                            {q.options.map((opt, optIdx) => (
                              <View key={optIdx} style={styles.optionRow}>
                                <TouchableOpacity
                                  style={[
                                    styles.optionLetterBtn,
                                    {
                                      backgroundColor: q.correctAnswer === optIdx ? theme.colors.success : theme.colors.surface,
                                      borderColor: q.correctAnswer === optIdx ? theme.colors.success : theme.colors.border,
                                    }
                                  ]}
                                  onPress={() => handleSetCorrectAnswer(q.id, optIdx)}
                                >
                                  <Text style={[styles.optionLetterText, { color: q.correctAnswer === optIdx ? '#fff' : theme.colors.textSecondary }]}>
                                    {String.fromCharCode(65 + optIdx)}
                                  </Text>
                                </TouchableOpacity>
                                <View style={styles.optionInputWrap}>
                                  <AppInput
                                    value={opt}
                                    onChangeText={(val) => handleUpdateOption(q.id, optIdx, val)}
                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                  />
                                </View>
                              </View>
                            ))}
                            <Text style={[styles.correctHint, { color: theme.colors.success }]}>
                              ✓ Correct: Option {String.fromCharCode(65 + q.correctAnswer)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,46,0.08)' }]}>
              <AppButton
                title="Cancel"
                onPress={handleCloseModal}
                variant="outline"
                style={styles.modalCancelButton}
              />
              <AppButton
                title={editingTopic ? 'Update Topic' : 'Add Topic'}
                onPress={handleSaveTopic}
                variant="primary"
                style={styles.modalCreateButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* View Materials Modal — Glassmorphic */}
      <Modal
        visible={showMaterialsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMaterialsModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          ...(Platform.OS === 'web' ? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } : {}),
        }}>
          <View style={{
            width: '100%',
            maxWidth: 480,
            maxHeight: '85%',
            backgroundColor: isDark ? 'rgba(15,15,30,0.92)' : 'rgba(255,255,255,0.95)',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(26,26,46,0.1)',
            padding: 28,
            ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } : {}),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: isDark ? 0.5 : 0.15,
            shadowRadius: 40,
            elevation: 20,
          }}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={{ backgroundColor: '#06B6D4' + '20', borderRadius: 10, padding: 10 }}>
                  <Icon name="folder-open" size={20} color="#06B6D4" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                    Topic Materials
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {selectedTopicMaterials?.title}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseButton, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.06)',
                  borderRadius: 10,
                  padding: 8,
                }]}
                onPress={() => setShowMaterialsModal(false)}
              >
                <Icon name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Materials List */}
            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                {selectedTopicMaterials?.materials?.length > 0 ? (
                  <View style={styles.viewMaterialsList}>
                    {selectedTopicMaterials.materials.map((material, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.viewMaterialItem, {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.04)',
                          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,46,0.08)',
                        }]}
                        onPress={() => handleOpenMaterial(material)}
                      >
                        <View style={[styles.materialIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                          <Icon
                            name={
                              material.type === 'pdf' ? 'document-text'
                              : material.type === 'image' ? 'image'
                              : material.type === 'link' ? 'logo-youtube'
                              : 'code-slash'
                            }
                            size={24}
                            color={material.type === 'link' ? '#FF0000' : theme.colors.primary}
                          />
                        </View>
                        <View style={styles.materialInfo}>
                          <Text style={[styles.materialTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                            {material.title || material.fileName || 'Material'}
                          </Text>
                          <Text style={[styles.materialType, { color: theme.colors.textSecondary }]}>
                            {material.type === 'link' ? (material.isYoutube ? 'YOUTUBE VIDEO' : 'EXTERNAL LINK') : (material.type?.toUpperCase() || 'FILE')}
                          </Text>
                        </View>
                        <View style={[styles.downloadIcon, { backgroundColor: (material.type === 'link' ? theme.colors.primary : theme.colors.success) + '15' }]}>
                          <Icon
                            name={material.type === 'link' ? 'open-outline' : 'download-outline'}
                            size={20}
                            color={material.type === 'link' ? theme.colors.primary : theme.colors.success}
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noMaterialsContainer}>
                    <Icon name="folder-open-outline" size={48} color={theme.colors.textTertiary} />
                    <Text style={[styles.noMaterialsText, { color: theme.colors.textSecondary }]}>
                      No materials available
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,46,0.08)' }]}>
              <AppButton
                title="Close"
                onPress={() => setShowMaterialsModal(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Material Modal */}
      <AddMaterialModal
        visible={showAddMaterialModal}
        onClose={() => setShowAddMaterialModal(false)}
        onAddMaterial={handleAddTopicMaterial}
      />

      <Modal
        visible={showGenerationReportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGenerationReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.reportModalContent, { backgroundColor: isDark ? theme.colors.card : theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  AI Generation Report
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  Exact per-topic generation results for this course.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowGenerationReportModal(false)}
              >
                <Icon name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.reportList}>
                {generationReport.map((item, index) => (
                  <View
                    key={`${item.topicId}-${index}`}
                    style={[
                      styles.reportItem,
                      {
                        backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.reportHeader}>
                      <Text style={[styles.reportTopicTitle, { color: theme.colors.textPrimary }]}>
                        {item.topicTitle || `Topic ${index + 1}`}
                      </Text>
                      <StatusBadge status={item.displayStatus || item.status || 'info'} />
                    </View>
                    <Text style={[styles.reportMessage, { color: theme.colors.textSecondary }]}>
                      {item.displayMessage}
                    </Text>
                    {item.expectedTimeLabel ? (
                      <Text style={[styles.reportEta, { color: theme.colors.textSecondary }]}>
                        {item.expectedTimeLabel}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <AppButton
                title="Close"
                onPress={() => setShowGenerationReportModal(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete Topic"
        message={`Are you sure you want to delete "${topicToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDeleteTopic}
        onCancel={() => {
          setShowDeleteDialog(false);
          setTopicToDelete(null);
        }}
      />

      {/* AI Generation Confirmation */}
      <ConfirmDialog
        visible={showConfirmDialog}
        title="Generate with AI"
        message={replaceExistingGeneration
          ? `This course already has ${generatedLectureCount} generated AI lecture${generatedLectureCount === 1 ? '' : 's'}. Do you want to remove the existing generated lectures from the database and generate a fresh AI lecture package?`
          : 'This will trigger AI content generation for all topics. Continue?'}
        confirmText={replaceExistingGeneration ? 'Replace & Generate' : 'Generate'}
        confirmVariant="primary"
        onConfirm={confirmSubmitForAI}
        onCancel={() => {
          setShowConfirmDialog(false);
          setReplaceExistingGeneration(false);
        }}
      />
    </MainLayout>
  );
};

const getStyles = (theme, isDark, isLargeScreen, isTablet, isMobile, isManualMode) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: isMobile ? 16 : 24,
      paddingBottom: 40,
    },

    // Permission Box
    permissionBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      gap: 12,
    },
    permissionText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
    },

    // Stats Section
    statsSection: {
      flexDirection: isMobile ? 'column' : 'row',
      flexWrap: 'wrap',
      gap: isMobile ? 12 : 16,
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      minWidth: isMobile ? '100%' : 120,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      gap: 4,
      ...(Platform.OS === 'web' && {
        boxShadow: isDark ? 'none' : '0 1px 8px rgba(26,26,46,0.06)',
      }),
    },
    statIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    statValue: {
      fontSize: isMobile ? 28 : 32,
      fontWeight: '700',
      fontFamily: theme.typography?.fontFamily?.bold,
      lineHeight: isMobile ? 34 : 38,
    },
    statLabel: {
      fontSize: 13,
      fontFamily: theme.typography?.fontFamily?.regular,
      textAlign: 'center',
    },

    // Info Box
    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      gap: 12,
    },
    infoText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: theme.typography?.fontFamily?.regular,
    },

    // Topics Grid
    topicsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    topicCardWrapper: {
      width: isLargeScreen
        ? 'calc(33.333% - 11px)'
        : isTablet
          ? 'calc(50% - 8px)'
          : '100%',
      ...(Platform.OS !== 'web' && {
        width: isLargeScreen ? '31%' : isTablet ? '48%' : '100%',
      }),
    },
    topicCard: {
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      minHeight: 240,
      ...(Platform.OS === 'web' && {
        boxShadow: isDark ? 'none' : '0 1px 8px rgba(26,26,46,0.06)',
      }),
    },
    topRightSection: {
      position: 'absolute',
      top: 16,
      right: 16,
      alignItems: 'flex-end',
      gap: 10,
    },
    materialsCountBadge: {
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    materialsCountNumber: {
      fontSize: 20,
      fontWeight: '700',
      fontFamily: theme.typography?.fontFamily?.bold,
    },
    materialsCountLabel: {
      fontSize: 10,
      fontFamily: theme.typography?.fontFamily?.regular,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    editButton: {
      padding: 8,
      borderRadius: 8,
    },
    deleteButton: {
      padding: 8,
      borderRadius: 8,
    },
    topicNumberContainer: {
      width: 64,
      height: 64,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    topicNumberLarge: {
      fontSize: 28,
      fontWeight: '800',
      fontFamily: theme.typography?.fontFamily?.bold,
    },
    topicName: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: theme.typography?.fontFamily?.semiBold,
      marginBottom: 8,
      paddingRight: 80,
    },
    statusContainer: {
      marginBottom: 12,
    },
    lectureMetaStack: {
      marginBottom: 8,
    },
    lectureEtaText: {
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    viewMaterialsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      gap: 8,
      marginTop: 8,
    },
    viewMaterialsText: {
      fontSize: 13,
      fontWeight: '600',
    },

    // Empty State
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
      borderRadius: 16,
      borderWidth: 1,
    },

    // AI Button
    aiButton: {
      marginTop: 24,
    },
    aiActionsStack: {
      marginTop: 24,
      gap: 12,
    },
    secondaryAiActions: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: 10,
    },
    secondaryAiButton: {
      flex: isMobile ? 0 : 1,
    },
    generationSummaryText: {
      fontSize: 12,
      lineHeight: 18,
      paddingHorizontal: 4,
    },

    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 560,
      maxHeight: '85%',
      borderRadius: 24,
      padding: 24,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 2,
      fontFamily: theme.typography?.fontFamily?.bold,
    },
    modalSubtitle: {
      fontSize: 13,
      fontFamily: theme.typography?.fontFamily?.regular,
    },
    modalCloseButton: {},
    modalBodyScroll: {},
    modalBody: {
      marginBottom: 20,
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      paddingTop: 16,
      borderTopWidth: 1,
    },
    modalCancelButton: {
      minWidth: 100,
    },
    modalCreateButton: {
      minWidth: 140,
    },
    reportModalContent: {
      maxWidth: 640,
    },
    reportList: {
      gap: 12,
      paddingBottom: 8,
    },
    reportItem: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      gap: 10,
    },
    reportHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    reportTopicTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
    },
    reportMessage: {
      fontSize: 13,
      lineHeight: 20,
    },
    reportEta: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '600',
    },

    // Materials Section in Add/Edit Modal
    materialsSection: {
      marginTop: 20,
    },
    materialHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    materialLabel: {
      fontSize: 14,
      fontWeight: '600',
    },
    addMaterialBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 4,
    },
    addMaterialText: {
      fontSize: 13,
      fontWeight: '600',
    },
    emptyMaterials: {
      padding: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      alignItems: 'center',
      gap: 8,
    },
    emptyMaterialsText: {
      fontSize: 13,
    },
    materialsList: {
      gap: 8,
    },
    materialItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      gap: 10,
    },
    materialName: {
      flex: 1,
      fontSize: 13,
    },

    // View Materials Modal
    viewMaterialsList: {
      gap: 12,
    },
    viewMaterialItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      gap: 14,
    },
    materialIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    materialInfo: {
      flex: 1,
    },
    materialTitle: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 4,
    },
    materialType: {
      fontSize: 12,
      textTransform: 'uppercase',
    },
    downloadIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    noMaterialsContainer: {
      alignItems: 'center',
      padding: 40,
      gap: 12,
    },
    noMaterialsText: {
      fontSize: 14,
    },

    // MCQ Quiz Section
    mcqSection: {
      marginTop: 24,
    },
    mcqSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1,
      padding: 12,
      marginBottom: 12,
      gap: 8,
    },
    mcqSectionTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
    },
    addQuestionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 4,
    },
    addQuestionBtnText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '600',
    },
    questionsList: {
      gap: 16,
    },
    questionCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
      gap: 8,
    },
    questionCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    questionCardNum: {
      fontSize: 14,
      fontWeight: '700',
    },
    optionsLabel: {
      fontSize: 12,
      marginTop: 4,
      marginBottom: 4,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    optionLetterBtn: {
      width: 34,
      height: 34,
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
    },
    optionLetterText: {
      fontSize: 14,
      fontWeight: '700',
    },
    optionInputWrap: {
      flex: 1,
    },
    correctHint: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
  });

export default AddTopicsScreen;
