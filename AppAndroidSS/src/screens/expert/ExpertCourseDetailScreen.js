import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MainLayout from '../../components/ui/MainLayout';
import AppCard from '../../components/ui/AppCard';
import AppButton from '../../components/ui/AppButton';
import EmptyState from '../../components/ui/EmptyState';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { resolveFileUrl } from '../../utils/urlHelpers';

const ExpertCourseDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { courseId } = route.params;
  const { courses } = useData();
  const { user, logout } = useAuth();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const course = courses.find(c => c.id === courseId);

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

  const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile);

  if (!course) {
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
        <View style={styles.emptyWrapper}>
          <EmptyState
            icon="alert-circle-outline"
            title="Course not found"
            subtitle="The course you're looking for doesn't exist"
          />
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
                Course Details
              </Text>
            </View>
            <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>
              Review course content and provide feedback
            </Text>
          </View>
        </View>

        {/* Course Header Card */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <AppCard style={styles.courseHeaderCard}>
            <View style={styles.courseHeaderContent}>
              {course.thumbnailImage ? (
                <Image
                  source={{ uri: resolveFileUrl(course.thumbnailImage) }}
                  style={styles.courseThumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.thumbnailPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Icon name="book-outline" size={40} color={theme.colors.primary} />
                </View>
              )}
              <View style={styles.courseHeaderInfo}>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: course.expertReviewed ? '#10B98120' : '#F59E0B20' },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: course.expertReviewed ? '#10B981' : '#F59E0B' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: course.expertReviewed ? '#10B981' : '#F59E0B' },
                      ]}
                    >
                      {course.expertReviewed ? 'Reviewed' : 'Pending Review'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.courseName, { color: theme.colors.textPrimary }]}>
                  {course.name}
                </Text>
                <Text style={[styles.courseDescription, { color: theme.colors.textSecondary }]} numberOfLines={3}>
                  {course.description}
                </Text>
              </View>
            </View>
          </AppCard>
        </Animated.View>

        {/* Info Grid */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.infoGrid}>
          <AppCard style={styles.infoItem}>
            <View style={[styles.infoIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
              <Icon name="bookmark" size={20} color={theme.colors.primary} />
            </View>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Category</Text>
            <Text style={[styles.infoValue, { color: theme.colors.textPrimary }]}>
              {course.category?.name || 'No Category'}
            </Text>
          </AppCard>
          <AppCard style={styles.infoItem}>
            <View style={[styles.infoIconContainer, { backgroundColor: '#10B98115' }]}>
              <Icon name="bar-chart" size={20} color="#10B981" />
            </View>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Level</Text>
            <Text style={[styles.infoValue, { color: theme.colors.textPrimary }]}>{course.level || 'N/A'}</Text>
          </AppCard>
          <AppCard style={styles.infoItem}>
            <View style={[styles.infoIconContainer, { backgroundColor: '#F59E0B15' }]}>
              <Icon name="language" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Language</Text>
            <Text style={[styles.infoValue, { color: theme.colors.textPrimary }]}>{course.language || 'N/A'}</Text>
          </AppCard>
          <AppCard style={styles.infoItem}>
            <View style={[styles.infoIconContainer, { backgroundColor: '#6366F115' }]}>
              <Icon name="time" size={20} color="#6366F1" />
            </View>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Duration</Text>
            <Text style={[styles.infoValue, { color: theme.colors.textPrimary }]}>{course.duration || 'N/A'}</Text>
          </AppCard>
        </Animated.View>

        {/* Course Outline */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <AppCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="list-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Course Outline ({course.topics?.length || 0} Topics)
              </Text>
            </View>
            {course.topics && course.topics.length > 0 ? (
              course.topics.map((topic, index) => (
                <View
                  key={topic.id}
                  style={[
                    styles.topicCard,
                    { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.background },
                  ]}
                >
                  <View style={styles.topicHeader}>
                    <View style={[styles.topicNumber, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.topicNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={[styles.topicTitle, { color: theme.colors.textPrimary }]}>{topic.title}</Text>
                  </View>
                  {topic.materials && topic.materials.length > 0 && (
                    <View style={styles.topicMaterialsContainer}>
                      <Text style={[styles.materialsSectionTitle, { color: theme.colors.textSecondary }]}>
                        Materials ({topic.materials.length})
                      </Text>
                      {topic.materials.map((material, idx) => {
                        const fileUrl = resolveFileUrl(material.uri);
                        const iconName = material.type === 'pdf' ? 'document-text' : 'image';

                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.topicMaterialItem, { backgroundColor: theme.colors.surface }]}
                            onPress={() => {
                              if (Platform.OS === 'web') {
                                window.open(fileUrl, '_blank');
                              } else {
                                Linking.openURL(fileUrl);
                              }
                            }}
                          >
                            <Icon name={iconName} size={18} color={theme.colors.primary} />
                            <Text style={[styles.topicMaterialTitle, { color: theme.colors.textPrimary }]}>
                              {material.title || material.fileName || 'Material'}
                            </Text>
                            <Icon name="download-outline" size={16} color={theme.colors.primary} />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyTopics}>
                <Icon name="documents-outline" size={32} color={theme.colors.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
                  No topics available
                </Text>
              </View>
            )}
          </AppCard>
        </Animated.View>

        {/* Course Materials */}
        {course.materials && course.materials.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <AppCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="folder-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Course Materials ({course.materials.length})
                </Text>
              </View>
              {course.materials.map((material, index) => {
                const fileUrl = resolveFileUrl(material.uri);
                const iconName = material.type === 'pdf' ? 'document-text' : 'image';

                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.materialItem, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.background }]}
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.open(fileUrl, '_blank');
                      } else {
                        Linking.openURL(fileUrl);
                      }
                    }}
                  >
                    <View style={[styles.materialIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                      <Icon name={iconName} size={24} color={theme.colors.primary} />
                    </View>
                    <View style={styles.materialTextContainer}>
                      <Text style={[styles.materialTitle, { color: theme.colors.textPrimary }]}>
                        {material.title || material.fileName || 'Material'}
                      </Text>
                      {material.description && (
                        <Text style={[styles.materialDesc, { color: theme.colors.textSecondary }]}>
                          {material.description}
                        </Text>
                      )}
                    </View>
                    <Icon name="cloud-download-outline" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                );
              })}
            </AppCard>
          </Animated.View>
        )}

        {/* Feedback Button */}
        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <AppButton
            title="Provide Feedback"
            onPress={() => navigation.navigate('FeedbackForm', { courseId, courseName: course.name })}
            variant="primary"
            fullWidth
            style={styles.feedbackButton}
            leftIcon="chatbubbles-outline"
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
    emptyWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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

    // Course Header Card
    courseHeaderCard: {
      marginBottom: 24,
      padding: 0,
      overflow: 'hidden',
    },
    courseHeaderContent: {
      flexDirection: isMobile ? 'column' : 'row',
    },
    courseThumbnail: {
      width: isMobile ? '100%' : 200,
      height: isMobile ? 180 : 150,
    },
    thumbnailPlaceholder: {
      width: isMobile ? '100%' : 200,
      height: isMobile ? 180 : 150,
      justifyContent: 'center',
      alignItems: 'center',
    },
    courseHeaderInfo: {
      flex: 1,
      padding: isMobile ? 16 : 20,
    },
    statusRow: {
      marginBottom: 8,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 6,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    courseName: {
      fontSize: isMobile ? 20 : 24,
      fontWeight: '700',
      marginBottom: 8,
      fontFamily: theme.typography.fontFamily.bold,
    },
    courseDescription: {
      fontSize: 14,
      lineHeight: 22,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Info Grid
    infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 24,
    },
    infoItem: {
      flex: 1,
      minWidth: isMobile ? '47%' : 140,
      padding: isMobile ? 12 : 16,
      alignItems: 'center',
    },
    infoIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    infoLabel: {
      fontSize: 12,
      marginBottom: 4,
      fontFamily: theme.typography.fontFamily.regular,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
      fontFamily: theme.typography.fontFamily.semiBold,
    },

    // Section
    section: {
      marginBottom: 24,
      padding: isMobile ? 16 : 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },

    // Topics
    topicCard: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    topicHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    topicNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    topicNumberText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: 'bold',
    },
    topicTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    topicMaterialsContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border,
    },
    materialsSectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
      marginLeft: 44,
      fontFamily: theme.typography.fontFamily.medium,
    },
    topicMaterialItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 8,
      marginBottom: 6,
      marginLeft: 44,
      gap: 10,
    },
    topicMaterialTitle: {
      flex: 1,
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.regular,
    },
    emptyTopics: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyText: {
      marginTop: 12,
      fontSize: 14,
      textAlign: 'center',
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Materials
    materialItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
    },
    materialIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    materialTextContainer: {
      flex: 1,
      marginLeft: 14,
      marginRight: 10,
    },
    materialTitle: {
      fontSize: 15,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    materialDesc: {
      fontSize: 13,
      marginTop: 2,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Feedback Button
    feedbackButton: {
      marginTop: 8,
    },
  });

export default ExpertCourseDetailScreen;
