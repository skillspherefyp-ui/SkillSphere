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
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { certificateAPI } from '../../services/apiClient';
import { resolveFileUrl } from '../../utils/urlHelpers';

// UI Components
import MainLayout from '../../components/ui/MainLayout';
import PageTitleRow from '../../components/ui/PageTitleRow';
import AppCard from '../../components/ui/AppCard';
import Skeleton, { SkeletonDashboardStats, SkeletonTableRow } from '../../components/ui/Skeleton';

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
// CHART COMPONENTS (Matching Admin Style)
// ============================================

// Bar Chart Component
const BarChart = ({ data, theme, isDark, height = 200 }) => {
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
        <View style={[barChartStyles.barsContainer, { height }]}>
          {data.map((item, index) => {
            const barHeight = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            return (
              <View key={index} style={barChartStyles.barWrapper}>
                <View
                  style={[
                    barChartStyles.bar,
                    {
                      height: `${Math.max(barHeight, 2)}%`,
                      backgroundColor: item.color || '#6366F1',
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
  container: {
    flexDirection: 'row',
    paddingTop: 10,
  },
  yAxis: {
    width: 40,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  yLabel: {
    fontSize: 11,
  },
  chartArea: {
    flex: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    paddingHorizontal: 4,
  },
  bar: {
    width: '70%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  xLabel: {
    fontSize: 11,
    flex: 1,
    textAlign: 'center',
  },
});

// Line Chart Component
const LineChart = ({ data, theme, isDark, height = 200, lineColor = '#10B981' }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={lineChartStyles.container}>
      <View style={[lineChartStyles.yAxis, { height }]}>
        {[100, 75, 50, 25, 0].map((val, i) => {
          const value = Math.round((maxValue * val) / 100);
          return (
            <Text key={i} style={[lineChartStyles.yLabel, { color: theme.colors.textTertiary }]}>
              {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
            </Text>
          );
        })}
      </View>
      <View style={lineChartStyles.chartArea}>
        <View style={[lineChartStyles.chartContainer, { height }]}>
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((_, i) => (
            <View
              key={i}
              style={[
                lineChartStyles.gridLine,
                { top: (i * height) / 4, backgroundColor: 'rgba(255,255,255,0.05)' },
              ]}
            />
          ))}

          {/* Line segments */}
          {data.map((item, index) => {
            if (index === 0) return null;
            const prevItem = data[index - 1];
            const x1 = ((index - 1) / (data.length - 1)) * 100;
            const x2 = (index / (data.length - 1)) * 100;
            const y1 = maxValue > 0 ? ((maxValue - prevItem.value) / maxValue) * 100 : 100;
            const y2 = maxValue > 0 ? ((maxValue - item.value) / maxValue) * 100 : 100;

            const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

            return (
              <View
                key={`line-${index}`}
                style={[
                  lineChartStyles.lineSegment,
                  {
                    left: `${x1}%`,
                    top: `${y1}%`,
                    width: `${length}%`,
                    transform: [{ rotate: `${angle}deg` }],
                    backgroundColor: lineColor,
                  },
                ]}
              />
            );
          })}

          {/* Data points */}
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = maxValue > 0 ? ((maxValue - item.value) / maxValue) * 100 : 100;

            return (
              <View
                key={index}
                style={[
                  lineChartStyles.dot,
                  {
                    left: `${x}%`,
                    top: `${y}%`,
                    backgroundColor: lineColor,
                    shadowColor: lineColor,
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={lineChartStyles.xAxis}>
          {data.map((item, index) => (
            <Text key={index} style={[lineChartStyles.xLabel, { color: theme.colors.textTertiary }]}>
              {item.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

const lineChartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingTop: 10,
  },
  yAxis: {
    width: 45,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  yLabel: {
    fontSize: 11,
  },
  chartArea: {
    flex: 1,
  },
  chartContainer: {
    position: 'relative',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
    marginTop: -4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  xLabel: {
    fontSize: 11,
    flex: 1,
    textAlign: 'center',
  },
});

// Enhanced Stats Card Component (Matching Admin Style)
const DashboardStatCard = ({ icon, iconColor, value, label, change, theme, isDark, style }) => {
  const isPositive = change && change.startsWith('+');

  return (
    <View style={[dashboardStatStyles.card, { backgroundColor: isDark ? theme.colors.card : theme.colors.surface, borderColor: theme.colors.border }, style]}>
      <View style={dashboardStatStyles.header}>
        <Text style={[dashboardStatStyles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
        <View style={[dashboardStatStyles.iconContainer, { backgroundColor: iconColor + '15' }]}>
          <Icon name={icon} size={20} color={iconColor} />
        </View>
      </View>
      <Text style={[dashboardStatStyles.value, { color: theme.colors.textPrimary }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      {change && (
        <Text style={[dashboardStatStyles.change, { color: isPositive ? '#10B981' : '#EF4444' }]}>
          {change} from last month
        </Text>
      )}
    </View>
  );
};

const dashboardStatStyles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  change: {
    fontSize: 13,
    fontWeight: '500',
  },
});

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const {
    courses,
    enrollments,
    notifications,
    fetchCourses,
    fetchMyEnrollments,
    fetchMyNotifications,
    getLearningStats,
  } = useData();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;
  const isTablet = width > 768;
  const isMobile = width <= 480;

  // Student sidebar navigation items
  const sidebarItems = [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Browse Courses', icon: 'library-outline', iconActive: 'library', route: 'Courses' },
    { label: 'My Learning', icon: 'school-outline', iconActive: 'school', route: 'EnrolledCourses' },
    { label: 'AI Assistant', icon: 'sparkles-outline', iconActive: 'sparkles', route: 'AITutor' },
    { label: 'Certificates', icon: 'ribbon-outline', iconActive: 'ribbon', route: 'Certificates' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!initialLoading) {
        reloadData();
      }
    }, [initialLoading])
  );

  const loadData = async () => {
    try {
      await Promise.all([
        fetchCourses(),
        fetchMyEnrollments(),
        fetchMyNotifications(),
      ]);
      const statsResponse = await getLearningStats();
      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }
      try {
        const certResponse = await certificateAPI.getMyCertificates();
        if (certResponse.success) {
          setCertificates(certResponse.certificates || []);
        }
      } catch (e) {
        console.log('Could not fetch certificates:', e);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const reloadData = async () => {
    try {
      await Promise.all([
        fetchCourses(),
        fetchMyEnrollments(),
        fetchMyNotifications(),
      ]);
      const statsResponse = await getLearningStats();
      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }
      try {
        const certResponse = await certificateAPI.getMyCertificates();
        if (certResponse.success) {
          setCertificates(certResponse.certificates || []);
        }
      } catch (e) {
        console.log('Could not fetch certificates:', e);
      }
    } catch (error) {
      console.error('Error reloading data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleNavigate = (route) => {
    navigation.navigate(route);
  };

  // ============================================
  // DYNAMIC DATA CALCULATIONS
  // ============================================

  // Process enrolled courses
  const enrolledCourses = useMemo(() => {
    return enrollments.map((enrollment) => ({
      ...enrollment.course,
      progress: enrollment.progress,
      enrollmentStatus: enrollment.status,
      enrolledAt: enrollment.createdAt,
      lastAccessed: enrollment.updatedAt,
    }));
  }, [enrollments]);

  // Get courses in progress
  const coursesInProgress = useMemo(() => {
    return enrolledCourses
      .filter(c => c.progress < 100)
      .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
  }, [enrolledCourses]);

  // Get completed courses
  const completedCourses = useMemo(() => {
    return enrolledCourses.filter(c => c.progress >= 100);
  }, [enrolledCourses]);

  // Calculate statistics with percentage changes
  const dashboardStats = useMemo(() => {
    const totalEnrolled = enrollments.length;
    const inProgress = coursesInProgress.length;
    const completed = completedCourses.length;
    const totalCertificates = certificates.length;

    // Calculate last month's data for percentage change
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const enrolledLastMonth = enrollments.filter(e => {
      const created = new Date(e.createdAt);
      return created < thisMonth;
    }).length;

    const completedLastMonth = enrollments.filter(e => {
      const created = new Date(e.createdAt);
      return e.progress >= 100 && created < thisMonth;
    }).length;

    return {
      totalEnrolled,
      inProgress,
      completed,
      totalCertificates,
      enrolledChange: calculatePercentageChange(totalEnrolled, enrolledLastMonth),
      completedChange: calculatePercentageChange(completed, completedLastMonth),
    };
  }, [enrollments, coursesInProgress, completedCourses, certificates]);

  // Build enrollment growth chart data
  const enrollmentGrowthData = useMemo(() => {
    const last6Months = getLast6Months();
    const colors = ['#6366F1', '#6366F1', '#818CF8', '#818CF8', '#A78BFA', '#C4B5FD'];

    return last6Months.map((monthData, index) => {
      const enrollmentsUpToMonth = enrollments.filter(enrollment => {
        const createdDate = new Date(enrollment.createdAt);
        return (
          createdDate.getFullYear() < monthData.year ||
          (createdDate.getFullYear() === monthData.year && createdDate.getMonth() <= monthData.monthIndex)
        );
      }).length;

      return {
        label: monthData.month,
        value: enrollmentsUpToMonth,
        color: colors[index],
      };
    });
  }, [enrollments]);

  // Build completion trend chart data
  const completionTrendData = useMemo(() => {
    const last6Months = getLast6Months();

    return last6Months.map((monthData) => {
      const completedUpToMonth = enrollments.filter(enrollment => {
        const createdDate = new Date(enrollment.createdAt);
        return (
          enrollment.progress >= 100 &&
          (createdDate.getFullYear() < monthData.year ||
            (createdDate.getFullYear() === monthData.year && createdDate.getMonth() <= monthData.monthIndex))
        );
      }).length;

      return {
        label: monthData.month,
        value: completedUpToMonth,
      };
    });
  }, [enrollments]);

  // Get recent/active courses for table
  const recentCoursesData = useMemo(() => {
    return enrolledCourses
      .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed))
      .slice(0, 4);
  }, [enrolledCourses]);

  // Get recommended courses (not enrolled)
  const recommendedCourses = useMemo(() => {
    return courses
      .filter((c) => c.status === 'published' && !enrolledCourses.find(e => e.id === c.id))
      .slice(0, 6);
  }, [courses, enrolledCourses]);

  const unreadNotifications = notifications.filter((n) => !n.isRead).length;

  const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile);

  // Loading skeleton
  if (initialLoading) {
    return (
      <MainLayout
        showSidebar={true}
        sidebarItems={sidebarItems}
        activeRoute="Dashboard"
        onNavigate={handleNavigate}
        userInfo={{ name: user?.name, role: 'Student', avatar: user?.avatar }}
        onLogout={logout}
        onSettings={() => navigation.navigate('Settings')}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <PageTitleRow title="My Dashboard" subtitle="Welcome back! Here's your learning overview." />
          <View style={styles.section}>
            <SkeletonDashboardStats count={4} />
          </View>
          <View style={styles.section}>
            <View style={styles.chartsSection}>
              <AppCard style={styles.chartCardInner}>
                <Skeleton width="60%" height={20} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={200} />
              </AppCard>
            </View>
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
      userInfo={{ name: user?.name, role: 'Student', avatar: user?.avatar }}
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
        {/* Page Title Row */}
        <PageTitleRow
          title="My Dashboard"
          subtitle={`Welcome back, ${user?.name || 'Student'}! Here's your learning overview.`}
          primaryAction={{
            label: 'Browse Courses',
            icon: 'library-outline',
            onPress: () => navigation.navigate('Courses'),
          }}
        />

        {/* Stats Section - Matching Admin Style */}
        <View style={styles.statsSection}>
          <DashboardStatCard
            icon="school-outline"
            iconColor="#6366F1"
            value={dashboardStats.totalEnrolled}
            label="Enrolled Courses"
            change={dashboardStats.enrolledChange}
            theme={theme}
            isDark={isDark}
            style={styles.statCard}
          />
          <DashboardStatCard
            icon="time-outline"
            iconColor="#F59E0B"
            value={dashboardStats.inProgress}
            label="In Progress"
            theme={theme}
            isDark={isDark}
            style={styles.statCard}
          />
          <DashboardStatCard
            icon="checkmark-circle-outline"
            iconColor="#10B981"
            value={dashboardStats.completed}
            label="Completed"
            change={dashboardStats.completedChange}
            theme={theme}
            isDark={isDark}
            style={styles.statCard}
          />
          <DashboardStatCard
            icon="ribbon-outline"
            iconColor="#8B5CF6"
            value={dashboardStats.totalCertificates}
            label="Certificates"
            theme={theme}
            isDark={isDark}
            style={styles.statCard}
          />
        </View>

        {/* Charts Section - Matching Admin Style */}
        <View style={styles.chartsSection}>
          {/* Enrollment Growth Chart */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={styles.chartCard}
          >
            <AppCard style={styles.chartCardInner}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
                    Enrollment Growth
                  </Text>
                  <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
                    Your course enrollments over time
                  </Text>
                </View>
                <Icon name="trending-up" size={20} color="#10B981" />
              </View>
              <BarChart
                data={enrollmentGrowthData}
                theme={theme}
                isDark={isDark}
                height={isMobile ? 160 : 200}
              />
            </AppCard>
          </Animated.View>

          {/* Completion Trend Chart */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(200)}
            style={styles.chartCard}
          >
            <AppCard style={styles.chartCardInner}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
                    Completion Trend
                  </Text>
                  <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
                    Courses completed over time
                  </Text>
                </View>
                <Icon name="trophy" size={20} color="#F59E0B" />
              </View>
              <LineChart
                data={completionTrendData}
                theme={theme}
                isDark={isDark}
                height={isMobile ? 160 : 200}
                lineColor="#10B981"
              />
            </AppCard>
          </Animated.View>
        </View>

        {/* My Courses Table - Matching Admin Recent Courses Style */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                My Courses
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                Your enrolled courses and progress
              </Text>
            </View>
            {enrolledCourses.length > 0 && (
              <TouchableOpacity
                style={[styles.viewAllButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('EnrolledCourses')}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
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
              {(isLargeScreen || isTablet) && (
                <Text style={[styles.tableHeaderCell, styles.progressColumn, { color: theme.colors.textSecondary }]}>
                  Progress
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
            {recentCoursesData.length > 0 ? (
              recentCoursesData.map((course, index) => (
                <View
                  key={course.id || index}
                  style={[
                    styles.tableRow,
                    index < recentCoursesData.length - 1 && {
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
                        <Icon name="image-outline" size={20} color={theme.colors.primary} />
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

                  {/* Progress Bar */}
                  {(isLargeScreen || isTablet) && (
                    <View style={[styles.tableCell, styles.progressColumn]}>
                      <View style={styles.progressContainer}>
                        <View style={[styles.progressBarBg, { backgroundColor: theme.colors.border }]}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${course.progress || 0}%`,
                                backgroundColor: course.progress >= 100 ? '#10B981' : '#6366F1',
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
                          {course.progress || 0}%
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Status */}
                  <View style={[styles.tableCell, styles.statusColumn]}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: course.progress >= 100 ? '#10B98120' : '#F59E0B20',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: course.progress >= 100 ? '#10B981' : '#F59E0B',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: course.progress >= 100 ? '#10B981' : '#F59E0B',
                          },
                        ]}
                      >
                        {course.progress >= 100 ? 'Completed' : 'In Progress'}
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
                        {course.progress >= 100 ? 'Review' : 'Continue'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="school-outline" size={40} color={theme.colors.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No courses yet. Start your learning journey!
                </Text>
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => navigation.navigate('Courses')}
                >
                  <Text style={styles.emptyButtonText}>Browse Courses</Text>
                </TouchableOpacity>
              </View>
            )}
          </AppCard>
        </View>

        {/* Quick Actions - Compact Version */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, marginBottom: 16 }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: isDark ? theme.colors.card : theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('Courses')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                <Icon name="library" size={22} color={theme.colors.primary} />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>
                Browse
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: isDark ? theme.colors.card : theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('EnrolledCourses')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#10B981' + '15' }]}>
                <Icon name="school" size={22} color="#10B981" />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>
                My Learning
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: isDark ? theme.colors.card : theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('AITutor')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
                <Icon name="sparkles" size={22} color="#8B5CF6" />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>
                AI Tutor
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: isDark ? theme.colors.card : theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('Certificates')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#F59E0B' + '15' }]}>
                <Icon name="ribbon" size={22} color="#F59E0B" />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>
                Certificates
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: isDark ? theme.colors.card : theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('Notifications')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#EF4444' + '15' }]}>
                <Icon name="notifications" size={22} color="#EF4444" />
                {unreadNotifications > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>{unreadNotifications}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>
                Alerts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: isDark ? theme.colors.card : theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('Settings')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#64748B' + '15' }]}>
                <Icon name="settings" size={22} color="#64748B" />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>
                Settings
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Recommended Courses - Horizontal Scroll */}
        {recommendedCourses.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Recommended For You
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                  Courses you might like
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.viewAllButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('Courses')}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {recommendedCourses.map((course) => (
                <TouchableOpacity
                  key={course.id}
                  style={[styles.recommendedCard, { backgroundColor: isDark ? theme.colors.card : theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
                >
                  {course.thumbnailImage ? (
                    <Image
                      source={{ uri: resolveFileUrl(course.thumbnailImage) }}
                      style={styles.recommendedImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.recommendedImagePlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Icon name="image-outline" size={32} color={theme.colors.primary} />
                    </View>
                  )}
                  <View style={styles.recommendedContent}>
                    <Text style={[styles.recommendedCategory, { color: theme.colors.primary }]}>
                      {course.category?.name || 'Course'}
                    </Text>
                    <Text style={[styles.recommendedTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                      {course.name}
                    </Text>
                    <View style={styles.recommendedMeta}>
                      <View style={styles.recommendedMetaItem}>
                        <Icon name="layers-outline" size={14} color={theme.colors.textTertiary} />
                        <Text style={[styles.recommendedMetaText, { color: theme.colors.textTertiary }]}>
                          {course.topics?.length || 0} topics
                        </Text>
                      </View>
                      <View style={styles.recommendedMetaItem}>
                        <Icon name="speedometer-outline" size={14} color={theme.colors.textTertiary} />
                        <Text style={[styles.recommendedMetaText, { color: theme.colors.textTertiary }]}>
                          {course.level || 'All Levels'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
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
      paddingBottom: 40,
    },
    section: {
      paddingHorizontal: isMobile ? 16 : 24,
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
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
    viewAllText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
    },

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
    chartTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    chartSubtitle: {
      fontSize: 13,
      marginTop: 4,
    },

    // Table Styles
    tableCard: {
      padding: 0,
      overflow: 'hidden',
    },
    tableHeader: {
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: isMobile ? 12 : 16,
      borderBottomWidth: 1,
      backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.backgroundSecondary,
    },
    tableHeaderCell: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 14,
      paddingHorizontal: isMobile ? 12 : 16,
      alignItems: 'center',
    },
    tableCell: {
      fontSize: 14,
    },
    imageColumn: {
      width: isMobile ? 50 : 60,
      paddingRight: 12,
    },
    courseImage: {
      width: isMobile ? 40 : 48,
      height: isMobile ? 40 : 48,
      borderRadius: 8,
    },
    courseImagePlaceholder: {
      width: isMobile ? 40 : 48,
      height: isMobile ? 40 : 48,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    courseNameColumn: {
      flex: 2,
      paddingRight: 12,
    },
    categoryColumn: {
      flex: 1,
      paddingRight: 12,
    },
    progressColumn: {
      width: 120,
      paddingRight: 12,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    progressBarBg: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    progressText: {
      fontSize: 12,
      fontWeight: '500',
      width: 35,
      textAlign: 'right',
    },
    statusColumn: {
      flex: 1,
      paddingRight: 12,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    actionColumn: {
      width: isMobile ? 80 : 100,
      alignItems: 'flex-end',
    },
    courseName: {
      fontWeight: '500',
    },
    viewDetailsButton: {
      paddingHorizontal: isMobile ? 8 : 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
    },
    viewDetailsText: {
      fontSize: 12,
      fontWeight: '600',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyText: {
      marginTop: 12,
      marginBottom: 16,
      fontSize: 14,
      textAlign: 'center',
    },
    emptyButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    emptyButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },

    // Quick Actions
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    quickAction: {
      flex: 1,
      minWidth: isMobile ? '30%' : 100,
      maxWidth: isMobile ? '32%' : 140,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      ...theme.shadows.sm,
    },
    quickActionIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
      position: 'relative',
    },
    quickActionText: {
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    notificationBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: '#EF4444',
      width: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
    },
    notificationBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
    },

    // Recommended Courses
    horizontalScrollContent: {
      paddingRight: 24,
      gap: 16,
    },
    recommendedCard: {
      width: 280,
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden',
    },
    recommendedImage: {
      width: '100%',
      height: 140,
    },
    recommendedImagePlaceholder: {
      width: '100%',
      height: 140,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recommendedContent: {
      padding: 14,
    },
    recommendedCategory: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    recommendedTitle: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 10,
      lineHeight: 20,
    },
    recommendedMeta: {
      flexDirection: 'row',
      gap: 16,
    },
    recommendedMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    recommendedMetaText: {
      fontSize: 12,
    },
  });

export default StudentDashboard;
