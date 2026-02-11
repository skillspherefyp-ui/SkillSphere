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

// UI Components
import MainLayout from '../../components/ui/MainLayout';
import PageTitleRow from '../../components/ui/PageTitleRow';
import AppCard from '../../components/ui/AppCard';
import AppButton from '../../components/ui/AppButton';
import StatusBadge from '../../components/ui/StatusBadge';
import Skeleton, { SkeletonDashboardStats, SkeletonTableRow } from '../../components/ui/Skeleton';
import { resolveFileUrl } from '../../utils/urlHelpers';

// ============================================
// UTILITY FUNCTIONS FOR DATA PROCESSING
// ============================================

// Get month name from date
const getMonthName = (date) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[new Date(date).getMonth()];
};

// Get last 6 months
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

// Calculate percentage change
const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const change = ((current - previous) / previous) * 100;
  return change >= 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;
};

// ============================================
// CUSTOM CHART COMPONENTS (No external deps)
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
const LineChart = ({ data, theme, isDark, height = 200 }) => {
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
                    backgroundColor: '#22D3EE',
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
                    backgroundColor: '#22D3EE',
                    shadowColor: '#22D3EE',
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

// Enhanced Stats Card Component
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

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const {
    courses,
    students,
    experts,
    enrollments,
    fetchStudents,
    fetchCourses,
    fetchExperts,
  } = useData();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;
  const isTablet = width > 768;
  const isMobile = width <= 480;

  // Admin sidebar navigation items
  const sidebarItems = [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Skill Categories', icon: 'layers-outline', iconActive: 'layers', route: 'CategoryManagement' },
    { label: 'Manage Courses', icon: 'book-outline', iconActive: 'book', route: 'Courses' },
    { label: 'Students', icon: 'people-outline', iconActive: 'people', route: 'Students' },
    { label: 'Certificates', icon: 'ribbon-outline', iconActive: 'ribbon', route: 'CertificateManagement' },
    { label: 'Expert Feedback', icon: 'chatbubbles-outline', iconActive: 'chatbubbles', route: 'Feedback' },
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
        fetchStudents(),
        fetchExperts(),
      ]);
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
        fetchStudents(),
        fetchExperts(),
      ]);
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

  // Calculate statistics from real data
  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const totalStudents = students.length;
    const activeExperts = experts?.length || 0;
    const publishedCourses = courses.filter((c) => c.status === 'published').length;

    // Calculate last month's data for percentage change
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const coursesLastMonth = courses.filter(c => {
      const created = new Date(c.createdAt);
      return created < thisMonth;
    }).length;

    const studentsLastMonth = students.filter(s => {
      const created = new Date(s.createdAt);
      return created < thisMonth;
    }).length;

    const publishedLastMonth = courses.filter(c => {
      const created = new Date(c.createdAt);
      return c.status === 'published' && created < thisMonth;
    }).length;

    return {
      totalCourses,
      totalStudents,
      activeExperts,
      publishedCourses,
      courseChange: calculatePercentageChange(totalCourses, coursesLastMonth),
      studentChange: calculatePercentageChange(totalStudents, studentsLastMonth),
      expertChange: '+8%', // Static for now as we don't track expert history
      publishedChange: calculatePercentageChange(publishedCourses, publishedLastMonth),
    };
  }, [courses, students, experts]);

  // Build course growth chart data from real data
  const courseGrowthData = useMemo(() => {
    const last6Months = getLast6Months();
    const colors = ['#6366F1', '#6366F1', '#818CF8', '#818CF8', '#A78BFA', '#C4B5FD'];

    return last6Months.map((monthData, index) => {
      // Count courses created up to this month
      const coursesUpToMonth = courses.filter(course => {
        const createdDate = new Date(course.createdAt);
        return (
          createdDate.getFullYear() < monthData.year ||
          (createdDate.getFullYear() === monthData.year && createdDate.getMonth() <= monthData.monthIndex)
        );
      }).length;

      return {
        label: monthData.month,
        value: coursesUpToMonth,
        color: colors[index],
      };
    });
  }, [courses]);

  // Build student enrollment chart data from real data
  const studentEnrollmentData = useMemo(() => {
    const last6Months = getLast6Months();

    return last6Months.map((monthData) => {
      // Count students registered up to this month
      const studentsUpToMonth = students.filter(student => {
        const createdDate = new Date(student.createdAt);
        return (
          createdDate.getFullYear() < monthData.year ||
          (createdDate.getFullYear() === monthData.year && createdDate.getMonth() <= monthData.monthIndex)
        );
      }).length;

      return {
        label: monthData.month,
        value: studentsUpToMonth,
      };
    });
  }, [students]);

  // Get recent courses with enrollment counts and ratings
  const recentCoursesData = useMemo(() => {
    return courses
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 4)
      .map((course) => {
        // Count enrollments for this course
        const courseEnrollments = students.reduce((count, student) => {
          const enrolled = student.enrollments?.some(e => e.courseId === course.id);
          return enrolled ? count + 1 : count;
        }, 0);

        // Calculate average rating from feedback/reviews if available
        const rating = course.averageRating || course.rating || null;

        return {
          ...course,
          studentCount: courseEnrollments || course.enrollmentCount || 0,
          rating: course.status === 'published' ? rating : null,
        };
      });
  }, [courses, students]);

  const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile);

  // Loading skeleton
  if (initialLoading) {
    return (
      <MainLayout
        showSidebar={true}
        sidebarItems={sidebarItems}
        activeRoute="Dashboard"
        onNavigate={handleNavigate}
        userInfo={{ name: user?.name, role: 'Administrator', avatar: user?.avatar }}
        onLogout={logout}
        onSettings={() => navigation.navigate('Settings')}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <PageTitleRow title="Admin Dashboard" subtitle="Welcome back! Here's your platform overview." />
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
      userInfo={{ name: user?.name, role: 'Administrator', avatar: user?.avatar }}
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
          title="Admin Dashboard"
          subtitle="Welcome back! Here's your platform overview."
          primaryAction={{
            label: 'Create New Course',
            icon: 'add',
            onPress: () => navigation.navigate('CreateCourse'),
          }}
        />

        {/* Stats Section - Dynamic Data */}
        <View style={styles.statsSection}>
          <DashboardStatCard
            icon="book-outline"
            iconColor="#6366F1"
            value={stats.totalCourses}
            label="Total Courses"
            change={stats.courseChange}
            theme={theme}
            isDark={isDark}
            style={styles.statCard}
          />
          <DashboardStatCard
            icon="people-outline"
            iconColor="#8B5CF6"
            value={stats.totalStudents}
            label="Total Students"
            change={stats.studentChange}
            theme={theme}
            isDark={isDark}
            style={styles.statCard}
          />
          <DashboardStatCard
            icon="shield-checkmark-outline"
            iconColor="#10B981"
            value={stats.activeExperts}
            label="Active Experts"
            change={stats.expertChange}
            theme={theme}
            isDark={isDark}
            style={styles.statCard}
          />
          <DashboardStatCard
            icon="checkmark-circle-outline"
            iconColor="#22D3EE"
            value={stats.publishedCourses}
            label="Published Courses"
            change={stats.publishedChange}
            theme={theme}
            isDark={isDark}
            style={styles.statCard}
          />
        </View>

        {/* Charts Section - Dynamic Data */}
        <View style={styles.chartsSection}>
          {/* Course Growth Chart */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={styles.chartCard}
          >
            <AppCard style={styles.chartCardInner}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
                    Course Growth
                  </Text>
                  <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
                    Total courses created over time
                  </Text>
                </View>
                <Icon name="trending-up" size={20} color="#10B981" />
              </View>
              <BarChart
                data={courseGrowthData}
                theme={theme}
                isDark={isDark}
                height={isMobile ? 160 : 200}
              />
            </AppCard>
          </Animated.View>

          {/* Student Enrollment Chart */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(200)}
            style={styles.chartCard}
          >
            <AppCard style={styles.chartCardInner}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
                    Student Enrollment
                  </Text>
                  <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
                    Active student count growth
                  </Text>
                </View>
                <Icon name="trending-up" size={20} color="#10B981" />
              </View>
              <LineChart
                data={studentEnrollmentData}
                theme={theme}
                isDark={isDark}
                height={isMobile ? 160 : 200}
              />
            </AppCard>
          </Animated.View>
        </View>

        {/* Recent Courses Table - Dynamic Data */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Recent Courses
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                Latest course activity
              </Text>
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
              {(isLargeScreen || isTablet) && (
                <Text style={[styles.tableHeaderCell, styles.studentsColumn, { color: theme.colors.textSecondary }]}>
                  Students
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

                  {/* Students Enrolled */}
                  {(isLargeScreen || isTablet) && (
                    <View style={[styles.tableCell, styles.studentsColumn, styles.studentsContainer]}>
                      <Icon name="people" size={14} color={theme.colors.textSecondary} />
                      <Text style={[styles.studentsText, { color: theme.colors.textPrimary }]}>
                        {course.studentCount > 0 ? course.studentCount.toLocaleString() : '0'}
                      </Text>
                    </View>
                  )}

                  {/* Status */}
                  <View style={[styles.tableCell, styles.statusColumn]}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: course.status === 'published' ? '#10B98120' : '#EF444420',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: course.status === 'published' ? '#10B981' : '#EF4444',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: course.status === 'published' ? '#10B981' : '#EF4444',
                          },
                        ]}
                      >
                        {course.status === 'published' ? 'Published' : 'Not Published'}
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
                        View Details
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="book-outline" size={40} color={theme.colors.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No courses yet. Create your first course!
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
    statusColumn: {
      flex: 1,
      paddingRight: 12,
    },
    studentsColumn: {
      width: 80,
      textAlign: 'center',
    },
    studentsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    studentsText: {
      fontSize: 14,
      fontWeight: '500',
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
      fontSize: 14,
      textAlign: 'center',
    },
  });

export default AdminDashboard;
