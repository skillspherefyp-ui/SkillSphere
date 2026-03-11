import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, useWindowDimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeIn } from 'react-native-reanimated';
import AppHeader from '../../components/ui/AppHeader';
import AppCard from '../../components/ui/AppCard';
import AppButton from '../../components/ui/AppButton';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';

const QuizResultScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const {
    courseId,
    topicId,
    lectureId,
    score,
    totalQuestions,
    correctAnswers,
    passed,
    passingThreshold,
    unlockedTopic,
  } = route.params;

  const isWeb = Platform.OS === 'web';
  const maxWidth = isWeb && width > 1200 ? 1200 : '100%';
  const scoreColor = passed ? theme.colors.success : theme.colors.warning;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Quiz Results" />
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.contentContainer, { maxWidth, alignSelf: 'center', width: '100%' }]}>
        <Animated.View entering={FadeIn.duration(600)}>
          <AppCard style={styles.resultCard}>
            <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreText, { color: scoreColor }]}>{score}%</Text>
            </View>
            <Text style={[styles.scoreMessage, { color: theme.colors.textPrimary }]}>{passed ? 'Lecture Passed' : 'Retry Needed'}</Text>
            <Text style={[styles.scoreDetails, { color: theme.colors.textSecondary }]}>
              You answered {correctAnswers} out of {totalQuestions} questions correctly.
            </Text>
            <Text style={[styles.scoreDetails, { color: theme.colors.textSecondary }]}>
              Passing threshold: {passingThreshold}%
            </Text>
          </AppCard>
        </Animated.View>

        <AppCard style={styles.feedbackCard}>
          <Icon name={passed ? 'checkmark-circle' : 'refresh-circle'} size={32} color={scoreColor} />
          <Text style={[styles.feedbackTitle, { color: theme.colors.textPrimary }]}>{passed ? 'Next Topic Unlocked' : 'Review and Retry'}</Text>
          <Text style={[styles.feedbackText, { color: theme.colors.textSecondary }]}>
            {passed
              ? unlockedTopic
                ? `You passed the stored lecture quiz. "${unlockedTopic.title}" is now unlocked.`
                : 'You passed the final topic in this course.'
              : 'The next topic remains locked until you pass this lecture quiz. Review the lecture notes and try again.'}
          </Text>
        </AppCard>

        <View style={styles.actions}>
          <AppButton
            title="Review Lecture"
            onPress={() => navigation.navigate('Learning', { courseId, topicId, lectureId })}
            variant="outline"
            fullWidth
            icon={<Icon name="book" size={16} color={theme.colors.primary} />}
            iconPosition="left"
            style={styles.actionButton}
          />
          <AppButton
            title={passed && unlockedTopic ? 'Open Next Topic' : 'Back to Course'}
            onPress={() => navigation.navigate(passed && unlockedTopic ? 'Learning' : 'CourseDetail', passed && unlockedTopic ? { courseId, topicId: unlockedTopic.id } : { courseId })}
            variant="primary"
            fullWidth
            icon={<Icon name="arrow-forward" size={16} color="#ffffff" />}
            iconPosition="right"
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  contentContainer: { padding: 20 },
  resultCard: { alignItems: 'center', marginBottom: 20 },
  scoreCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  scoreText: { fontSize: 36, fontWeight: 'bold' },
  scoreMessage: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  scoreDetails: { fontSize: 16, textAlign: 'center', marginBottom: 4 },
  feedbackCard: { alignItems: 'center', marginBottom: 20 },
  feedbackTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 12, marginBottom: 8 },
  feedbackText: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  actions: { gap: 12 },
  actionButton: { marginTop: 0 },
});

export default QuizResultScreen;
