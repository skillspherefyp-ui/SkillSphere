import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MainLayout from '../../components/ui/MainLayout';
import AppInput from '../../components/ui/AppInput';
import AppCard from '../../components/ui/AppCard';
import EmptyState from '../../components/ui/EmptyState';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { resolveFileUrl } from '../../utils/urlHelpers';

const ExpertCourseListScreen = () => {
  const { courses, categories } = useData();
  const { user, logout } = useAuth();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;
  const isTablet = width > 768;
  const isMobile = width <= 480;

  const sidebarItems = [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Review Courses', icon: 'book-outline', iconActive: 'book', route: 'Courses' },
  ];

  const handleNavigate = (route) => {
    navigation.navigate(route);
  };

  // Filter only published courses for experts
  const publishedCourses = courses.filter(c => c.status === 'published');

  // Stats calculation
  const stats = useMemo(() => {
    const totalCourses = publishedCourses.length;
    const reviewedCourses = publishedCourses.filter(c => c.expertReviewed).length;
    const pendingReview = totalCourses - reviewedCourses;
    return { totalCourses, reviewedCourses, pendingReview };
  }, [publishedCourses]);

  const categoryOptions = [
    { label: 'All Categories', value: null },
    ...categories.map(cat => ({ label: cat.name, value: cat.id }))
  ];

  const filteredCourses = publishedCourses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.category?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || course.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile);

  const renderCourseCard = (course, index) => (
    <Animated.View
      key={course.id}
      entering={FadeInDown.duration(400).delay(index * 80)}
      style={styles.courseCardWrapper}
    >
      <TouchableOpacity
        style={[
          styles.courseCard,
          { backgroundColor: isDark ? theme.colors.card : theme.colors.surface },
        ]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
      >
        {/* Thumbnail */}
        {course.thumbnailImage ? (
          <Image
            source={{ uri: resolveFileUrl(course.thumbnailImage) }}
            style={styles.courseThumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbnailPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
            <Icon name="book-outline" size={32} color={theme.colors.primary} />
          </View>
        )}

        {/* Content */}
        <View style={styles.courseContent}>
          {/* Review Status Badge */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: course.expertReviewed ? '#10B98120' : '#F59E0B20',
                },
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

          {/* Title & Category */}
          <Text style={[styles.courseTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {course.name}
          </Text>
          <Text style={[styles.courseCategory, { color: theme.colors.textSecondary }]}>
            {course.category?.name || 'No Category'}
          </Text>

          {/* Meta Info */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon name="time-outline" size={14} color={theme.colors.textTertiary} />
              <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>
                {course.duration || 'N/A'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="bar-chart-outline" size={14} color={theme.colors.textTertiary} />
              <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>
                {course.level || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.viewBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
            >
              <Icon name="eye-outline" size={16} color="#FFFFFF" />
              <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Review Course</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

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
                Review Courses
              </Text>
            </View>
            <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>
              Browse and provide expert feedback on published courses
            </Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <AppCard style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Total Courses
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {stats.totalCourses}
            </Text>
          </AppCard>
          <AppCard style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Reviewed
            </Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {stats.reviewedCourses}
            </Text>
          </AppCard>
          <AppCard style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Pending Review
            </Text>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {stats.pendingReview}
            </Text>
          </AppCard>
        </View>

        {/* Search & Filter Section */}
        <AppCard style={styles.filterCard} allowOverflow>
          <AppInput
            placeholder="Search courses by title or category..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Icon name="search" size={20} color={theme.colors.textSecondary} />}
            containerStyle={styles.searchInputContainer}
          />
          <View style={styles.filterRow}>
            {/* Category Filter */}
            <View style={styles.filterDropdownContainer}>
              <TouchableOpacity
                style={[styles.filterBtn, { borderColor: theme.colors.border, backgroundColor: isDark ? theme.colors.card : theme.colors.background }]}
                onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
              >
                <Text style={[styles.filterBtnText, { color: theme.colors.textPrimary }]}>
                  {categoryFilter ? categoryOptions.find(c => c.value === categoryFilter)?.label : 'Filter by Category'}
                </Text>
                <Icon name="chevron-down" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              {showCategoryDropdown && (
                <View style={[styles.dropdown, { backgroundColor: isDark ? theme.colors.card : theme.colors.surface, borderColor: theme.colors.border }]}>
                  {categoryOptions.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dropdownItem,
                        categoryFilter === option.value && { backgroundColor: theme.colors.primary + '15' }
                      ]}
                      onPress={() => {
                        setCategoryFilter(option.value);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { color: theme.colors.textPrimary }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </AppCard>

        {/* Courses Grid */}
        {filteredCourses.length > 0 ? (
          <View style={styles.coursesGrid}>
            {filteredCourses.map((course, index) => renderCourseCard(course, index))}
          </View>
        ) : (
          <AppCard style={styles.emptyContainer}>
            <EmptyState
              icon="book-outline"
              title="No courses found"
              subtitle="There are no published courses available for review"
            />
          </AppCard>
        )}
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

    // Stats Section
    statsSection: {
      flexDirection: isMobile ? 'column' : 'row',
      flexWrap: 'wrap',
      gap: isMobile ? 12 : 16,
      marginBottom: 24,
    },
    statCard: {
      flex: isMobile ? undefined : 1,
      width: isMobile ? '100%' : undefined,
      minWidth: isMobile ? undefined : isTablet ? 150 : 180,
      maxWidth: isLargeScreen ? 250 : undefined,
      padding: isMobile ? 16 : 20,
    },
    statLabel: {
      fontSize: 13,
      marginBottom: 8,
      fontFamily: theme.typography.fontFamily.regular,
    },
    statValue: {
      fontSize: isMobile ? 28 : 32,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
    },

    // Filter Section
    filterCard: {
      padding: isMobile ? 12 : 16,
      marginBottom: isMobile ? 16 : 24,
      overflow: 'visible',
      zIndex: 20,
    },
    searchInputContainer: {
      marginBottom: 12,
    },
    filterRow: {
      flexDirection: isMobile ? 'column' : 'row',
      flexWrap: 'wrap',
      gap: 12,
      zIndex: 15,
    },
    filterDropdownContainer: {
      position: 'relative',
      zIndex: 100,
      ...(isMobile && { width: '100%' }),
    },
    filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: isMobile ? 'space-between' : 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      gap: 8,
      width: isMobile ? '100%' : 'auto',
    },
    filterBtnText: {
      fontSize: 14,
      fontWeight: '500',
      fontFamily: theme.typography.fontFamily.medium,
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: isMobile ? 0 : undefined,
      minWidth: isMobile ? undefined : 180,
      width: isMobile ? '100%' : undefined,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 4,
      zIndex: 1000,
      overflow: 'hidden',
      ...theme.shadows.lg,
      ...(Platform.OS === 'web' && {
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }),
    },
    dropdownItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    dropdownItemText: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Courses Grid
    coursesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    courseCardWrapper: {
      width: isLargeScreen
        ? 'calc(33.333% - 11px)'
        : isTablet
          ? 'calc(50% - 8px)'
          : '100%',
      ...(Platform.OS !== 'web' && {
        width: isLargeScreen ? '31%' : isTablet ? '48%' : '100%',
      }),
    },
    courseCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    courseThumbnail: {
      width: '100%',
      height: isMobile ? 160 : 140,
    },
    thumbnailPlaceholder: {
      width: '100%',
      height: isMobile ? 160 : 140,
      justifyContent: 'center',
      alignItems: 'center',
    },
    courseContent: {
      padding: isMobile ? 12 : 16,
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
    courseTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    courseCategory: {
      fontSize: 13,
      marginBottom: 12,
      fontFamily: theme.typography.fontFamily.regular,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 16,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.regular,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      gap: 6,
    },
    viewBtn: {
      borderWidth: 0,
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },

    // Empty State
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
    },
  });

export default ExpertCourseListScreen;
