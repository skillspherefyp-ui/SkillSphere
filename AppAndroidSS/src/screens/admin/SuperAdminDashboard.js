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
import PageTitleRow from '../../components/ui/PageTitleRow';
import AppCard from '../../components/ui/AppCard';
import StatusBadge from '../../components/ui/StatusBadge';
import Skeleton, { SkeletonDashboardStats, SkeletonTableRow } from '../../components/ui/Skeleton';
import { adminAPI } from '../../services/apiClient';

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
  container: { flexDirection: 'row', paddingTop: 10 },
  yAxis: { width: 35, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 8 },
  yLabel: { fontSize: 10 },
  chartArea: { flex: 1 },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
  },
  barWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', paddingHorizontal: 4 },
  bar: { width: '65%', borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 4 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, paddingHorizontal: 8 },
  xLabel: { fontSize: 10, flex: 1, textAlign: 'center' },
});

// ============================================
// LINE CHART COMPONENT
// ============================================

const LineChart = ({ data, theme, isDark, height = 180 }) => {
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
          {[0, 1, 2, 3, 4].map((_, i) => (
            <View
              key={i}
              style={[
                lineChartStyles.gridLine,
                { top: (i * height) / 4, backgroundColor: 'rgba(255,255,255,0.05)' },
              ]}
            />
          ))}
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
                    backgroundColor: '#8B5CF6',
                  },
                ]}
              />
            );
          })}
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
                    backgroundColor: '#8B5CF6',
                    shadowColor: '#8B5CF6',
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
  container: { flexDirection: 'row', paddingTop: 10 },
  yAxis: { width: 40, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 8 },
  yLabel: { fontSize: 10 },
  chartArea: { flex: 1 },
  chartContainer: { position: 'relative', borderLeftWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1 },
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
  lineSegment: { position: 'absolute', height: 2, transformOrigin: 'left center' },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  xLabel: { fontSize: 10, flex: 1, textAlign: 'center' },
});

// ============================================
// DASHBOARD STAT CARD COMPONENT
// ============================================

