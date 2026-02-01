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
  const { score, totalQuestions, correctCount } = route.params;
  
  const isWeb = Platform.OS === 'web';
  const maxWidth = isWeb && width > 1200 ? 1200 : '100%';

  const getScoreColor = () => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  const getScoreMessage = () => {
    if (score >= 80) return 'Excellent!';
    if (score >= 60) return 'Good job!';
    return 'Keep practicing!';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Quiz Results" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { maxWidth, alignSelf: 'center', width: '100%' }]}
      >
        <Animated.View entering={FadeIn.duration(600)}>
          <AppCard style={styles.resultCard}>
            <View style={[styles.scoreCircle, { borderColor: getScoreColor() }]}>
              <Text style={[styles.scoreText, { color: getScoreColor() }]}>{score}%</Text>
            </View>
            <Text style={[styles.scoreMessage, { color: theme.colors.textPrimary }]}>{getScoreMessage()}</Text>
            <Text style={[styles.scoreDetails, { color: theme.colors.textSecondary }]}>
              You answered {correctCount} out of {totalQuestions} questions correctly
            </Text>
          </AppCard>
        </Animated.View>

        <AppCard style={styles.feedbackCard}>
          <Icon name="bulb" size={32} color={theme.colors.warning} />
          <Text style={[styles.feedbackTitle, { color: theme.colors.textPrimary }]}>AI Feedback</Text>
          <Text style={[styles.feedbackText, { color: theme.colors.textSecondary }]}>
            {score >= 80
              ? 'Great work! You have a strong understanding of this topic. Consider moving to the next topic.'
              : score >= 60
              ? 'Good progress! Review the incorrect answers and consider revisiting the lecture material.'
              : 'Don\'t worry! Review the lecture material and try the quiz again to improve your understanding.'}
          </Text>
        </AppCard>

        <View style={styles.actions}>
          <AppButton
            title="Review Lecture"
            onPress={() => navigation.navigate('Learning', route.params)}
            variant="outline"
            fullWidth
            icon={<Icon name="book" size={16} color={theme.colors.primary} />}
            iconPosition="left"
            style={styles.actionButton}
          />

          <AppButton
            title="Continue"
            onPress={() => navigation.navigate('CourseDetail', { courseId: route.params.courseId })}
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
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  resultCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  scoreMessage: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scoreDetails: {
    fontSize: 16,
    textAlign: 'center',
  },
  feedbackCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    marginTop: 0,
  },
});

export default QuizResultScreen;

