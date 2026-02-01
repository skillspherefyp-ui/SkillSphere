import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ExpertDashboard from '../screens/expert/ExpertDashboard';
import ExpertCourseListScreen from '../screens/expert/ExpertCourseListScreen';
import ExpertCourseDetailScreen from '../screens/expert/ExpertCourseDetailScreen';
import FeedbackFormScreen from '../screens/expert/FeedbackFormScreen';
import ExpertSettingsScreen from '../screens/expert/ExpertSettingsScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

const Stack = createStackNavigator();

const ExpertNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="Dashboard" component={ExpertDashboard} />
      <Stack.Screen name="Courses" component={ExpertCourseListScreen} />
      <Stack.Screen name="CourseDetail" component={ExpertCourseDetailScreen} />
      <Stack.Screen name="FeedbackForm" component={FeedbackFormScreen} />
      <Stack.Screen name="Settings" component={ExpertSettingsScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

export default ExpertNavigator;
