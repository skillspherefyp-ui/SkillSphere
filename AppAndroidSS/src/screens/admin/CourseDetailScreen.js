import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Linking,
  Image,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MainLayout from '../../components/ui/MainLayout';
import AppCard from '../../components/ui/AppCard';
import AppButton from '../../components/ui/AppButton';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { resolveFileUrl } from '../../utils/urlHelpers';

const CourseDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { courseId } = route.params;
  const { courses, updateCourse, deleteCourse } = useData();
  const { theme, isDark } = useTheme();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const course = courses.find(c => c.id === courseId);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;
  const isTablet = width > 768;
  const isMobile = width <= 480;

  // Permission checks
  const isOwner = course?.user?.id === user?.id;
  const isSuperAdmin = user?.role === 'superadmin';
  const canManageAllCourses = user?.permissions?.canManageAllCourses === true;
  const canEdit = isOwner || isSuperAdmin || canManageAllCourses;

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

  const handlePublish = () => {
    const newStatus = course.status === 'published' ? 'draft' : 'published';
    const message = newStatus === 'published' ? 'Course published!' : 'Course unpublished!';
    updateCourse(courseId, { status: newStatus });
    Toast.show({ type: 'success', text1: 'Success', text2: message });
  };

  const handleDelete = () => {
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    setShowConfirmDialog(false);
    const result = await deleteCourse(courseId);
    if (result.success) {
      Toast.show({ type: 'success', text1: 'Success', text2: 'Course deleted!' });
      navigation.goBack();
    } else {
      Toast.show({ type: 'error', text1: 'Error', text2: result.error || 'Failed to delete' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile);

  if (!course) {
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
      userInfo={{ name: user?.name, role: isSuperAdmin ? 'Super Admin' : 'Administrator', avatar: user?.avatar }}
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
              View and manage course information
            </Text>
          </View>
          {canEdit && (
            <AppButton
              title="Edit Course"
              onPress={() => navigation.navigate('CreateCourse', { courseId, courseData: course })}
              variant="primary"
              style={styles.editButton}
              leftIcon="create-outline"
            />
          )}
        </View>

        {/* Content Grid */}
        <View style={styles.contentGrid}>
          {/* Main Column */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.mainColumn}>
            {/* Hero Card - Course Name & Description */}
            <AppCard style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={styles.heroTitleSection}>
                  <Text style={[styles.courseName, { color: theme.colors.textPrimary }]}>
                    {course.name}
                  </Text>
                  <Text style={[styles.courseCategory, { color: theme.colors.textSecondary }]}>
                    {course.category?.name || 'No Category'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: course.status === 'published' ? '#10B98120' : '#F5970820' },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: course.status === 'published' ? '#10B981' : '#F59708' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: course.status === 'published' ? '#10B981' : '#F59708' },
                    ]}
                  >
                    {course.status === 'published' ? 'Published' : 'Draft'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                {course.description}
              </Text>

              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Icon name="person-outline" size={16} color={theme.colors.textTertiary} />
                  <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>
                    {course.user?.name || 'Unknown'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="calendar-outline" size={16} color={theme.colors.textTertiary} />
                  <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>
                    {formatDate(course.updatedAt)}
                  </Text>
                </View>
              </View>
            </AppCard>

            {/* Course Info Card - Moved here from sidebar */}
            <AppCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                Course Info
              </Text>

              <View style={styles.infoGrid}>
                <View style={styles.infoGridItem}>
                  <View style={[styles.infoIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Icon name="bar-chart-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textTertiary }]}>Level</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.textPrimary }]}>{course.level}</Text>
                  </View>
                </View>

                <View style={styles.infoGridItem}>
                  <View style={[styles.infoIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Icon name="language-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textTertiary }]}>Language</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.textPrimary }]}>{course.language}</Text>
                  </View>
                </View>

                <View style={styles.infoGridItem}>
                  <View style={[styles.infoIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Icon name="time-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textTertiary }]}>Duration</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.textPrimary }]}>{course.duration}</Text>
                  </View>
                </View>

                <View style={styles.infoGridItem}>
                  <View style={[styles.infoIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Icon name="calendar-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textTertiary }]}>Created</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.textPrimary }]}>{formatDate(course.createdAt)}</Text>
                  </View>
                </View>
              </View>
            </AppCard>

            {/* Topics Card */}
            <AppCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                  Topics ({course.topics?.length || 0})
                </Text>
                <AppButton
                  title={canEdit ? 'Manage' : 'View'}
                  onPress={() => navigation.navigate('AddTopics', { courseId })}
                  variant="outline"
                  size="sm"
                  leftIcon={canEdit ? 'settings-outline' : 'eye-outline'}
                />
              </View>

              {course.topics && course.topics.length > 0 ? (
                <View style={styles.topicsList}>
                  {course.topics.map((topic, index) => (
                    <View
                      key={topic.id}
                      style={[styles.topicItem, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.background }]}
                    >
                      <View style={[styles.topicNumber, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.topicNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={[styles.topicTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {topic.title}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={[styles.emptySection, { borderColor: theme.colors.border }]}>
                  <Icon name="list-outline" size={28} color={theme.colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No topics added yet
                  </Text>
                </View>
              )}
            </AppCard>

            {/* Materials Card */}
            {course.materials && course.materials.length > 0 && (
              <AppCard style={styles.card}>
                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                  Materials ({course.materials.length})
                </Text>

                <View style={styles.materialsList}>
                  {course.materials.map((material, index) => {
                    const fileUrl = resolveFileUrl(material.uri);

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.materialItem, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.background, borderColor: theme.colors.border }]}
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            window.open(fileUrl, '_blank');
                          } else {
                            Linking.openURL(fileUrl);
                          }
                        }}
                      >
                        <Icon
                          name={material.type === 'pdf' ? 'document-text-outline' : 'image-outline'}
                          size={20}
                          color={theme.colors.primary}
                        />
                        <Text style={[styles.materialName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                          {material.title || material.fileName || 'Material'}
                        </Text>
                        <Icon name="download-outline" size={18} color={theme.colors.primary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </AppCard>
            )}
          </Animated.View>

          {/* Side Column */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.sideColumn}>
            {/* Course Thumbnail Card */}
            <AppCard style={styles.thumbnailCard}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                Course Thumbnail
              </Text>

              {course.thumbnailImage ? (
                <Image
                  source={{ uri: resolveFileUrl(course.thumbnailImage) }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.thumbnailPlaceholder, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.border }]}>
                  <Icon name="image-outline" size={40} color={theme.colors.textTertiary} />
                  <Text style={[styles.thumbnailPlaceholderText, { color: theme.colors.textSecondary }]}>
                    No thumbnail
                  </Text>
                </View>
              )}
            </AppCard>

            {/* Actions Card */}
            {canEdit ? (
              <AppCard style={styles.card}>
                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                  Actions
                </Text>

                <View style={styles.actionsList}>
                  <AppButton
                    title={course.status === 'published' ? 'Unpublish' : 'Publish'}
                    onPress={handlePublish}
                    variant={course.status === 'published' ? 'outline' : 'primary'}
                    leftIcon={course.status === 'published' ? 'eye-off-outline' : 'checkmark-circle-outline'}
                    style={styles.actionBtn}
                  />
                  <AppButton
                    title="Delete Course"
                    onPress={handleDelete}
                    variant="danger"
                    leftIcon="trash-outline"
                    style={styles.actionBtn}
                  />
                </View>
              </AppCard>
            ) : (
              <AppCard style={[styles.infoCard, { backgroundColor: theme.colors.infoLight || theme.colors.primary + '10' }]}>
                <Icon name="information-circle" size={20} color={theme.colors.info || theme.colors.primary} />
                <Text style={[styles.infoCardText, { color: theme.colors.info || theme.colors.primary }]}>
                  Only the course creator or admin can edit this course.
                </Text>
              </AppCard>
            )}
          </Animated.View>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showConfirmDialog}
        title="Delete Course"
        message="Are you sure you want to delete this course? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setShowConfirmDialog(false)}
      />
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
      padding: 40,
    },

    // Header Section
    headerSection: {
      flexDirection: isTablet ? 'row' : 'column',
      justifyContent: 'space-between',
      alignItems: isTablet ? 'center' : 'flex-start',
      marginBottom: 24,
      gap: 16,
    },
    headerTextContainer: {
      flex: isTablet ? 1 : undefined,
      width: isTablet ? undefined : '100%',
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
    editButton: {
      minWidth: isMobile ? '100%' : 140,
    },

    // Content Grid
    contentGrid: {
      flexDirection: isTablet ? 'row' : 'column',
      gap: 20,
    },
    mainColumn: {
      flex: isTablet ? 2 : undefined,
      width: isTablet ? undefined : '100%',
      gap: 20,
    },
    sideColumn: {
      flex: isTablet ? 1 : undefined,
      width: isTablet ? undefined : '100%',
      gap: 20,
    },

    // Hero Card
    heroCard: {
      padding: isMobile ? 16 : 20,
    },
    heroHeader: {
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'flex-start',
      marginBottom: 12,
      gap: isMobile ? 8 : 12,
    },
    heroTitleSection: {
      flex: isMobile ? undefined : 1,
      width: isMobile ? '100%' : undefined,
    },
    courseName: {
      fontSize: isMobile ? 18 : 20,
      fontWeight: '700',
      marginBottom: 4,
      fontFamily: theme.typography.fontFamily.bold,
    },
    courseCategory: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.regular,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
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
    description: {
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 16,
      fontFamily: theme.typography.fontFamily.regular,
    },
    metaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Cards
    card: {
      padding: isMobile ? 16 : 20,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 16,
      fontFamily: theme.typography.fontFamily.semiBold,
    },

    // Topics
    topicsList: {
      gap: 8,
    },
    topicItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 10,
      gap: 12,
    },
    topicNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    topicNumberText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    topicTitle: {
      flex: 1,
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Materials
    materialsList: {
      gap: 8,
    },
    materialItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      gap: 10,
    },
    materialName: {
      flex: 1,
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Empty Section
    emptySection: {
      padding: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      alignItems: 'center',
      gap: 8,
    },
    emptyText: {
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Info Grid (horizontal layout in main column)
    infoGrid: {
      flexDirection: isMobile ? 'column' : 'row',
      flexWrap: 'wrap',
      gap: isMobile ? 12 : 16,
    },
    infoGridItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      ...(Platform.OS === 'web' ? {
        width: isMobile ? '100%' : 'calc(50% - 8px)',
      } : {
        width: isMobile ? '100%' : '48%',
      }),
    },

    // Thumbnail Card (in sidebar)
    thumbnailCard: {
      padding: isMobile ? 16 : 20,
    },
    thumbnailImage: {
      width: '100%',
      height: isMobile ? 200 : 180,
      borderRadius: 12,
    },
    thumbnailPlaceholder: {
      width: '100%',
      height: isMobile ? 200 : 180,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    thumbnailPlaceholderText: {
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Info List (keeping for backwards compat)
    infoList: {
      gap: 16,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    infoIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 12,
      marginBottom: 2,
      fontFamily: theme.typography.fontFamily.regular,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },

    // Actions
    actionsList: {
      gap: 10,
    },
    actionBtn: {
      width: '100%',
    },

    // Info Card
    infoCard: {
      flexDirection: 'row',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      gap: 12,
    },
    infoCardText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
      fontFamily: theme.typography.fontFamily.regular,
    },
  });

export default CourseDetailScreen;
