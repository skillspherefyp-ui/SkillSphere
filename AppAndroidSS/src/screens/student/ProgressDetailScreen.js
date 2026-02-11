import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AppHeader from '../../components/ui/AppHeader';
import AppCard from '../../components/ui/AppCard';
import ProgressBar from '../../components/ui/ProgressBar';
import CircularProgress from '../../components/ui/CircularProgress';
import EmptyState from '../../components/ui/EmptyState';
import Icon from 'react-native-vector-icons/Ionicons';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const ProgressDetailScreen = () => {
  const { theme } = useTheme();
  const { courses } = useData();
  const navigation = useNavigation();

  // Calculate progress for each course
  const coursesWithProgress = courses.map(course => {
    if (!course.topics || course.topics.length === 0) {
      return { ...course, progress: 0 };
    }
    const completedTopics = course.topics.filter(t => t.completed).length;
    const totalTopics = course.topics.length;
    const progress = Math.round((completedTopics / totalTopics) * 100);
    return { ...course, progress };
  });

  const overallProgress = coursesWithProgress.length > 0
    ? Math.round(coursesWithProgress.reduce((acc, c) => acc + c.progress, 0) / coursesWithProgress.length)
    : 0;

  const completedCourses = coursesWithProgress.filter(c => c.progress === 100);
  const inProgressCourses = coursesWithProgress.filter(c => c.progress > 0 && c.progress < 100);

  const getStyles = (theme) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
      marginBottom: 16,
      marginTop: 8,
    },
    progressCard: {
      marginBottom: 24,
      alignItems: 'center',
      paddingVertical: 32,
    },
    progressLabel: {
      fontSize: 16,
      fontWeight: '600',
    },
    courseCard: {
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    courseInfo: {
      flex: 1,
    },
    courseName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    courseCategory: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    courseProgress: {
      marginTop: 8,
    },
    emptyListContainer: {
      marginTop: 20,
    }
  });

  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <AppHeader title="My Progress" showBack={true} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Overall Progress */}
        <AppCard style={styles.progressCard}>
          <Text style={[styles.sectionTitle, { marginBottom: 20, marginTop: 0 }]}>Overall Progress</Text>
          <CircularProgress
            progress={overallProgress}
            size={140}
            strokeWidth={12}
          />
          <Text style={[styles.progressLabel, { color: theme.colors.textSecondary, marginTop: 16 }]}>
            {overallProgress}% Complete
          </Text>
        </AppCard>

        {/* Completed Courses */}
        <Text style={styles.sectionTitle}>Completed Courses</Text>
        {completedCourses.length > 0 ? (
          completedCourses.map(course => (
            <AppCard
              key={course.id}
              onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
              style={styles.courseCard}
            >
              <View style={styles.courseInfo}>
                <Text style={styles.courseName}>{course.name}</Text>
                <Text style={styles.courseCategory}>{course.category?.name || 'No Category'}</Text>
              </View>
              <Icon name="checkmark-circle" size={24} color={theme.colors.success} />
            </AppCard>
          ))
        ) : (
          <EmptyState
            icon="checkmark-done-circle-outline"
            title="No Completed Courses"
            subtitle="Keep learning to complete your first course!"
            style={styles.emptyListContainer}
          />
        )}

        {/* Courses to Continue */}
        <Text style={styles.sectionTitle}>Courses to Continue</Text>
        {inProgressCourses.length > 0 ? (
          inProgressCourses.map(course => (
            <AppCard
              key={course.id}
              onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
              style={styles.courseCard}
            >
              <View style={styles.courseInfo}>
                <Text style={styles.courseName}>{course.name}</Text>
                <Text style={styles.courseCategory}>{course.category?.name || 'No Category'}</Text>
                <ProgressBar
                  progress={course.progress}
                  showLabel={true}
                  label={`${course.progress}%`}
                  style={styles.courseProgress}
                />
              </View>
              <Icon name="chevron-forward" size={24} color={theme.colors.textTertiary} />
            </AppCard>
          ))
        ) : (
          <EmptyState
            icon="book-outline"
            title="No In-Progress Courses"
            subtitle="Start a new course to see your progress here."
            style={styles.emptyListContainer}
          />
        )}
      </ScrollView>
    </View>
  );
};

export default ProgressDetailScreen;