import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import MainLayout from '../../components/ui/MainLayout';
import AppCard from '../../components/ui/AppCard';
import AppInput from '../../components/ui/AppInput';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { feedbackAPI } from '../../services/apiClient';

const FeedbackScreen = () => {
  const { user, logout } = useAuth();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch feedback data
  const fetchFeedback = useCallback(async () => {
    try {
      const response = await feedbackAPI.getAll();
      if (response.success && response.feedbacks) {
        setFeedbackList(response.feedbacks);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load feedback data',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFeedback();
  }, [fetchFeedback]);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;
  const isTablet = width > 768;
  const isMobile = width <= 480;

  const isSuperAdmin = user?.role === 'superadmin';

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

  const handleNavigate = (route) => {
    if (isSuperAdmin) {
      if (route === 'ManageAdmins') {
        navigation.navigate('ManageUsers', { userType: 'admin' });
      } else if (route === 'ManageExperts') {
        navigation.navigate('ManageUsers', { userType: 'expert' });
      } else if (route === 'Categories') {
        navigation.navigate('CategoryManagement');
      } else {
        navigation.navigate(route);
      }
    } else {
      navigation.navigate(route);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalFeedback = feedbackList.length;
    const avgRating = feedbackList.length > 0
      ? feedbackList.reduce((acc, f) => acc + f.rating, 0) / feedbackList.length
      : 0;
    const highRated = feedbackList.filter(f => f.rating >= 4).length;
    return { totalFeedback, avgRating: avgRating.toFixed(1), highRated };
  }, [feedbackList]);

  const filteredFeedback = feedbackList.filter(feedback => {
    const matchesSearch = feedback.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.expertName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Format date helper
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile);

  const renderFeedbackCard = (feedback, index) => (
    <Animated.View
      key={feedback.id}
      entering={FadeInDown.duration(400).delay(index * 80)}
      style={styles.feedbackCardWrapper}
    >
      <AppCard style={styles.feedbackCard}>
        {/* Header */}
        <View style={styles.feedbackHeader}>
          <View style={styles.feedbackTitleSection}>
            <Text style={[styles.courseName, { color: theme.colors.textPrimary }]}>
              {feedback.courseName}
            </Text>
            <View style={styles.expertRow}>
              <Icon name="person-outline" size={14} color={theme.colors.textTertiary} />
              <Text style={[styles.expertName, { color: theme.colors.textSecondary }]}>
                {feedback.expertName}
              </Text>
            </View>
          </View>
          {/* Rating */}
          <View style={styles.ratingContainer}>
            {[...Array(5)].map((_, i) => (
              <Icon
                key={i}
                name={i < feedback.rating ? 'star' : 'star-outline'}
                size={18}
                color={i < feedback.rating ? '#F59E0B' : theme.colors.textTertiary}
              />
            ))}
          </View>
        </View>

        {/* Feedback Text */}
        <Text style={[styles.feedbackText, { color: theme.colors.textSecondary }]}>
          {feedback.feedback}
        </Text>

        {/* Footer */}
        <View style={styles.feedbackFooter}>
          <View style={styles.dateRow}>
            <Icon name="calendar-outline" size={14} color={theme.colors.textTertiary} />
            <Text style={[styles.feedbackDate, { color: theme.colors.textTertiary }]}>
              {formatDate(feedback.createdAt)}
            </Text>
          </View>
        </View>
      </AppCard>
    </Animated.View>
  );

  if (loading) {
    return (
      <MainLayout
        showSidebar={true}
        sidebarItems={sidebarItems}
        activeRoute="Feedback"
        onNavigate={handleNavigate}
        userInfo={{ name: user?.name, role: isSuperAdmin ? 'Super Admin' : 'Administrator', avatar: user?.avatar }}
        onLogout={logout}
        onSettings={() => navigation.navigate('Settings')}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading feedback...
          </Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      showSidebar={true}
      sidebarItems={sidebarItems}
      activeRoute="Feedback"
      onNavigate={handleNavigate}
      userInfo={{ name: user?.name, role: isSuperAdmin ? 'Super Admin' : 'Administrator', avatar: user?.avatar }}
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
                Expert Feedback
              </Text>
            </View>
            <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>
              Review and manage feedback from course experts
            </Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <AppCard style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Total Feedback
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {stats.totalFeedback}
            </Text>
          </AppCard>
          <AppCard style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Average Rating
            </Text>
            <View style={styles.ratingStatRow}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                {stats.avgRating}
              </Text>
              <Icon name="star" size={20} color="#F59E0B" />
            </View>
          </AppCard>
          <AppCard style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              High Rated (4+)
            </Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {stats.highRated}
            </Text>
          </AppCard>
        </View>

        {/* Search Section */}
        <AppCard style={styles.searchCard}>
          <AppInput
            placeholder="Search by course or expert name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Icon name="search" size={20} color={theme.colors.textSecondary} />}
          />
        </AppCard>

        {/* Feedback List */}
        {filteredFeedback.length > 0 ? (
          <View style={styles.feedbackList}>
            {filteredFeedback.map((feedback, index) => renderFeedbackCard(feedback, index))}
          </View>
        ) : (
          <AppCard style={styles.emptyContainer}>
            <EmptyState
              icon="chatbubbles-outline"
              title="No feedback found"
              subtitle="Expert feedback will appear here once courses are reviewed"
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
    },

    // Header Section
    headerSection: {
      marginBottom: 24,
      width: '100%',
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
    ratingStatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    // Search Section
    searchCard: {
      padding: isMobile ? 12 : 16,
      marginBottom: isMobile ? 16 : 24,
    },

    // Feedback List
    feedbackList: {
      gap: 16,
    },
    feedbackCardWrapper: {
      width: '100%',
    },
    feedbackCard: {
      padding: isMobile ? 14 : 20,
    },
    feedbackHeader: {
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'flex-start',
      marginBottom: 12,
      gap: isMobile ? 8 : 12,
    },
    feedbackTitleSection: {
      flex: isMobile ? undefined : 1,
    },
    courseName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    expertRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    expertName: {
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.regular,
    },
    ratingContainer: {
      flexDirection: 'row',
      gap: 2,
    },
    feedbackText: {
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 16,
      fontFamily: theme.typography.fontFamily.regular,
    },
    feedbackFooter: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    feedbackDate: {
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Empty State
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
    },
  });

export default FeedbackScreen;
