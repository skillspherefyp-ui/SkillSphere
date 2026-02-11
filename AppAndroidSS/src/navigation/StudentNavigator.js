import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import StudentDashboard from '../screens/student/StudentDashboard';
import BrowseCoursesScreen from '../screens/student/BrowseCoursesScreen';
import CourseDetailScreen from '../screens/student/CourseDetailScreen';
import LearningScreen from '../screens/student/LearningScreen';
import QuizScreen from '../screens/student/QuizScreen';
import QuizResultScreen from '../screens/student/QuizResultScreen';
import AIChatScreen from '../screens/student/AIChatScreen';
import CertificatesScreen from '../screens/student/CertificatesScreen';
import NotificationsScreen from '../screens/student/NotificationsScreen';
import TodoScreen from '../screens/student/TodoScreen';
import PaymentScreen from '../screens/student/PaymentScreen';
import ProgressDetailScreen from '../screens/student/ProgressDetailScreen';
import CategoriesScreen from '../screens/student/CategoriesScreen';
import EnrolledCoursesScreen from '../screens/student/EnrolledCoursesScreen';

const Stack = createStackNavigator();

const StudentNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="Dashboard" component={StudentDashboard} />
      <Stack.Screen name="Courses" component={BrowseCoursesScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen name="Learning" component={LearningScreen} />
      <Stack.Screen name="Quiz" component={QuizScreen} />
      <Stack.Screen name="QuizResult" component={QuizResultScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Todo" component={TodoScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="ProgressDetail" component={ProgressDetailScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
      <Stack.Screen name="EnrolledCourses" component={EnrolledCoursesScreen} />
      <Stack.Screen name="AITutor" component={AIChatScreen} />
      <Stack.Screen name="Certificates" component={CertificatesScreen} />
    </Stack.Navigator>
  );
};

export default StudentNavigator;
