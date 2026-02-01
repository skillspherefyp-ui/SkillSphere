import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'react-native-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import AppHeader from '../../components/ui/AppHeader';
import AppCard from '../../components/ui/AppCard';
import AppButton from '../../components/ui/AppButton';
import ProgressBar from '../../components/ui/ProgressBar';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';

const dummyQuestions = [
  {
    id: '1',
    question: 'What is React Native?',
    options: [
      'A JavaScript framework',
      'A mobile app development framework',
      'A database',
      'A programming language',
    ],
    correctAnswer: 1,
  },
  {
    id: '2',
    question: 'Which component is used for navigation in React Native?',
    options: [
      'Navigator',
      'Router',
      'NavigationContainer',
      'Route',
    ],
    correctAnswer: 2,
  },
  {
    id: '3',
    question: 'What is the purpose of useState hook?',
    options: [
      'To fetch data',
      'To manage component state',
      'To handle events',
      'To style components',
    ],
    correctAnswer: 1,
  },
];

const QuizScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { courseId, topicId } = route.params;
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const isWeb = Platform.OS === 'web';
  const maxWidth = isWeb && width > 1200 ? 1200 : '100%';

  const question = dummyQuestions[currentQuestion];
  const totalQuestions = dummyQuestions.length;

  const handleSelectAnswer = (optionIndex) => {
    if (isSubmitted) return;
    setSelectedAnswers({
      ...selectedAnswers,
      [question.id]: optionIndex,
    });
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    let correctCount = 0;
    dummyQuestions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / totalQuestions) * 100);
    setIsSubmitted(true);

    Toast.show({
      type: 'success',
      text1: 'Quiz Completed!',
      text2: `You scored ${score}% (${correctCount}/${totalQuestions})`,
    });

    setTimeout(() => {
      navigation.navigate('QuizResult', {
        courseId,
        topicId,
        score,
        totalQuestions,
        correctCount,
        answers: selectedAnswers,
      });
    }, 1500);
  };

  const getOptionStyle = (optionIndex) => {
    const baseStyle = [styles.option];
    if (!isSubmitted) {
      if (selectedAnswers[question.id] === optionIndex) {
        baseStyle.push(styles.optionSelected);
      }
      return baseStyle;
    }

    if (optionIndex === question.correctAnswer) {
      baseStyle.push(styles.optionCorrect);
    } else if (selectedAnswers[question.id] === optionIndex && optionIndex !== question.correctAnswer) {
      baseStyle.push(styles.optionIncorrect);
    }
    return baseStyle;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader 
        title={`Quiz - Question ${currentQuestion + 1} of ${totalQuestions}`}
      />
      <ProgressBar 
        progress={((currentQuestion + 1) / totalQuestions) * 100}
        style={styles.progressBar}
      />

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.contentContainer, { maxWidth, alignSelf: 'center', width: '100%' }]}
      >
        <AppCard style={styles.questionContainer}>
          <Text style={[styles.questionNumber, { color: theme.colors.primary }]}>Question {currentQuestion + 1}</Text>
          <Text style={[styles.questionText, { color: theme.colors.textPrimary }]}>{question.question}</Text>
        </AppCard>

        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => (
            <Animated.View
              key={index}
              entering={FadeIn.duration(300).delay(index * 100)}
            >
              <TouchableOpacity
                style={[
                  getOptionStyle(index),
                  { 
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border 
                  }
                ]}
                onPress={() => handleSelectAnswer(index)}
                disabled={isSubmitted}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionIndicator}>
                    {selectedAnswers[question.id] === index && (
                      <Icon
                        name={isSubmitted && index === question.correctAnswer ? 'checkmark-circle' : 'radio-button-on'}
                        size={24}
                        color={isSubmitted && index === question.correctAnswer ? theme.colors.success : theme.colors.primary}
                      />
                    )}
                    {selectedAnswers[question.id] !== index && (
                      <Icon
                        name="radio-button-off"
                        size={24}
                        color={theme.colors.textTertiary}
                      />
                    )}
                  </View>
                  <Text style={[styles.optionText, { color: theme.colors.textPrimary }]}>{option}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <AppButton
          title="Previous"
          onPress={handlePrevious}
          variant="outline"
          disabled={currentQuestion === 0}
          icon={<Icon name="chevron-back" size={16} color={currentQuestion === 0 ? theme.colors.textTertiary : theme.colors.primary} />}
          iconPosition="left"
          style={styles.footerButton}
        />

        <AppButton
          title={currentQuestion === totalQuestions - 1 ? 'Submit' : 'Next'}
          onPress={handleNext}
          variant="primary"
          disabled={!selectedAnswers[question.id] && !isSubmitted}
          icon={<Icon name="chevron-forward" size={16} color="#ffffff" />}
          iconPosition="right"
          style={styles.footerButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressBar: {
    marginBottom: 0,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  optionSelected: {
    borderWidth: 2,
  },
  optionCorrect: {
    borderWidth: 2,
  },
  optionIncorrect: {
    borderWidth: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIndicator: {
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
});

export default QuizScreen;

