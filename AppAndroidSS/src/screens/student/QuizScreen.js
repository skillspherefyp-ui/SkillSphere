import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, useWindowDimensions, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeIn } from 'react-native-reanimated';
import AppHeader from '../../components/ui/AppHeader';
import AppCard from '../../components/ui/AppCard';
import AppButton from '../../components/ui/AppButton';
import ProgressBar from '../../components/ui/ProgressBar';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { aiTutorAPI } from '../../services/apiClient';
import { useData } from '../../context/DataContext';

const QuizScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const { fetchCourses } = useData();
  const { courseId, topicId, lectureId } = route.params;
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});

  const isWeb = Platform.OS === 'web';
  const maxWidth = isWeb && width > 1200 ? 1200 : '100%';
  const questions = quiz?.questions || [];
  const question = questions[currentQuestion];
  const totalQuestions = questions.length;

  useEffect(() => {
    loadQuiz();
  }, [lectureId]);

  const loadQuiz = async () => {
    setLoading(true);
    try {
      const response = await aiTutorAPI.getQuiz(lectureId);
      if (!response.success) {
        throw new Error(response.error || 'Unable to load quiz');
      }
      setQuiz(response.quiz);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Quiz Unavailable',
        text2: error.message || 'Unable to load the stored quiz.',
      });
    } finally {
      setLoading(false);
    }
  };

  const canAdvance = useMemo(() => selectedAnswers[question?.id] !== undefined, [selectedAnswers, question]);

  const handleSelectAnswer = (optionIndex) => {
    if (!question) return;
    setSelectedAnswers((prev) => ({ ...prev, [question.id]: optionIndex }));
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion((prev) => prev + 1);
      return;
    }
    handleSubmit();
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);

    try {
      const response = await aiTutorAPI.submitQuiz(lectureId, selectedAnswers);
      if (!response.success) {
        throw new Error(response.error || 'Unable to submit quiz');
      }

      await fetchCourses();
      const result = response.result;
      Toast.show({
        type: result.passed ? 'success' : 'info',
        text1: result.passed ? 'Quiz Passed' : 'Quiz Submitted',
        text2: `Score: ${result.score}%`,
      });

      navigation.replace('QuizResult', {
        courseId,
        topicId,
        lectureId,
        ...result,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Submission Failed',
        text2: error.message || 'Unable to submit quiz answers.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Quiz" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading lecture quiz...</Text>
        </View>
      </View>
    );
  }

  if (!quiz || !question) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Quiz" />
        <View style={styles.loadingWrap}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Quiz not available for this lecture.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title={`Quiz - Question ${currentQuestion + 1} of ${totalQuestions}`} />
      <ProgressBar progress={((currentQuestion + 1) / totalQuestions) * 100} style={styles.progressBar} />

      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { maxWidth, alignSelf: 'center', width: '100%' }]}>
        <AppCard style={styles.questionContainer}>
          <Text style={[styles.questionNumber, { color: theme.colors.primary }]}>Question {currentQuestion + 1}</Text>
          <Text style={[styles.questionText, { color: theme.colors.textPrimary }]}>{question.prompt}</Text>
        </AppCard>

        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => {
            const isSelected = selectedAnswers[question.id] === index;
            return (
              <Animated.View key={index} entering={FadeIn.duration(300).delay(index * 80)}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => handleSelectAnswer(index)}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionIndicator}>
                      <Icon name={isSelected ? 'radio-button-on' : 'radio-button-off'} size={22} color={isSelected ? theme.colors.primary : theme.colors.textTertiary} />
                    </View>
                    <Text style={[styles.optionText, { color: theme.colors.textPrimary }]}>{option}</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <AppButton
          title="Previous"
          onPress={handlePrevious}
          variant="outline"
          disabled={currentQuestion === 0 || submitting}
          icon={<Icon name="chevron-back" size={16} color={currentQuestion === 0 ? theme.colors.textTertiary : theme.colors.primary} />}
          iconPosition="left"
          style={styles.footerButton}
        />
        <AppButton
          title={currentQuestion === totalQuestions - 1 ? (submitting ? 'Submitting...' : 'Submit') : 'Next'}
          onPress={handleNext}
          variant="primary"
          disabled={!canAdvance || submitting}
          icon={<Icon name="chevron-forward" size={16} color="#ffffff" />}
          iconPosition="right"
          style={styles.footerButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressBar: { marginBottom: 0 },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15 },
  questionContainer: { marginBottom: 24 },
  questionNumber: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  questionText: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  optionsContainer: { gap: 12 },
  option: { borderRadius: 12, padding: 16, borderWidth: 2 },
  optionContent: { flexDirection: 'row', alignItems: 'center' },
  optionIndicator: { marginRight: 12 },
  optionText: { flex: 1, fontSize: 16 },
  footer: { flexDirection: 'row', padding: 20, borderTopWidth: 1, gap: 12 },
  footerButton: { flex: 1 },
});

export default QuizScreen;
