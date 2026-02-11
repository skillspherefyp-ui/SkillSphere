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
  Animated as RNAnimated,
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

const LearningScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { courseId, topicId } = route.params;
  const { courses, updateCourse, checkEnrollment } = useData();
  const course = courses.find(c => c.id === courseId);
  const topic = course?.topics?.find(t => t.id === topicId);

  const [isPlaying, setIsPlaying] = useState(true);
  const [showQuestionPanel, setShowQuestionPanel] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showTopicsSidebar, setShowTopicsSidebar] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(true);
  const [currentSubtitle, setCurrentSubtitle] = useState("Welcome to today's lesson on Machine Learning fundamentals.");
  const [progress, setProgress] = useState(44);

  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

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
  }, [courseId]);

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
    const isCurrent = item.id === topicId;
    const isLocked = !isCompleted && !isCurrent && index > 0;
    const topicProgress = isCurrent ? 65 : 0;

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

  const handlePauseAsk = () => {
    setIsPlaying(!isPlaying);
    if (isPlaying) {
      setShowQuestionPanel(true);
      setAiSpeaking(false);
    } else {
      setShowQuestionPanel(false);
      setAiSpeaking(true);
    }
  };

  const handleSendQuestion = () => {
    if (!question.trim()) return;

    const userMsg = { type: 'user', text: question };
    const aiResponse = {
      type: 'ai',
      text: "Excellent question! Backpropagation is the method neural networks use to learn. It calculates the error at the output and propagates it backward through the network to adjust the weights."
    };

    setChatMessages([...chatMessages, userMsg, aiResponse]);
    setQuestion('');
  };

  const handleCompleteTopic = () => {
    setShowCompleteDialog(true);
  };

  const confirmCompleteTopic = () => {
    setShowCompleteDialog(false);
    const updatedTopics = course.topics.map(t =>
      t.id === topicId ? { ...t, completed: true } : t
    );
    const currentIndex = course.topics.findIndex(t => t.id === topicId);
    if (currentIndex < course.topics.length - 1) {
      updatedTopics[currentIndex + 1].status = 'unlocked';
    }
    updateCourse(courseId, { topics: updatedTopics });
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Topic completed!',
    });
    setTimeout(() => navigation.goBack(), 1500);
  };

  // Key concepts data
  const keyConcepts = [
    'Neurons process info',
    'Connection weights',
    'Activation functions'
  ];

  return (
    <MainLayout
      showSidebar={false}
      showHeader={true}
      customSidebar={renderTopicsSidebar()}
      customSidebarVisible={showTopicsSidebar}
      onCustomSidebarToggle={setShowTopicsSidebar}
      customMenuIcon="book-open-variant"
    >
      <View style={[styles.mainContent, { backgroundColor: isDark ? '#0f0f1a' : theme.colors.background }]}>
        {/* Main Learning Area */}
        <View style={styles.learningArea}>
          {/* Progress Bar with Back Button */}
          <View style={styles.progressSection}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : theme.colors.surface }]}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={20} color={theme.colors.textPrimary} />
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

          <ScrollView style={styles.learningScrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.contentRow}>
              {/* Virtual Whiteboard */}
              <View style={[styles.whiteboardContainer, { backgroundColor: isDark ? '#1a1a2e' : '#1e293b' }]}>
                <View style={styles.whiteboardHeader}>
                  <View style={styles.whiteboardTitle}>
                    <MaterialIcon name="presentation" size={18} color="#fff" />
                    <Text style={styles.whiteboardTitleText}>Virtual Whiteboard</Text>
                  </View>
                  <TouchableOpacity style={styles.whiteboardEdit}>
                    <Icon name="pencil" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                </View>

                <View style={styles.whiteboardContent}>
                  <Text style={styles.diagramTitle}>Neural Network Architecture</Text>

                  {/* Neural Network Diagram */}
                  <View style={styles.neuralNetwork}>
                    {/* Input Layer */}
                    <View style={styles.nnLayer}>
                      {['I1', 'I2', 'I3', 'I4'].map((node) => (
                        <View key={node} style={[styles.nnNode, styles.nnNodeInput]}>
                          <Text style={styles.nnNodeText}>{node}</Text>
                        </View>
                      ))}
                      <Text style={styles.nnLayerLabel}>Input</Text>
                    </View>

                    {/* Hidden Layer */}
                    <View style={styles.nnLayer}>
                      {['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].map((node) => (
                        <View key={node} style={[styles.nnNode, styles.nnNodeHidden]}>
                          <Text style={styles.nnNodeText}>{node}</Text>
                        </View>
                      ))}
                      <Text style={styles.nnLayerLabel}>Hidden</Text>
                    </View>

                    {/* Output Layer */}
                    <View style={styles.nnLayer}>
                      {['O1', 'O2', 'O3'].map((node) => (
                        <View key={node} style={[styles.nnNode, styles.nnNodeOutput]}>
                          <Text style={styles.nnNodeText}>{node}</Text>
                        </View>
                      ))}
                      <Text style={styles.nnLayerLabel}>Output</Text>
                    </View>
                  </View>

                  {/* Key Concepts */}
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
              </View>

              {/* AI Tutor Panel */}
              {!isMobile && (
                <View style={[styles.aiTutorPanel, { backgroundColor: isDark ? '#1a1a2e' : '#f8fafc' }]}>
                  <View style={styles.aiTutorHeader}>
                    <MaterialIcon name="robot" size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.aiTutorTitle, { color: theme.colors.textPrimary }]}>AI Tutor</Text>
                    {aiSpeaking && <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>Live</Text></View>}
                  </View>

                  <View style={styles.aiAvatarContainer}>
                    <RNAnimated.View style={[styles.aiAvatarOuter, { transform: [{ scale: pulseAnim }] }]}>
                      <View style={styles.aiAvatarInner}>
                        <Text style={styles.aiAvatarText}>AI</Text>
                      </View>
                    </RNAnimated.View>
                    {aiSpeaking && (
                      <View style={styles.speakingBadge}>
                        <Text style={styles.speakingBadgeText}>Speaking</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Live Subtitles */}
            <View style={[styles.subtitlesSection, { backgroundColor: isDark ? '#1a1a2e' : '#f1f5f9' }]}>
              <View style={styles.subtitlesHeader}>
                <MaterialIcon name="subtitles" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.subtitlesTitle, { color: theme.colors.textPrimary }]}>Live Subtitles</Text>
                <View style={styles.languageBadge}>
                  <Text style={styles.languageBadgeText}>EN</Text>
                </View>
              </View>
              <Text style={[styles.subtitlesText, { color: theme.colors.textPrimary }]}>
                {currentSubtitle}
              </Text>
            </View>

            {/* Question Panel (shown when paused) */}
            {showQuestionPanel && (
              <View style={[styles.questionPanel, { backgroundColor: isDark ? '#1a1a2e' : '#fff' }]}>
                <View style={styles.questionPanelHeader}>
                  <Icon name="chatbubble-ellipses" size={18} color={theme.colors.textSecondary} />
                  <Text style={[styles.questionPanelTitle, { color: theme.colors.textPrimary }]}>Ask Your Question</Text>
                  <TouchableOpacity onPress={() => setShowQuestionPanel(false)}>
                    <Icon name="close" size={20} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.chatMessages}>
                  {chatMessages.map((msg, i) => (
                    <View
                      key={i}
                      style={[
                        styles.chatMessage,
                        msg.type === 'user' ? styles.chatMessageUser : styles.chatMessageAi
                      ]}
                    >
                      <Text style={[
                        styles.chatMessageText,
                        { color: msg.type === 'user' ? '#fff' : theme.colors.textPrimary }
                      ]}>
                        {msg.text}
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.questionInputContainer}>
                  <TextInput
                    style={[styles.questionInput, {
                      color: theme.colors.textPrimary,
                      backgroundColor: isDark ? '#2d2d44' : '#f1f5f9',
                      borderColor: isDark ? '#3d3d5c' : '#e2e8f0'
                    }]}
                    placeholder="Type your question..."
                    placeholderTextColor={theme.colors.textTertiary}
                    value={question}
                    onChangeText={setQuestion}
                    onSubmitEditing={handleSendQuestion}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}
                    onPress={handleSendQuestion}
                  >
                    <Icon name="send" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            {!showQuestionPanel && (
              <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}>
                  <Icon name="document-text" size={22} color="#fff" />
                  <Text style={styles.actionButtonText}>Notes</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#a855f7' }]}>
                  <MaterialIcon name="cards" size={22} color="#fff" />
                  <Text style={styles.actionButtonText}>Flashcards</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                  onPress={() => navigation.navigate('Quiz', { courseId, topicId })}
                >
                  <MaterialIcon name="help-circle" size={22} color="#fff" />
                  <Text style={styles.actionButtonText}>Quiz</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#f97316' }]}>
                  <Icon name="download" size={22} color="#fff" />
                  <Text style={styles.actionButtonText}>Materials</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Bottom Control Bar */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.pauseAskButton, { backgroundColor: '#10b981' }]}
              onPress={handlePauseAsk}
            >
              <Icon name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
              <Text style={styles.pauseAskText}>{isPlaying ? 'Pause & Ask' : 'Resume'}</Text>
            </TouchableOpacity>

            <View style={styles.bottomControls}>
              <TouchableOpacity style={[styles.bottomControlButton, { backgroundColor: isDark ? '#2d2d44' : '#e2e8f0' }]}>
                <MaterialIcon name="monitor" size={18} color={theme.colors.textSecondary} />
                <Icon name="chevron-down" size={14} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bottomControlButton, { backgroundColor: isDark ? '#2d2d44' : '#e2e8f0' }]}
                onPress={() => setShowQuestionPanel(!showQuestionPanel)}
              >
                <Icon name="chatbubble-outline" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.bottomControlButton, { backgroundColor: isDark ? '#2d2d44' : '#e2e8f0' }]}>
                <Icon name="mic" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

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

  // AI Tutor Panel
  aiTutorPanel: {
    width: 160,
    borderRadius: 12,
    padding: 12,
  },
  aiTutorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  aiTutorTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  liveBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  aiAvatarContainer: {
    alignItems: 'center',
  },
  aiAvatarOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(79, 70, 229, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiAvatarInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
      },
      default: {
        backgroundColor: '#a855f7',
      },
    }),
  },
  aiAvatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  speakingBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  speakingBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
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
});

export default LearningScreen;
