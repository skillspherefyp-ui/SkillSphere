import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminDashboard from '../screens/admin/AdminDashboard';
import CourseListScreen from '../screens/admin/CourseListScreen';
import CreateCourseScreen from '../screens/admin/CreateCourseScreen';
import CourseDetailScreen from '../screens/admin/CourseDetailScreen';
import AddTopicsScreen from '../screens/admin/AddTopicsScreen';
import StudentListScreen from '../screens/admin/StudentListScreen';
import StudentDetailScreen from '../screens/admin/StudentDetailScreen';
import CategoryManagementScreen from '../screens/admin/CategoryManagementScreen';
import CertificateManagementScreen from '../screens/admin/CertificateManagementScreen';
import FeedbackScreen from '../screens/admin/FeedbackScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';
import ManageUsersScreen from '../screens/admin/ManageUsersScreen';

const Stack = createStackNavigator();

const AdminNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="Dashboard" component={AdminDashboard} />
      <Stack.Screen name="Courses" component={CourseListScreen} />
      <Stack.Screen name="Students" component={StudentListScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="CreateCourse" component={CreateCourseScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen name="AddTopics" component={AddTopicsScreen} />
      <Stack.Screen name="StudentDetail" component={StudentDetailScreen} />
      <Stack.Screen name="CertificateManagement" component={CertificateManagementScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
      <Stack.Screen name="ManageUsers" component={ManageUsersScreen} />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
