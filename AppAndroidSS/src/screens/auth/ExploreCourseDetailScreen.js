import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import AppCard from '../../components/ui/AppCard';
import AppButton from '../../components/ui/AppButton';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { courseAPI } from '../../services/apiClient';
import ThemeToggle from '../../components/ThemeToggle';
import BrandLogo from '../../components/BrandLogo';
import { resolveFileUrl } from '../../utils/urlHelpers';

const ExploreCourseDetailScreen = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();

  const [course, setCourse] = useState(route.params?.course || null);
  const [loading, setLoading] = useState(!route.params?.course);

  const isWeb = Platform.OS === 'web';
  const maxWidth = isWeb && width > 1200 ? 1200 : '100%';
  const isLargeScreen = width > 768;

  // Gradient colors matching landing page
  const gradientColors = theme.mode === 'dark'
    ? [theme.colors.background, theme.colors.backgroundSecondary, theme.colors.surface]
    : [theme.colors.gradientStart, theme.colors.gradientMid, theme.colors.gradientEnd];

  useEffect(() => {
    if (!course && route.params?.courseId) {
      fetchCourseDetails();
    }
  }, [route.params?.courseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const response = await courseAPI.getById(route.params.courseId);
      if (response.success && response.course) {
        setCourse(response.course);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = () => {
    navigation.navigate('Register', {
      message: `Sign up to enroll in ${course.name}`,
      redirectCourse: course.id
    });
  };

  const NavbarContent = () => (
    <View style={styles.navbarContent}>
      <View style={styles.navbarLeft}>
        <BrandLogo size={40} />
        <Text style={styles.navbarTitle}>SkillSphere</Text>
      </View>
      <View style={styles.navbarRight}>
        <ThemeToggle />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={20} color="#ffffff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Custom Header/Navbar with Gradient */}
        {isWeb ? (
          <View style={[styles.navbar, {
            backgroundColor: gradientColors[0],
            background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
          }]}>
            <NavbarContent />
          </View>
        ) : (
          <LinearGradient
            colors={[gradientColors[0], gradientColors[1]]}
            style={styles.navbar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <NavbarContent />
          </LinearGradient>
        )}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading course details...
          </Text>
        </View>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Custom Header/Navbar with Gradient */}
        {isWeb ? (
          <View style={[styles.navbar, {
            backgroundColor: gradientColors[0],
            background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
          }]}>
            <NavbarContent />
          </View>
        ) : (
          <LinearGradient
            colors={[gradientColors[0], gradientColors[1]]}
            style={styles.navbar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <NavbarContent />
          </LinearGradient>
        )}
        <View style={styles.loadingContainer}>
          <Icon name="alert-circle-outline" size={64} color={theme.colors.textTertiary} />
          <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
            Course not found
          </Text>
          <AppButton
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="primary"
            style={{ marginTop: 20 }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Custom Header/Navbar with Gradient */}
      {isWeb ? (
        <View style={[styles.navbar, {
          backgroundColor: gradientColors[0],
          background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
        }]}>
          <NavbarContent />
        </View>
      ) : (
        <LinearGradient
          colors={[gradientColors[0], gradientColors[1]]}
          style={styles.navbar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <NavbarContent />
        </LinearGradient>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { maxWidth, alignSelf: 'center', width: '100%' }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Course Header with Image */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.courseHeader}>
          {course.thumbnailImage ? (
            <Image
              source={{ uri: resolveFileUrl(course.thumbnailImage) }}
              style={[styles.courseThumbnail, isLargeScreen && styles.courseThumbnailLarge]}
              resizeMode="cover"
            />
          ) : (
            <View style={[
              styles.courseThumbnailPlaceholder,
              isLargeScreen && styles.courseThumbnailLarge,
              { backgroundColor: theme.colors.primary + '20' }
            ]}>
              <Icon name="book" size={80} color={theme.colors.primary} />
            </View>
          )}
        </Animated.View>

        {/* Course Info Card */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <AppCard style={styles.courseInfoCard}>
            <Text style={[styles.courseTitle, { color: theme.colors.textPrimary }]}>
              {course.name}
            </Text>

            {/* Course Meta Info */}
            <View style={styles.metaContainer}>
              <View style={[styles.metaBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                <Icon name="bar-chart-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.metaText, { color: theme.colors.primary }]}>
                  {course.level || 'All Levels'}
                </Text>
              </View>
              <View style={[styles.metaBadge, { backgroundColor: theme.colors.success + '15' }]}>
                <Icon name="time-outline" size={18} color={theme.colors.success} />
                <Text style={[styles.metaText, { color: theme.colors.success }]}>
                  {course.duration || 'Self-paced'}
                </Text>
              </View>
              <View style={[styles.metaBadge, { backgroundColor: theme.colors.warning + '15' }]}>
                <Icon name="language-outline" size={18} color={theme.colors.warning} />
                <Text style={[styles.metaText, { color: theme.colors.warning }]}>
                  {course.language || 'English'}
                </Text>
              </View>
            </View>

            {/* Category */}
            {course.category && (
              <View style={styles.categoryRow}>
                <Icon name="folder-outline" size={18} color={theme.colors.textTertiary} />
                <Text style={[styles.categoryText, { color: theme.colors.textSecondary }]}>
                  {course.category.name}
                </Text>
              </View>
            )}

            {/* Enrollment Count */}
            {(course.enrollmentCount || course._count?.enrollments) && (
              <View style={styles.enrollmentRow}>
                <Icon name="people-outline" size={18} color={theme.colors.textTertiary} />
                <Text style={[styles.enrollmentText, { color: theme.colors.textSecondary }]}>
                  {course.enrollmentCount || course._count?.enrollments || 0} students enrolled
                </Text>
              </View>
            )}
          </AppCard>
        </Animated.View>

        {/* Course Description */}
        <Animated.View entering={FadeInDown.duration(600).delay(200)}>
          <AppCard style={styles.descriptionCard}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              About This Course
            </Text>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {course.description || 'No description available for this course.'}
            </Text>
          </AppCard>
        </Animated.View>

        {/* Course Topics */}
        {course.topics && course.topics.length > 0 && (
          <Animated.View entering={FadeInDown.duration(600).delay(300)}>
            <AppCard style={styles.topicsCard}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Course Content
              </Text>
              <Text style={[styles.topicsCount, { color: theme.colors.textSecondary }]}>
                {course.topics.length} topic{course.topics.length !== 1 ? 's' : ''}
              </Text>
              {course.topics.map((topic, index) => (
                <View
                  key={topic.id || index}
                  style={[
                    styles.topicItem,
                    { borderBottomColor: theme.colors.border },
                    index === course.topics.length - 1 && { borderBottomWidth: 0 }
                  ]}
                >
                  <View style={[styles.topicNumber, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Text style={[styles.topicNumberText, { color: theme.colors.primary }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.topicContent}>
                    <Text style={[styles.topicTitle, { color: theme.colors.textPrimary }]}>
                      {topic.title}
                    </Text>
                    {topic.materials && topic.materials.length > 0 && (
                      <Text style={[styles.topicMaterials, { color: theme.colors.textTertiary }]}>
                        {topic.materials.length} material{topic.materials.length !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                  <Icon name="lock-closed-outline" size={18} color={theme.colors.textTertiary} />
                </View>
              ))}
            </AppCard>
          </Animated.View>
        )}

        {/* What You'll Learn */}
        <Animated.View entering={FadeInDown.duration(600).delay(400)}>
          <AppCard style={styles.learnCard}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              What You'll Learn
            </Text>
            <View style={styles.learnList}>
              <View style={styles.learnItem}>
                <Icon name="checkmark-circle" size={20} color={theme.colors.success} />
                <Text style={[styles.learnText, { color: theme.colors.textSecondary }]}>
                  Comprehensive understanding of course topics
                </Text>
              </View>
              <View style={styles.learnItem}>
                <Icon name="checkmark-circle" size={20} color={theme.colors.success} />
                <Text style={[styles.learnText, { color: theme.colors.textSecondary }]}>
                  Hands-on practice with real examples
                </Text>
              </View>
              <View style={styles.learnItem}>
                <Icon name="checkmark-circle" size={20} color={theme.colors.success} />
                <Text style={[styles.learnText, { color: theme.colors.textSecondary }]}>
                  Certificate upon completion
                </Text>
              </View>
              <View style={styles.learnItem}>
                <Icon name="checkmark-circle" size={20} color={theme.colors.success} />
                <Text style={[styles.learnText, { color: theme.colors.textSecondary }]}>
                  Lifetime access to course materials
                </Text>
              </View>
            </View>
          </AppCard>
        </Animated.View>

        {/* Enroll CTA */}
        <Animated.View entering={FadeInDown.duration(600).delay(500)} style={styles.ctaSection}>
          <AppCard style={[styles.ctaCard, { backgroundColor: theme.colors.primary + '10' }]}>
            <Icon name="school-outline" size={48} color={theme.colors.primary} />
            <Text style={[styles.ctaTitle, { color: theme.colors.textPrimary }]}>
              Ready to Start Learning?
            </Text>
            <Text style={[styles.ctaSubtitle, { color: theme.colors.textSecondary }]}>
              Sign up now to enroll in this course and start your learning journey!
            </Text>
            <AppButton
              title="Sign Up to Enroll"
              onPress={handleEnroll}
              variant="primary"
              style={styles.enrollButton}
              icon={<Icon name="person-add" size={20} color="#ffffff" />}
              iconPosition="left"
            />
          </AppCard>
        </Animated.View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navbar: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      },
    }),
  },
  navbarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  navbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navbarTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  navbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  courseHeader: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  courseThumbnail: {
    width: '100%',
    height: 220,
    borderRadius: 16,
  },
  courseThumbnailLarge: {
    height: 320,
  },
  courseThumbnailPlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseInfoCard: {
    padding: 20,
    marginBottom: 16,
  },
  courseTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
  },
  enrollmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enrollmentText: {
    fontSize: 14,
  },
  descriptionCard: {
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  topicsCard: {
    padding: 20,
    marginBottom: 16,
  },
  topicsCount: {
    fontSize: 14,
    marginBottom: 16,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  topicNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  topicContent: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  topicMaterials: {
    fontSize: 12,
    marginTop: 2,
  },
  learnCard: {
    padding: 20,
    marginBottom: 16,
  },
  learnList: {
    gap: 12,
  },
  learnItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  learnText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  ctaSection: {
    marginTop: 8,
  },
  ctaCard: {
    padding: 32,
    alignItems: 'center',
    borderWidth: 0,
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 400,
    lineHeight: 22,
  },
  enrollButton: {
    minWidth: 200,
  },
});

export default ExploreCourseDetailScreen;
