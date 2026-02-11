import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MainLayout from '../../components/ui/MainLayout';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { feedbackAPI, courseAPI } from '../../services/apiClient';

const FeedbackFormScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { courseId, courseName: routeCourseName } = route.params || {};
  const { theme, isDark } = useTheme();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [courseName, setCourseName] = useState(routeCourseName || '');
  const [loading, setLoading] = useState(!routeCourseName && courseId);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;
  const isTablet = width > 768;
  const isMobile = width <= 480;

  const sidebarItems = [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Review Courses', icon: 'book-outline', iconActive: 'book', route: 'Courses' },
  ];

  const handleNavigate = (routeName) => {
    navigation.navigate(routeName);
  };

  // Fetch course name if not provided
  useEffect(() => {
    const fetchCourseName = async () => {
      if (courseId && !routeCourseName) {
        try {
          const response = await courseAPI.getById(courseId);
          if (response.course) {
            setCourseName(response.course.name);
          }
        } catch (error) {
          console.error('Error fetching course:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchCourseName();
  }, [courseId, routeCourseName]);

  const handleSubmit = async () => {
    if (rating === 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please provide a rating',
      });
      return;
    }

    if (!feedback.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please provide feedback',
      });
      return;
    }

    setSubmitting(true);
    try {
      const feedbackData = {
        courseName: courseName || 'Unknown Course',
        expertName: user?.name || 'Expert',
        feedback: feedback.trim(),
        rating,
        courseId: courseId || null,
      };

      await feedbackAPI.create(feedbackData);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Feedback submitted successfully!',
      });
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to submit feedback',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile);

  if (loading) {
    return (
      <MainLayout
        showSidebar={true}
        sidebarItems={sidebarItems}
        activeRoute="Courses"
        onNavigate={handleNavigate}
        userInfo={{ name: user?.name, role: 'Expert', avatar: user?.avatar }}
        onLogout={logout}
        onSettings={() => navigation.navigate('Settings')}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading course details...
          </Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      showSidebar={true}
      sidebarItems={sidebarItems}
      activeRoute="Courses"
      onNavigate={handleNavigate}
      userInfo={{ name: user?.name, role: 'Expert', avatar: user?.avatar }}
      onLogout={logout}
      onSettings={() => navigation.navigate('Settings')}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerTextContainer}>
            <View style={styles.titleRow}>
              <TouchableOpacity
                style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-back" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.pageTitle, { color: theme.colors.textPrimary }]}>
                Provide Feedback
              </Text>
            </View>
            <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>
              Share your expert review and rating for this course
            </Text>
          </View>
        </View>

        {/* Course Info Card */}
        {courseName && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <AppCard style={styles.courseInfoCard}>
              <View style={styles.courseInfoContent}>
                <View style={[styles.courseIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                  <Icon name="book" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.courseInfoText}>
                  <Text style={[styles.courseInfoLabel, { color: theme.colors.textSecondary }]}>
                    Providing feedback for
                  </Text>
                  <Text style={[styles.courseInfoName, { color: theme.colors.textPrimary }]}>
                    {courseName}
                  </Text>
                </View>
              </View>
            </AppCard>
          </Animated.View>
        )}

        {/* Rating Section */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <AppCard style={styles.ratingCard}>
            <View style={styles.sectionHeader}>
              <Icon name="star" size={20} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Rating
              </Text>
              <Text style={[styles.requiredBadge, { backgroundColor: theme.colors.error + '15', color: theme.colors.error }]}>
                Required
              </Text>
            </View>
            <Text style={[styles.ratingHint, { color: theme.colors.textSecondary }]}>
              How would you rate this course overall?
            </Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={[
                    styles.starButton,
                    {
                      backgroundColor: star <= rating
                        ? '#F59E0B15'
                        : isDark ? theme.colors.backgroundSecondary : theme.colors.background,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={32}
                    color={star <= rating ? '#F59E0B' : theme.colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.starLabel,
                      { color: star <= rating ? '#F59E0B' : theme.colors.textTertiary },
                    ]}
                  >
                    {star}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <View style={styles.ratingFeedback}>
                <Text style={[styles.ratingFeedbackText, { color: '#F59E0B' }]}>
                  {rating === 1 && 'Poor - Needs significant improvement'}
                  {rating === 2 && 'Fair - Below average quality'}
                  {rating === 3 && 'Good - Meets expectations'}
                  {rating === 4 && 'Very Good - Above average quality'}
                  {rating === 5 && 'Excellent - Outstanding course!'}
                </Text>
              </View>
            )}
          </AppCard>
        </Animated.View>

        {/* Feedback Section */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <AppCard style={styles.feedbackCard}>
            <View style={styles.sectionHeader}>
              <Icon name="chatbubbles" size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Your Feedback
              </Text>
              <Text style={[styles.requiredBadge, { backgroundColor: theme.colors.error + '15', color: theme.colors.error }]}>
                Required
              </Text>
            </View>
            <Text style={[styles.feedbackHint, { color: theme.colors.textSecondary }]}>
              Provide detailed feedback about the course content, structure, and quality
            </Text>
            <AppInput
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Enter your detailed feedback here..."
              multiline={true}
              numberOfLines={8}
              textAlignVertical="top"
              style={styles.feedbackInput}
            />
            <View style={styles.characterCount}>
              <Text style={[styles.characterCountText, { color: theme.colors.textTertiary }]}>
                {feedback.length} characters
              </Text>
            </View>
          </AppCard>
        </Animated.View>

        {/* Guidelines Card */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <AppCard style={[styles.guidelinesCard, { backgroundColor: isDark ? theme.colors.card : theme.colors.primary + '08' }]}>
            <View style={styles.guidelinesHeader}>
              <Icon name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={[styles.guidelinesTitle, { color: theme.colors.primary }]}>
                Feedback Guidelines
              </Text>
            </View>
            <View style={styles.guidelinesList}>
              <View style={styles.guidelineItem}>
                <Icon name="checkmark-circle" size={16} color={theme.colors.primary} />
                <Text style={[styles.guidelineText, { color: theme.colors.textSecondary }]}>
                  Be specific about strengths and areas for improvement
                </Text>
              </View>
              <View style={styles.guidelineItem}>
                <Icon name="checkmark-circle" size={16} color={theme.colors.primary} />
                <Text style={[styles.guidelineText, { color: theme.colors.textSecondary }]}>
                  Consider course content accuracy and completeness
                </Text>
              </View>
              <View style={styles.guidelineItem}>
                <Icon name="checkmark-circle" size={16} color={theme.colors.primary} />
                <Text style={[styles.guidelineText, { color: theme.colors.textSecondary }]}>
                  Evaluate the learning materials and resources
                </Text>
              </View>
              <View style={styles.guidelineItem}>
                <Icon name="checkmark-circle" size={16} color={theme.colors.primary} />
                <Text style={[styles.guidelineText, { color: theme.colors.textSecondary }]}>
                  Provide constructive suggestions for enhancement
                </Text>
              </View>
            </View>
          </AppCard>
        </Animated.View>

        {/* Submit Button */}
        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <AppButton
            title={submitting ? 'Submitting...' : 'Submit Feedback'}
            onPress={handleSubmit}
            variant="primary"
            fullWidth
            style={styles.submitButton}
            disabled={submitting || rating === 0 || !feedback.trim()}
            leftIcon="send"
          />
        </Animated.View>
      </ScrollView>
    </MainLayout>
  );
};

const getStyles = (theme, isDark, isLargeScreen, isTablet, isMobile) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: isMobile ? 16 : 24,
      paddingBottom: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Header Section
    headerSection: {
      marginBottom: 24,
    },
    headerTextContainer: {
      width: '100%',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 4,
      flexWrap: 'wrap',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    pageTitle: {
      fontSize: isMobile ? 20 : 28,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
      flex: isMobile ? 1 : undefined,
    },
    pageSubtitle: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Course Info Card
    courseInfoCard: {
      marginBottom: 24,
      padding: isMobile ? 16 : 20,
    },
    courseInfoContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    courseIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    courseInfoText: {
      flex: 1,
    },
    courseInfoLabel: {
      fontSize: 12,
      marginBottom: 2,
      fontFamily: theme.typography.fontFamily.regular,
    },
    courseInfoName: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },

    // Section Header
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      flex: 1,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    requiredBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 10,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },

    // Rating Card
    ratingCard: {
      marginBottom: 24,
      padding: isMobile ? 16 : 24,
    },
    ratingHint: {
      fontSize: 14,
      marginBottom: 16,
      fontFamily: theme.typography.fontFamily.regular,
    },
    ratingContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    starButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    starLabel: {
      fontSize: 12,
      marginTop: 4,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    ratingFeedback: {
      marginTop: 16,
      alignItems: 'center',
    },
    ratingFeedbackText: {
      fontSize: 14,
      fontWeight: '500',
      fontFamily: theme.typography.fontFamily.medium,
    },

    // Feedback Card
    feedbackCard: {
      marginBottom: 24,
      padding: isMobile ? 16 : 24,
    },
    feedbackHint: {
      fontSize: 14,
      marginBottom: 16,
      fontFamily: theme.typography.fontFamily.regular,
    },
    feedbackInput: {
      minHeight: 160,
    },
    characterCount: {
      alignItems: 'flex-end',
      marginTop: 8,
    },
    characterCountText: {
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Guidelines Card
    guidelinesCard: {
      marginBottom: 24,
      padding: isMobile ? 16 : 20,
    },
    guidelinesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    guidelinesTitle: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    guidelinesList: {
      gap: 10,
    },
    guidelineItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    guidelineText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Submit Button
    submitButton: {
      marginTop: 8,
    },
  });

export default FeedbackFormScreen;