const DashboardStatCard = ({ icon, iconColor, value, label, change, theme, isDark, style }) => {
  const isPositive = change && change.startsWith('+');

  return (
    <View style={[statCardStyles.card, { backgroundColor: isDark ? theme.colors.card : theme.colors.surface, borderColor: theme.colors.border }, style]}>
      <View style={statCardStyles.header}>
        <Text style={[statCardStyles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
        <View style={[statCardStyles.iconContainer, { backgroundColor: iconColor + '15' }]}>
          <Icon name={icon} size={20} color={iconColor} />
        </View>
      </View>
      <Text style={[statCardStyles.value, { color: theme.colors.textPrimary }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      {change && (
        <Text style={[statCardStyles.change, { color: isPositive ? '#10B981' : '#EF4444' }]}>
          {change} from last month
        </Text>
      )}
    </View>
  );
};

const statCardStyles = StyleSheet.create({
  card: { padding: 20, borderRadius: 16, borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '500' },
  iconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  value: { fontSize: 32, fontWeight: '700', marginBottom: 4 },
  change: { fontSize: 13, fontWeight: '500' },
});

// ============================================
// MAIN COMPONENT
// ============================================

const SuperAdminDashboard = () => {
  const { user, logout } = useAuth();
  const { courses, students, experts, fetchCourses, fetchStudents, fetchExperts } = useData();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [admins, setAdmins] = useState([]);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;
  const isTablet = width > 768;
  const isMobile = width <= 480;

  const sidebarItems = [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Manage Admins', icon: 'person-outline', iconActive: 'person', route: 'ManageAdmins' },
    { label: 'Manage Experts', icon: 'people-outline', iconActive: 'people', route: 'ManageExperts' },
    { label: 'All Courses', icon: 'book-outline', iconActive: 'book', route: 'Courses' },
    { label: 'All Students', icon: 'school-outline', iconActive: 'school', route: 'Students' },
    { label: 'Categories', icon: 'layers-outline', iconActive: 'layers', route: 'Categories' },
    { label: 'Certificates', icon: 'ribbon-outline', iconActive: 'ribbon', route: 'CertificateManagement' },
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
      await Promise.all([fetchCourses(), fetchStudents(), fetchExperts()]);
      // Fetch admins (filter to only role === 'admin')
      try {
        const adminRes = await adminAPI.getAll();
        if (adminRes.success && adminRes.users) {
          const onlyAdmins = adminRes.users.filter(u => u.role === 'admin');
          setAdmins(onlyAdmins);
        }
      } catch (e) {
        console.log('Could not fetch admins:', e);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const reloadData = async () => {
    try {
      await Promise.all([fetchCourses(), fetchStudents(), fetchExperts()]);
      // Refresh admins (filter to only role === 'admin')
      try {
        const adminRes = await adminAPI.getAll();
        if (adminRes.success && adminRes.users) {
          const onlyAdmins = adminRes.users.filter(u => u.role === 'admin');
          setAdmins(onlyAdmins);
        }
      } catch (e) {
        console.log('Could not refresh admins:', e);
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
    if (route === 'ManageAdmins') {
      navigation.navigate('ManageUsers', { userType: 'admin' });
    } else if (route === 'ManageExperts') {
      navigation.navigate('ManageUsers', { userType: 'expert' });
    } else if (route === 'Categories') {
      navigation.navigate('CategoryManagement');
    } else {
      navigation.navigate(route);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const studentsLastMonth = students.filter(s => new Date(s.createdAt) < thisMonth).length;
    const coursesLastMonth = courses.filter(c => new Date(c.createdAt) < thisMonth).length;

    return {
      totalAdmins: admins.length,
      totalExperts: experts?.length || 0,
      totalCourses: courses.length,
      totalStudents: students.length,
      publishedCourses: courses.filter(c => c.status === 'published').length,
      activeStudents: students.filter(s => s.isActive !== false).length,
      adminChange: '+2',
      expertChange: '+5%',
      courseChange: calculatePercentageChange(courses.length, coursesLastMonth),
      studentChange: calculatePercentageChange(students.length, studentsLastMonth),
    };
  }, [courses, students, experts, admins]);

  // Build user growth chart data
  const userGrowthData = useMemo(() => {
    const last6Months = getLast6Months();
    const colors = ['#6366F1', '#6366F1', '#818CF8', '#818CF8', '#A78BFA', '#C4B5FD'];

    return last6Months.map((monthData, index) => {
      const usersUpToMonth = students.filter(student => {
        const createdDate = new Date(student.createdAt);
        return (
          createdDate.getFullYear() < monthData.year ||
          (createdDate.getFullYear() === monthData.year && createdDate.getMonth() <= monthData.monthIndex)
        );
      }).length;

      return {
        label: monthData.month,
        value: usersUpToMonth,
        color: colors[index],
      };
    });
  }, [students]);

  // Build course growth chart data
  const courseGrowthData = useMemo(() => {
    const last6Months = getLast6Months();

    return last6Months.map((monthData) => {
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
      };
    });
  }, [courses]);

  const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile);

  if (initialLoading) {
    return (
      <MainLayout
        showSidebar={true}
        sidebarItems={sidebarItems}
        activeRoute="Dashboard"
        onNavigate={handleNavigate}
        userInfo={{ name: user?.name, role: 'Super Admin', avatar: user?.avatar }}
        onLogout={logout}
        onSettings={() => navigation.navigate('Settings')}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <PageTitleRow title="Super Admin Dashboard" subtitle="System-wide management and overview" />
          <View style={styles.section}>
            <SkeletonDashboardStats count={4} />
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
      userInfo={{ name: user?.name, role: 'Super Admin', avatar: user?.avatar }}
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
        <PageTitleRow
          title="Super Admin Dashboard"
          subtitle="Welcome back! You have full system control."
          primaryAction={{
            label: 'Add Admin',
            icon: 'person-add',
            onPress: () => navigation.navigate('ManageUsers', { userType: 'admin' }),
          }}
        />

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <DashboardStatCard
            icon="person-outline"
            iconColor="#6366F1"
            value={stats.totalAdmins}
            label="Total Admins"
            change={stats.adminChange}
            theme={theme}
            isDark={isDark}
            style={styles.statCard}
          />
          <DashboardStatCard
            icon="shield-checkmark-outline"
            iconColor="#8B5CF6"
            value={stats.totalExperts}
            label="Total Experts"
            change={stats.expertChange}
            theme={theme}
            isDark={isDark}
            style={styles.statCard}
          />
          <DashboardStatCard
            icon="book-outline"
            iconColor="#10B981"
            value={stats.totalCourses}
            label="Total Courses"
            change={stats.courseChange}
            theme={theme}
            isDark={isDark}
            style={styles.statCard}
          />
          <DashboardStatCard
            icon="school-outline"
            iconColor="#22D3EE"
            value={stats.totalStudents}
            label="Total Students"
            change={stats.studentChange}
            theme={theme}
            isDark={isDark}
            style={styles.statCard}
          />
        </View>

        {/* Charts Section */}
        <View style={styles.chartsSection}>
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.chartCard}>
            <AppCard style={styles.chartCardInner}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
                    User Growth
                  </Text>
                  <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
                    Total registered users over time
                  </Text>
                </View>
                <Icon name="trending-up" size={20} color="#10B981" />
              </View>
              <BarChart
                data={userGrowthData}
                theme={theme}
                isDark={isDark}
                height={isMobile ? 140 : 180}
              />
            </AppCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.chartCard}>
            <AppCard style={styles.chartCardInner}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
                    Course Growth
                  </Text>
                  <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
                    Total courses on platform
                  </Text>
                </View>
                <Icon name="trending-up" size={20} color="#10B981" />
              </View>
              <LineChart
                data={courseGrowthData}
                theme={theme}
                isDark={isDark}
                height={isMobile ? 140 : 180}
              />
            </AppCard>
          </Animated.View>
        </View>

        {/* Admins Table */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: '#6366F115' }]}>
                <Icon name="person" size={18} color="#6366F1" />
              </View>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Administrators
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                  {admins.length} total admins
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.manageButton, { borderColor: '#6366F1' }]}
              onPress={() => navigation.navigate('ManageUsers', { userType: 'admin' })}
            >
              <Text style={[styles.manageButtonText, { color: '#6366F1' }]}>Manage</Text>
              <Icon name="chevron-forward" size={14} color="#6366F1" />
            </TouchableOpacity>
          </View>

          <AppCard style={styles.tableCard}>
            {admins.length > 0 ? (
              admins.slice(0, 5).map((admin, index) => (
                <View
                  key={admin.id || index}
                  style={[
                    styles.tableRow,
                    index < Math.min(admins.length, 5) - 1 && {
                      borderBottomColor: theme.colors.border,
                      borderBottomWidth: 1,
                    },
                  ]}
                >
                  <View style={styles.userRowLeft}>
                    <View style={[styles.userAvatar, { backgroundColor: '#6366F1' }]}>
                      <Text style={styles.userAvatarText}>
                        {admin.name?.charAt(0)?.toUpperCase() || 'A'}
                      </Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={[styles.userName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {admin.name || 'Unknown'}
                      </Text>
                      <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {admin.email || '-'}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: admin.isActive !== false ? '#10B98115' : '#EF444415' },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: admin.isActive !== false ? '#10B981' : '#EF4444' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: admin.isActive !== false ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {admin.isActive !== false ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No admins found
                </Text>
              </View>
            )}
          </AppCard>
        </View>

        {/* Experts Table */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: '#8B5CF615' }]}>
                <Icon name="shield-checkmark" size={18} color="#8B5CF6" />
              </View>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Experts
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                  {experts?.length || 0} total experts
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.manageButton, { borderColor: '#8B5CF6' }]}
              onPress={() => navigation.navigate('ManageUsers', { userType: 'expert' })}
            >
              <Text style={[styles.manageButtonText, { color: '#8B5CF6' }]}>Manage</Text>
              <Icon name="chevron-forward" size={14} color="#8B5CF6" />
            </TouchableOpacity>
          </View>

          <AppCard style={styles.tableCard}>
            {experts && experts.length > 0 ? (
              experts.slice(0, 5).map((expert, index) => (
                <View
                  key={expert.id || index}
                  style={[
                    styles.tableRow,
                    index < Math.min(experts.length, 5) - 1 && {
                      borderBottomColor: theme.colors.border,
                      borderBottomWidth: 1,
                    },
                  ]}
                >
                  <View style={styles.userRowLeft}>
                    <View style={[styles.userAvatar, { backgroundColor: '#8B5CF6' }]}>
                      <Text style={styles.userAvatarText}>
                        {expert.name?.charAt(0)?.toUpperCase() || 'E'}
                      </Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={[styles.userName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {expert.name || 'Unknown'}
                      </Text>
                      <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {expert.email || '-'}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: expert.isActive !== false ? '#10B98115' : '#EF444415' },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: expert.isActive !== false ? '#10B981' : '#EF4444' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: expert.isActive !== false ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {expert.isActive !== false ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No experts found
                </Text>
              </View>
            )}
          </AppCard>
        </View>

        {/* Students Table */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: '#22D3EE15' }]}>
                <Icon name="school" size={18} color="#22D3EE" />
              </View>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Students
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                  {students.length} total students
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.manageButton, { borderColor: '#22D3EE' }]}
              onPress={() => navigation.navigate('Students')}
            >
              <Text style={[styles.manageButtonText, { color: '#22D3EE' }]}>View All</Text>
              <Icon name="chevron-forward" size={14} color="#22D3EE" />
            </TouchableOpacity>
          </View>

          <AppCard style={styles.tableCard}>
            {students.length > 0 ? (
              students.slice(0, 5).map((student, index) => (
                <View
                  key={student.id || index}
                  style={[
                    styles.tableRow,
                    index < Math.min(students.length, 5) - 1 && {
                      borderBottomColor: theme.colors.border,
                      borderBottomWidth: 1,
                    },
                  ]}
                >
                  <View style={styles.userRowLeft}>
                    <View style={[styles.userAvatar, { backgroundColor: '#22D3EE' }]}>
                      <Text style={styles.userAvatarText}>
                        {student.name?.charAt(0)?.toUpperCase() || 'S'}
                      </Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={[styles.userName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {student.name || 'Unknown'}
                      </Text>
                      <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {student.email || '-'}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: student.isActive !== false ? '#10B98115' : '#EF444415' },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: student.isActive !== false ? '#10B981' : '#EF4444' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: student.isActive !== false ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {student.isActive !== false ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No students found
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
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: { fontSize: 16, fontWeight: '600', fontFamily: theme.typography?.fontFamily?.semiBold },
    sectionSubtitle: { fontSize: 12, marginTop: 2 },

    statsSection: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: isMobile ? 16 : 24,
      gap: isMobile ? 12 : 16,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      minWidth: isMobile ? '47%' : isLargeScreen ? 200 : isTablet ? 170 : 140,
      maxWidth: isLargeScreen ? 280 : undefined,
    },

    chartsSection: {
      flexDirection: isLargeScreen ? 'row' : 'column',
      paddingHorizontal: isMobile ? 16 : 24,
      gap: 16,
      marginBottom: 24,
    },
    chartCard: { flex: 1, minWidth: isLargeScreen ? 360 : undefined },
    chartCardInner: { padding: isMobile ? 16 : 20 },
    chartHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    chartTitle: { fontSize: 16, fontWeight: '600' },
    chartSubtitle: { fontSize: 13, marginTop: 4 },

    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sectionIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    manageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1.5,
    },
    manageButtonText: {
      fontSize: 13,
      fontWeight: '600',
    },

    tableCard: { padding: 0, overflow: 'hidden' },
    tableRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: isMobile ? 12 : 14,
      paddingHorizontal: isMobile ? 14 : 18,
    },
    userRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: isMobile ? 10 : 14,
    },
    userAvatar: {
      width: isMobile ? 38 : 42,
      height: isMobile ? 38 : 42,
      borderRadius: isMobile ? 19 : 21,
      justifyContent: 'center',
      alignItems: 'center',
    },
    userAvatarText: {
      color: '#FFFFFF',
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
    },
    userDetails: {
      flex: 1,
    },
    userName: {
      fontSize: isMobile ? 14 : 15,
      fontWeight: '600',
      marginBottom: 2,
    },
    userEmail: {
      fontSize: isMobile ? 12 : 13,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isMobile ? 10 : 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusPillText: {
      fontSize: isMobile ? 11 : 12,
      fontWeight: '600',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 30,
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center',
    },
  });

export default SuperAdminDashboard;
