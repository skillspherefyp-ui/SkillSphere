import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  RefreshControl,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import MainLayout from '../../components/ui/MainLayout';
import AppCard from '../../components/ui/AppCard';
import Skeleton, { SkeletonDashboardStats } from '../../components/ui/Skeleton';
import { resolveFileUrl } from '../../utils/urlHelpers';

const ORANGE = '#FF8C42';

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getMonthName = (date) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[new Date(date).getMonth()];
};

const getLast6Months = () => {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: getMonthName(date),
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
    });
  }
  return months;
};

const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const change = ((current - previous) / previous) * 100;
  return change >= 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;
};

// ============================================
// BAR CHART COMPONENT
// ============================================

const BarChart = ({ data, theme, isDark, height = 180 }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={barChartStyles.container}>
      <View style={[barChartStyles.yAxis, { height }]}>
        {[100, 75, 50, 25, 0].map((val, i) => (
          <Text key={i} style={[barChartStyles.yLabel, { color: theme.colors.textTertiary }]}>
            {Math.round((maxValue * val) / 100)}
          </Text>
        ))}
      </View>
      <View style={barChartStyles.chartArea}>
        <View
          style={[
            barChartStyles.barsContainer,
            {
              height,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,46,0.1)',
            },
          ]}
        >
          {data.map((item, index) => {
            const barHeight = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            return (
              <View key={index} style={barChartStyles.barWrapper}>
                <View
                  style={[
                    barChartStyles.bar,
                    {
                      height: `${Math.max(barHeight, 2)}%`,
                      backgroundColor: item.color || '#10B981',
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
        <View style={barChartStyles.xAxis}>
          {data.map((item, index) => (
            <Text key={index} style={[barChartStyles.xLabel, { color: theme.colors.textTertiary }]}>
              {item.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

const barChartStyles = StyleSheet.create({
  container: { flexDirection: 'row', paddingTop: 10 },
  yAxis: { width: 40, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 8 },
  yLabel: { fontSize: 11 },
  chartArea: { flex: 1 },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  barWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', paddingHorizontal: 4 },
  bar: { width: '70%', borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 4 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, paddingHorizontal: 8 },
  xLabel: { fontSize: 11, flex: 1, textAlign: 'center' },
});

// ============================================
// REDESIGNED STAT CARD COMPONENT
// ============================================

const DashboardStatCard = ({ icon, iconColor, value, label, change, theme, isDark, style }) => {
  const isPositive = change && change.startsWith('+');

  return (
    <View
      style={[
        dsc.card,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.07)',
          borderLeftColor: iconColor,
        },
        style,
      ]}
    >
      <View style={dsc.top}>
        <Text style={[dsc.label, { color: theme.colors.textSecondary }]}>{label}</Text>
        <View style={[dsc.iconCircle, { backgroundColor: iconColor + '18' }]}>
          <Icon name={icon} size={18} color={iconColor} />
        </View>
      </View>
      <Text style={[dsc.value, { color: theme.colors.textPrimary }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      {change && (
        <View style={dsc.changeRow}>
          <Icon
            name={isPositive ? 'trending-up-outline' : 'trending-down-outline'}
            size={13}
            color={isPositive ? '#10B981' : '#EF4444'}
          />
          <Text style={[dsc.change, { color: isPositive ? '#10B981' : '#EF4444' }]}>
            {change} from last month
          </Text>
        </View>
      )}
    </View>
  );
};

const dsc = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  change: {
    fontSize: 12,
    fontWeight: '600',
  },
});

// ============================================
// MAIN COMPONENT
// ============================================

const ExpertDashboard = () => {
  const { user, logout } = useAuth();
  const { courses, fetchCourses } = useData();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;
  const isTablet = width > 768;
  const isMobile = width <= 480;

  const sidebarItems = [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Review Courses', icon: 'book-outline', iconActive: 'book', route: 'Courses' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!initialLoading) {
        fetchCourses();
      }
    }, [initialLoading])
  );

  const loadData = async () => {
    try {
      await fetchCourses();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCourses();
    setRefreshing(false);
  };

  const handleNavigate = (route) => {
    navigation.navigate(route);
  };

  // Calculate statistics with dynamic percentages
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const publishedCourses = courses.filter(c => c.status === 'published');
    const pendingReviewCourses = courses.filter(c => c.status === 'pending' || c.status === 'draft');
    const reviewedCourses = courses.filter(c => c.expertReviewed);

    const coursesThisMonth = publishedCourses.filter(c => {
      const date = new Date(c.createdAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;

    const coursesLastMonth = publishedCourses.filter(c => {
      const date = new Date(c.createdAt);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    }).length;

    const reviewsThisMonth = reviewedCourses.filter(c => {
      const date = new Date(c.updatedAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;

    const reviewsLastMonth = reviewedCourses.filter(c => {
      const date = new Date(c.updatedAt);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    }).length;

    const pendingThisMonth = pendingReviewCourses.filter(c => {
      const date = new Date(c.createdAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;

    const pendingLastMonth = pendingReviewCourses.filter(c => {
      const date = new Date(c.createdAt);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    }).length;

    return {
      totalCourses: publishedCourses.length,
      pendingReview: pendingReviewCourses.length,
      reviewed: reviewedCourses.length,
      courseChange: calculatePercentageChange(coursesThisMonth, coursesLastMonth),
      pendingChange: calculatePercentageChange(pendingThisMonth, pendingLastMonth),
      reviewedChange: calculatePercentageChange(reviewsThisMonth, reviewsLastMonth),
    };
  }, [courses]);

  // Build review activity chart data
  const reviewActivityData = useMemo(() => {
    const last6Months = getLast6Months();
    const colors = ['#10B981', '#10B981', '#34D399', '#34D399', '#6EE7B7', '#6EE7B7'];

    return last6Months.map((monthData, index) => {
      const reviewsInMonth = courses.filter(course => {
        if (!course.expertReviewed) return false;
        const reviewDate = new Date(course.updatedAt);
        return (
          reviewDate.getFullYear() === monthData.year &&
          reviewDate.getMonth() === monthData.monthIndex
        );
      }).length;

      return {
        label: monthData.month,
        value: reviewsInMonth,
        color: colors[index],
      };
    });
  }, [courses]);

  // Get recent courses for review
  const recentCourses = useMemo(() => {
    return courses
      .filter(c => c.status === 'published' || c.status === 'pending')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [courses]);

  const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile);

  if (initialLoading) {
    return (
      <MainLayout
        showSidebar={true}
        sidebarItems={sidebarItems}
        activeRoute="Dashboard"
        onNavigate={handleNavigate}
        userInfo={{ name: user?.name, role: 'Expert', avatar: user?.avatar }}
        onLogout={logout}
        onSettings={() => navigation.navigate('Settings')}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.pageBanner}>
            <View style={styles.bannerLeft}>
              <View style={[styles.bannerIconCircle, { backgroundColor: '#10B981' + '20' }]}>
                <Icon name="grid" size={24} color="#10B981" />
              </View>
              <View>
                <Text style={[styles.bannerTitle, { color: theme.colors.textPrimary }]}>Expert Dashboard</Text>
                <Text style={[styles.bannerSubtitle, { color: theme.colors.textSecondary }]}>
                  Review and provide feedback on courses
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.section}>
            <SkeletonDashboardStats count={3} />
          </View>
        </ScrollView>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      showSidebar={true}
      sidebarItems={sidebarItems}
      activeRoute="Dashboard"
      onNavigate={handleNavigate}
      userInfo={{ name: user?.name, role: 'Expert', avatar: user?.avatar }}
      onLogout={logout}
      onSettings={() => navigation.navigate('Settings')}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Page Banner */}
        <View style={styles.pageBanner}>
          <View style={styles.bannerLeft}>
            <View style={[styles.bannerIconCircle, { backgroundColor: '#10B981' + '20' }]}>
              <Icon name="grid" size={24} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.bannerTitle, { color: theme.colors.textPrimary }]}>Expert Dashboard</Text>
              <Text style={[styles.bannerSubtitle, { color: theme.colors.textSecondary }]}>
                {`Welcome back, ${user?.name || 'Expert'}! Here's your review overview.`}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('Courses')}
          >
            <Icon name="eye-outline" size={16} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Review Courses</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <DashboardStatCard
            icon="book-outline"
            iconColor="#6366F1"
            value={stats.totalCourses}
            label="Published Courses"
            change={stats.courseChange}
            theme={theme}
            isDark={isDark}
            style={styles.statCard}
          />
          <DashboardStatCard
            icon="time-outline"
            iconColor="#F59E0B"
            value={stats.pendingReview}
            label="Pending Review"
            change={stats.pendingChange}
            theme={theme}
            isDark={isDark}
            style={styles.statCard}
          />
          <DashboardStatCard
            icon="checkmark-circle-outline"
            iconColor="#10B981"
            value={stats.reviewed}
            label="Reviewed by You"
            change={stats.reviewedChange}
            theme={theme}
            isDark={isDark}
            style={styles.statCard}
          />
        </View>

        {/* Charts Section */}
        <View style={styles.chartsSection}>
          {/* Review Activity Chart */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.chartCard}>
            <AppCard
              style={[
                styles.chartCardInner,
                {
                  borderLeftWidth: 3,
                  borderLeftColor: '#10B981',
                },
              ]}
            >
              <View style={styles.chartHeader}>
                <View style={styles.chartHeaderLeft}>
                  <View style={[styles.chartIconBadge, { backgroundColor: '#10B981' + '18' }]}>
                    <Icon name="bar-chart" size={16} color="#10B981" />
                  </View>
                  <View>
                    <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
                      Review Activity
                    </Text>
                    <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
                      Your monthly review contributions
                    </Text>
                  </View>
                </View>
                <Icon name="trending-up" size={20} color="#10B981" />
              </View>
              <BarChart
                data={reviewActivityData}
                theme={theme}
                isDark={isDark}
                height={isMobile ? 140 : 180}
              />
            </AppCard>
          </Animated.View>

          {/* Quick Actions Card */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.chartCard}>
            <AppCard
              style={[
                styles.chartCardInner,
                {
                  borderLeftWidth: 3,
                  borderLeftColor: ORANGE,
                },
              ]}
            >
              <View style={styles.chartHeader}>
                <View style={styles.chartHeaderLeft}>
                  <View style={[styles.chartIconBadge, { backgroundColor: ORANGE + '18' }]}>
                    <Icon name="flash" size={16} color={ORANGE} />
                  </View>
                  <View>
                    <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
                      Quick Actions
                    </Text>
                    <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
                      Jump to common tasks
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity
                  style={[
                    styles.quickAction,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : theme.colors.background,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)',
                    },
                  ]}
                  onPress={() => navigation.navigate('Courses')}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#6366F1' + '18' }]}>
                    <Icon name="book" size={22} color="#6366F1" />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>
                    Browse Courses
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.quickAction,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : theme.colors.background,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)',
                    },
                  ]}
                  onPress={() => navigation.navigate('FeedbackForm')}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#10B981' + '18' }]}>
                    <Icon name="chatbubbles" size={22} color="#10B981" />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>
                    Give Feedback
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.quickAction,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : theme.colors.background,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)',
                    },
                  ]}
                  onPress={() => navigation.navigate('Settings')}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#F59E0B' + '18' }]}>
                    <Icon name="settings" size={22} color="#F59E0B" />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>
                    Settings
                  </Text>
                </TouchableOpacity>
              </View>
            </AppCard>
          </Animated.View>
        </View>

        {/* Recent Courses Table */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconBadge}>
                <Icon name="book" size={16} color="#10B981" />
              </View>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Courses to Review
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                  Latest courses requiring expert feedback
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.viewAllButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('Courses')}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <AppCard style={styles.tableCard}>
            {/* Table Header */}
            <View style={[styles.tableHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.tableHeaderCell, styles.imageColumn, { color: theme.colors.textSecondary }]}>
                Image
              </Text>
              <Text style={[styles.tableHeaderCell, styles.courseNameColumn, { color: theme.colors.textSecondary }]}>
                Course Title
              </Text>
              {!isMobile && (
                <Text style={[styles.tableHeaderCell, styles.categoryColumn, { color: theme.colors.textSecondary }]}>
                  Category
                </Text>
              )}
              <Text style={[styles.tableHeaderCell, styles.statusColumn, { color: theme.colors.textSecondary }]}>
                Status
              </Text>
              <Text style={[styles.tableHeaderCell, styles.actionColumn, { color: theme.colors.textSecondary }]}>
                Action
              </Text>
            </View>

            {/* Table Rows */}
            {recentCourses.length > 0 ? (
              recentCourses.map((course, index) => (
                <View
                  key={course.id || index}
                  style={[
                    styles.tableRow,
                    index % 2 === 1 && {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.02)'
                        : 'rgba(16,185,129,0.03)',
                    },
                    index < recentCourses.length - 1 && {
                      borderBottomColor: theme.colors.border,
                      borderBottomWidth: 1,
                    },
                  ]}
                >
                  {/* Course Image */}
                  <View style={[styles.tableCell, styles.imageColumn]}>
                    {course.thumbnailImage ? (
                      <Image
                        source={{ uri: resolveFileUrl(course.thumbnailImage) }}
                        style={styles.courseImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.courseImagePlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                        <Icon name="image-outline" size={18} color={theme.colors.primary} />
                      </View>
                    )}
                  </View>

                  {/* Course Title */}
                  <Text
                    style={[styles.tableCell, styles.courseNameColumn, styles.courseName, { color: theme.colors.textPrimary }]}
                    numberOfLines={2}
                  >
                    {course.name || 'Untitled Course'}
                  </Text>

                  {/* Category */}
                  {!isMobile && (
                    <Text
                      style={[styles.tableCell, styles.categoryColumn, { color: theme.colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {course.category?.name || 'Uncategorized'}
                    </Text>
                  )}

                  {/* Status */}
                  <View style={[styles.tableCell, styles.statusColumn]}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: course.status === 'published' ? '#10B98120' : '#F59E0B20',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: course.status === 'published' ? '#10B981' : '#F59E0B',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: course.status === 'published' ? '#10B981' : '#F59E0B',
                          },
                        ]}
                      >
                        {course.status === 'published' ? 'Published' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  {/* Action */}
                  <View style={[styles.tableCell, styles.actionColumn]}>
                    <TouchableOpacity
                      style={[styles.viewDetailsButton, { borderColor: theme.colors.primary }]}
                      onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
                    >
                      <Text style={[styles.viewDetailsText, { color: theme.colors.primary }]}>
                        Review
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="book-outline" size={40} color={theme.colors.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No courses available for review
                </Text>
              </View>
            )}
          </AppCard>
        </View>
      </ScrollView>
    </MainLayout>
  );
};

const getStyles = (theme, isDark, isLargeScreen, isTablet, isMobile) =>
  StyleSheet.create({
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    section: { paddingHorizontal: isMobile ? 16 : 24, marginBottom: 24 },

    // ---- Page Banner ----
    pageBanner: {
      flexDirection: isTablet ? 'row' : 'column',
      justifyContent: 'space-between',
      alignItems: isTablet ? 'center' : 'flex-start',
      paddingHorizontal: isMobile ? 16 : 24,
      paddingVertical: 20,
      marginBottom: 8,
      gap: 12,
    },
    bannerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: isTablet ? 1 : undefined,
    },
    bannerIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bannerTitle: {
      fontSize: isMobile ? 20 : 26,
      fontWeight: '800',
    },
    bannerSubtitle: {
      fontSize: 13,
      marginTop: 2,
    },
    createBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: ORANGE,
    },
    createBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },

    // ---- Section Header ----
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionIconBadge: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: '#10B981' + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    sectionSubtitle: {
      fontSize: 13,
      marginTop: 4,
    },
    viewAllButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    viewAllText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

    // Stats Section
    statsSection: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: isMobile ? 16 : 24,
      gap: isMobile ? 12 : 16,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      minWidth: isMobile ? '47%' : isLargeScreen ? 220 : isTablet ? 180 : 160,
      maxWidth: isLargeScreen ? 300 : undefined,
    },

    // Charts Section
    chartsSection: {
      flexDirection: isLargeScreen ? 'row' : 'column',
      paddingHorizontal: isMobile ? 16 : 24,
      gap: 16,
      marginBottom: 24,
    },
    chartCard: {
      flex: 1,
      minWidth: isLargeScreen ? 400 : undefined,
    },
    chartCardInner: {
      padding: isMobile ? 16 : 20,
    },
    chartHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    chartHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    chartIconBadge: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chartTitle: { fontSize: 16, fontWeight: '600' },
    chartSubtitle: { fontSize: 13, marginTop: 4 },

    // Quick Actions
    quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    quickAction: {
      flex: 1,
      minWidth: isMobile ? '45%' : 100,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
    },
    quickActionIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    quickActionText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

    // Table Styles
    tableCard: { padding: 0, overflow: 'hidden' },
    tableHeader: {
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: isMobile ? 12 : 16,
      borderBottomWidth: 1,
      backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.backgroundSecondary,
    },
    tableHeaderCell: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 14,
      paddingHorizontal: isMobile ? 12 : 16,
      alignItems: 'center',
    },
    tableCell: { fontSize: 14 },
    imageColumn: { width: isMobile ? 50 : 60, paddingRight: 12 },
    courseImage: { width: isMobile ? 40 : 48, height: isMobile ? 40 : 48, borderRadius: 8 },
    courseImagePlaceholder: {
      width: isMobile ? 40 : 48,
      height: isMobile ? 40 : 48,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    courseNameColumn: { flex: 2, paddingRight: 12 },
    categoryColumn: { flex: 1, paddingRight: 12 },
    statusColumn: { flex: 1, paddingRight: 12 },
    actionColumn: { width: isMobile ? 70 : 90, alignItems: 'flex-end' },
    courseName: { fontWeight: '500' },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 12, fontWeight: '600' },
    viewDetailsButton: {
      paddingHorizontal: isMobile ? 8 : 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
    },
    viewDetailsText: { fontSize: 12, fontWeight: '600' },
    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { marginTop: 12, fontSize: 14, textAlign: 'center' },
  });

export default ExpertDashboard;
