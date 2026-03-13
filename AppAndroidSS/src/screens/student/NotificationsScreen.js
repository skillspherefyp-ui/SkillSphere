import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MainLayout from '../../components/ui/MainLayout';
import AppCard from '../../components/ui/AppCard';
import EmptyState from '../../components/ui/EmptyState';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const ORANGE = '#FF8C42';

const NotificationsScreen = () => {
  const { notifications } = useData();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const { logout } = useAuth();

  const sidebarItems = [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Browse Courses', icon: 'library-outline', iconActive: 'library', route: 'Courses' },
    { label: 'My Learning', icon: 'school-outline', iconActive: 'school', route: 'EnrolledCourses' },
    { label: 'AI Assistant', icon: 'sparkles-outline', iconActive: 'sparkles', route: 'AITutor' },
    { label: 'Certificates', icon: 'ribbon-outline', iconActive: 'ribbon', route: 'Certificates' },
    { label: 'Reminders', icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle', route: 'Todo' },
  ];
  const handleNavigate = (route) => navigation.navigate(route);

  const isWeb = Platform.OS === 'web';
  const maxWidth = isWeb && width > 1200 ? 1200 : '100%';

  const dummyNotifications = [
    {
      id: '1',
      title: 'New Course Available',
      message: 'Advanced JavaScript course is now available',
      type: 'course',
      read: false,
      date: '2024-01-15',
    },
    {
      id: '2',
      title: 'Quiz Reminder',
      message: 'You have a quiz due tomorrow',
      type: 'quiz',
      read: false,
      date: '2024-01-14',
    },
  ];

  const allNotifications = [...notifications, ...dummyNotifications];

  const renderNotification = ({ item, index }) => (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 50)}>
      <AppCard
        style={[
          styles.notificationCard,
          !item.read && { backgroundColor: theme.colors.primary + '10' }
        ]}
      >
        <View style={[styles.notificationIcon, { backgroundColor: theme.colors.primary + '20' }]}>
          <Icon
            name={
              item.type === 'course'
                ? 'book'
                : item.type === 'quiz'
                ? 'help-circle'
                : 'notifications'
            }
            size={24}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, { color: theme.colors.textPrimary }]}>{item.title}</Text>
          <Text style={[styles.notificationMessage, { color: theme.colors.textSecondary }]}>{item.message}</Text>
          <Text style={[styles.notificationDate, { color: theme.colors.textTertiary }]}>{item.date}</Text>
        </View>
        {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
      </AppCard>
    </Animated.View>
  );

  return (
    <MainLayout
      showSidebar={true}
      sidebarItems={sidebarItems}
      activeRoute="Dashboard"
      onNavigate={handleNavigate}
    >
      <View style={[styles.content, { maxWidth, alignSelf: 'center', width: '100%' }]}>
        <FlatList
          data={allNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={[styles.pageHeaderBanner, {
              backgroundColor: isDark ? 'rgba(255,140,66,0.06)' : 'rgba(255,140,66,0.05)',
              borderColor: 'rgba(255,140,66,0.15)',
            }]}>
              <View style={styles.bannerLeft}>
                <View style={[styles.bannerIconCircle, { backgroundColor: ORANGE + '20' }]}>
                  <Icon name="notifications" size={22} color={ORANGE} />
                </View>
                <View style={styles.bannerTextGroup}>
                  <Text style={[styles.bannerTitle, { color: theme.colors.textPrimary }]}>Notifications</Text>
                  <Text style={[styles.bannerSubtitle, { color: theme.colors.textSecondary }]}>Stay up to date with your learning</Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              title="No notifications"
              subtitle="You're all caught up! New notifications will appear here"
            />
          }
        />
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    paddingBottom: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF8C42',
    borderRadius: 12,
    overflow: 'hidden',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 4,
  },
  notificationDate: {
    fontSize: 12,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignSelf: 'center',
    backgroundColor: '#FF8C42',
  },
});

export default NotificationsScreen;

