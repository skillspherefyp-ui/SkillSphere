import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import MainLayout from '../../components/ui/MainLayout';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { aiTutorAPI, feedbackAPI } from '../../services/apiClient';

const ORANGE = '#FF8C42';

const getSidebarItems = (role) => {
  if (role === 'expert') {
    return [
      { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
      { label: 'Review Courses', icon: 'book-outline', iconActive: 'book', route: 'Courses' },
    ];
  }

  if (role === 'superadmin') {
    return [
      { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
      { label: 'Manage Admins', icon: 'person-outline', iconActive: 'person', route: 'ManageAdmins' },
      { label: 'Manage Experts', icon: 'people-outline', iconActive: 'people', route: 'ManageExperts' },
      { label: 'All Courses', icon: 'book-outline', iconActive: 'book', route: 'Courses' },
      { label: 'All Students', icon: 'school-outline', iconActive: 'school', route: 'Students' },
      { label: 'Categories', icon: 'layers-outline', iconActive: 'layers', route: 'Categories' },
      { label: 'Certificates', icon: 'ribbon-outline', iconActive: 'ribbon', route: 'CertificateManagement' },
      { label: 'Expert Feedback', icon: 'chatbubbles-outline', iconActive: 'chatbubbles', route: 'Feedback' },
    ];
  }

  return [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Skill Categories', icon: 'layers-outline', iconActive: 'layers', route: 'CategoryManagement' },
    { label: 'Manage Courses', icon: 'book-outline', iconActive: 'book', route: 'Courses' },
    { label: 'Students', icon: 'people-outline', iconActive: 'people', route: 'Students' },
    { label: 'Certificates', icon: 'ribbon-outline', iconActive: 'ribbon', route: 'CertificateManagement' },
    { label: 'Expert Feedback', icon: 'chatbubbles-outline', iconActive: 'chatbubbles', route: 'Feedback' },
  ];
};

const summarizeAction = (action) => {
  const payload = action?.payload || {};
  switch (`${action?.type || ''}`.trim()) {
    case 'draw_diagram':
      return `${payload.diagramType || 'diagram'}: ${payload.title || 'Visual'}`;
    case 'show_example':
      return `example: ${payload.title || 'Worked example'}`;
    case 'add_bullet_list':
      return `${payload.title || 'bullet list'} (${(payload.items || []).length})`;
    case 'add_paragraph':
      return payload.title || payload.text || 'paragraph';
    case 'highlight_element':
      return `highlight: ${payload.label || payload.targetId || 'focus'}`;
    default:
      return `${action?.type || 'action'}`;
  }
};

const AILectureReviewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { courseId, topicId } = route.params || {};
  const { user, logout } = useAuth();
  const { courses, fetchCourses } = useData();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [lecture, setLecture] = useState(null);
  const [feedbackEntries, setFeedbackEntries] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState(4);
  const [regenerateSuggestion, setRegenerateSuggestion] = useState('');
  const [adminCommand, setAdminCommand] = useState('');

  const course = (courses || []).find((item) => item.id === courseId);
  const topic = course?.topics?.find((item) => item.id === topicId);
  const isExpert = user?.role === 'expert';
  const isManager = ['admin', 'superadmin'].includes(user?.role);
  const isMobile = width <= 768;
  const sidebarItems = getSidebarItems(user?.role);

  const styles = useMemo(() => getStyles(theme, isDark, isMobile), [theme, isDark, isMobile]);

  const handleNavigate = (target) => {
    if (user?.role === 'superadmin') {
      if (target === 'ManageAdmins') navigation.navigate('ManageUsers', { userType: 'admin' });
      else if (target === 'ManageExperts') navigation.navigate('ManageUsers', { userType: 'expert' });
      else navigation.navigate(target);
      return;
    }
    navigation.navigate(target);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await fetchCourses().catch(() => null);
      const [lectureResponse, feedbackResponse] = await Promise.all([
        aiTutorAPI.getLecturePackage(topicId).catch((error) => ({ success: false, error: error.message })),
        feedbackAPI.getAll({
          courseId,
          topicId,
          feedbackType: 'ai_lecture_review',
        }).catch(() => ({ success: false, feedbacks: [] })),
      ]);

      if (lectureResponse?.success && lectureResponse.lecture) {
        setLecture(lectureResponse.lecture);
      } else {
        setLecture(null);
      }
      setFeedbackEntries(feedbackResponse?.feedbacks || []);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Review Unavailable', text2: error.message || 'Unable to load this AI lecture review.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [topicId]);

  const submitExpertFeedback = async () => {
    if (!feedbackText.trim()) {
      Toast.show({ type: 'error', text1: 'Feedback required', text2: 'Please enter your expert review first.' });
      return;
    }
    setSubmitting(true);
    try {
      const response = await feedbackAPI.create({
        courseId,
        courseName: course?.name || 'Course',
        topicId,
        topicTitle: topic?.title || 'Topic',
        lectureId: lecture?.id || null,
        expertName: user?.name || 'Expert',
        feedback: feedbackText.trim(),
        rating,
        feedbackType: 'ai_lecture_review',
        regenerateCommand: regenerateSuggestion.trim() || null,
      });
      if (!response?.success) {
        throw new Error(response?.error || 'Unable to submit lecture feedback');
      }
      Toast.show({ type: 'success', text1: 'Feedback submitted', text2: 'Your lecture review is now available to the admin.' });
      setFeedbackText('');
      setRegenerateSuggestion('');
      await loadData();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Feedback failed', text2: error.message || 'Unable to submit feedback.' });
    } finally {
      setSubmitting(false);
    }
  };

  const regenerateTopicLecture = async () => {
    setRegenerating(true);
    try {
      const response = await aiTutorAPI.regenerateTopicPackage(topicId, {
        regenerateCommand: adminCommand.trim() || undefined,
      });
      if (!response?.success) {
        throw new Error(response?.error || 'Unable to start topic regeneration');
      }
      Toast.show({
        type: 'success',
        text1: 'Regeneration started',
        text2: 'The previous topic lecture was cleared and a fresh AI lecture is now being generated.',
      });
      navigation.goBack();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Regeneration failed', text2: error.message || 'Unable to regenerate this topic lecture.' });
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <MainLayout
        showSidebar
        sidebarItems={sidebarItems}
        activeRoute={user?.role === 'expert' ? 'Courses' : 'Courses'}
        onNavigate={handleNavigate}
        userInfo={{ name: user?.name, role: user?.role, avatar: user?.avatar }}
        onLogout={logout}
        onSettings={() => navigation.navigate('Settings')}
      >
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading AI lecture review...</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      showSidebar
      sidebarItems={sidebarItems}
      activeRoute="Courses"
      onNavigate={handleNavigate}
      userInfo={{ name: user?.name, role: user?.role, avatar: user?.avatar }}
      onLogout={logout}
      onSettings={() => navigation.navigate('Settings')}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.headerCard, { borderColor: theme.colors.border, backgroundColor: isDark ? 'rgba(255,140,66,0.06)' : 'rgba(255,140,66,0.05)' }]}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)' }]} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={18} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: ORANGE }]}>AI lecture review</Text>
            <Text style={[styles.screenTitle, { color: theme.colors.textPrimary }]}>{topic?.title || 'Topic lecture'}</Text>
            <Text style={[styles.screenSubtitle, { color: theme.colors.textSecondary }]}>
              {course?.name || 'Course'}{lecture?.title ? ` • ${lecture.title}` : ''}
            </Text>
          </View>
        </View>

        {!lecture ? (
          <AppCard style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>No generated lecture yet</Text>
            <Text style={[styles.mutedText, { color: theme.colors.textSecondary }]}>
              This topic does not currently have a stored AI-generated lecture package. Generate it first, then reopen this review.
            </Text>
          </AppCard>
        ) : (
          <>
            <AppCard style={styles.card}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Lecture summary</Text>
              <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>{lecture.summary}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.metaPill, { borderColor: theme.colors.border }]}>
                  <Icon name="time-outline" size={14} color={ORANGE} />
                  <Text style={[styles.metaText, { color: theme.colors.textPrimary }]}>{lecture.estimatedDurationMinutes || 0} min</Text>
                </View>
                <View style={[styles.metaPill, { borderColor: theme.colors.border }]}>
                  <Icon name="sparkles-outline" size={14} color={ORANGE} />
                  <Text style={[styles.metaText, { color: theme.colors.textPrimary }]}>{lecture.generationModel || 'AI generated'}</Text>
                </View>
              </View>
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Lecture content</Text>
              {(lecture.sections || []).slice().sort((a, b) => {
                if (a.sectionIndex === b.sectionIndex) return a.chunkIndex - b.chunkIndex;
                return a.sectionIndex - b.sectionIndex;
              }).map((section) => (
                <View key={section.id} style={[styles.chunkCard, { borderColor: theme.colors.border }]}>
                  <Text style={[styles.chunkTitle, { color: theme.colors.textPrimary }]}>
                    {section.sectionIndex + 1}.{section.chunkIndex + 1} {section.title}
                  </Text>
                  <Text style={[styles.chunkSummary, { color: theme.colors.textSecondary }]}>{section.learningObjective || section.summary}</Text>
                  <Text style={[styles.chunkBody, { color: theme.colors.textSecondary }]} numberOfLines={6}>
                    {section.spokenExplanation || section.chunkText}
                  </Text>
                  {(section.visualData?.scenes || []).length ? (
                    <View style={styles.sceneList}>
                      {(section.visualData.scenes || []).map((scene, index) => (
                        <View key={`${section.id}-scene-${index}`} style={[styles.sceneItem, { borderColor: theme.colors.border }]}>
                          <Text style={[styles.sceneTitle, { color: theme.colors.textPrimary }]}>
                            {scene.title || `Scene ${index + 1}`} • {(scene.mode || 'concept_mode').replace(/_/g, ' ')}
                          </Text>
                          <Text style={[styles.sceneSubtitle, { color: theme.colors.textSecondary }]}>
                            {scene.subtitle || scene.narration}
                          </Text>
                          <Text style={[styles.sceneActions, { color: theme.colors.textTertiary }]}>
                            {(scene.board_actions || []).map(summarizeAction).slice(0, 4).join(' • ') || 'No board actions'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
            </AppCard>
          </>
        )}

        <AppCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            {isExpert ? 'Your expert review' : 'Expert feedback'}
          </Text>
          {feedbackEntries.length ? (
            feedbackEntries.map((entry) => (
              <View key={entry.id} style={[styles.feedbackCard, { borderColor: theme.colors.border }]}>
                <View style={styles.feedbackHeader}>
                  <Text style={[styles.feedbackName, { color: theme.colors.textPrimary }]}>{entry.expertName}</Text>
                  <Text style={[styles.feedbackRating, { color: ORANGE }]}>{entry.rating}/5</Text>
                </View>
                {entry.topicTitle ? <Text style={[styles.feedbackTopic, { color: theme.colors.textTertiary }]}>{entry.topicTitle}</Text> : null}
                <Text style={[styles.feedbackBody, { color: theme.colors.textSecondary }]}>{entry.feedback}</Text>
                {entry.regenerateCommand ? (
                  <View style={[styles.commandBox, { borderColor: theme.colors.border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
                    <Text style={[styles.commandLabel, { color: theme.colors.textPrimary }]}>Suggested regenerate command</Text>
                    <Text style={[styles.commandText, { color: theme.colors.textSecondary }]}>{entry.regenerateCommand}</Text>
                    {isManager ? (
                      <AppButton
                        title="Use This Command"
                        variant="outline"
                        style={styles.inlineButton}
                        onPress={() => setAdminCommand(entry.regenerateCommand)}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={[styles.mutedText, { color: theme.colors.textSecondary }]}>
              {isExpert ? 'No feedback submitted yet for this lecture.' : 'No expert feedback has been submitted for this lecture yet.'}
            </Text>
          )}
        </AppCard>

        {isExpert ? (
          <AppCard style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Submit topic feedback</Text>
            <Text style={[styles.mutedText, { color: theme.colors.textSecondary }]}>
              Review the generated lecture, then explain what should improve. You can also suggest a regenerate command for the admin.
            </Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity key={value} onPress={() => setRating(value)} style={styles.starButton}>
                  <Icon name={value <= rating ? 'star' : 'star-outline'} size={20} color={ORANGE} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.textArea, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#0f172a' : '#fff' }]}
              multiline
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="Explain what works, what is weak, and what the lecture should improve."
              placeholderTextColor={theme.colors.textTertiary}
              textAlignVertical="top"
            />
            <TextInput
              style={[styles.textArea, styles.commandArea, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#0f172a' : '#fff' }]}
              multiline
              value={regenerateSuggestion}
              onChangeText={setRegenerateSuggestion}
              placeholder="Optional: write a specific regenerate command for the admin, e.g. add a real flowchart with decision nodes and a worked example."
              placeholderTextColor={theme.colors.textTertiary}
              textAlignVertical="top"
            />
            <AppButton title="Submit Expert Feedback" onPress={submitExpertFeedback} loading={submitting} disabled={submitting} />
          </AppCard>
        ) : null}

        {isManager ? (
          <AppCard style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Regenerate this topic lecture</Text>
            <Text style={[styles.mutedText, { color: theme.colors.textSecondary }]}>
              Enter a specific regeneration command if you want the AI to revise this topic lecture. Leave it blank to regenerate from the stored outline only.
            </Text>
            <TextInput
              style={[styles.textArea, styles.commandArea, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: isDark ? '#0f172a' : '#fff' }]}
              multiline
              value={adminCommand}
              onChangeText={setAdminCommand}
              placeholder="Example: Show a proper maximum-number flowchart with start, input, compare, decision, update, and output nodes."
              placeholderTextColor={theme.colors.textTertiary}
              textAlignVertical="top"
            />
            <AppButton
              title="Regenerate This Topic"
              variant="primary"
              onPress={regenerateTopicLecture}
              loading={regenerating}
              disabled={regenerating}
            />
          </AppCard>
        ) : null}
      </ScrollView>
    </MainLayout>
  );
};

const getStyles = (theme, isDark, isMobile) => StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { padding: isMobile ? 16 : 24, paddingBottom: 40, gap: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  headerCard: { borderWidth: 1, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  screenTitle: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  screenSubtitle: { fontSize: 13, marginTop: 4 },
  card: { padding: 18, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  summaryText: { fontSize: 14, lineHeight: 22 },
  mutedText: { fontSize: 13, lineHeight: 20 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 12, fontWeight: '700' },
  chunkCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  chunkTitle: { fontSize: 15, fontWeight: '800' },
  chunkSummary: { fontSize: 13, lineHeight: 20 },
  chunkBody: { fontSize: 13, lineHeight: 20 },
  sceneList: { gap: 8, marginTop: 8 },
  sceneItem: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 6 },
  sceneTitle: { fontSize: 13, fontWeight: '700' },
  sceneSubtitle: { fontSize: 12, lineHeight: 18 },
  sceneActions: { fontSize: 11, lineHeight: 17 },
  feedbackCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  feedbackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedbackName: { fontSize: 14, fontWeight: '800' },
  feedbackRating: { fontSize: 13, fontWeight: '800' },
  feedbackTopic: { fontSize: 12 },
  feedbackBody: { fontSize: 13, lineHeight: 20 },
  commandBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  commandLabel: { fontSize: 12, fontWeight: '800' },
  commandText: { fontSize: 12, lineHeight: 18 },
  inlineButton: { alignSelf: 'flex-start', marginTop: 4 },
  ratingRow: { flexDirection: 'row', gap: 8 },
  starButton: { paddingVertical: 4, paddingHorizontal: 2 },
  textArea: { minHeight: 130, borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 14, lineHeight: 21 },
  commandArea: { minHeight: 110 },
});

export default AILectureReviewScreen;
