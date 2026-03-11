import React from 'react';
import { Text } from 'react-native';
import * as IoIcons from 'react-icons/io5';
import {
  MdAutoGraph,
  MdBarChart,
  MdBook,
  MdChecklist,
  MdDashboard,
  MdEdit,
  MdForum,
  MdGridView,
  MdHelp,
  MdLayers,
  MdPeople,
  MdSettings,
  MdSpeed,
  MdSwapVert,
  MdWorkspacePremium,
} from 'react-icons/md';

const fallbackIcons = {
  AddTopics: MdChecklist,
  Admin: MdDashboard,
  AITutor: MdForum,
  Auth: MdDashboard,
  Categories: MdGridView,
  CategoryManagement: MdGridView,
  CertificateManagement: MdWorkspacePremium,
  Certificates: MdWorkspacePremium,
  CourseDetail: MdBook,
  Courses: MdBook,
  CreateCourse: MdEdit,
  Dashboard: MdDashboard,
  DevBackendStatus: MdSpeed,
  EnrolledCourses: MdBook,
  Expert: MdPeople,
  ExploreCourseDetail: MdBook,
  ExploreCourses: MdBook,
  Feedback: MdForum,
  FeedbackForm: MdForum,
  Landing: MdDashboard,
  Login: MdDashboard,
  LoginOTP: MdDashboard,
  ManageAdmins: MdPeople,
  ManageExperts: MdPeople,
  ManageUsers: MdPeople,
  OTPVerification: MdDashboard,
  Payment: MdChecklist,
  ProgressDetail: MdAutoGraph,
  Quiz: MdHelp,
  QuizResult: MdBarChart,
  Register: MdDashboard,
  Settings: MdSettings,
  Signup: MdDashboard,
  SignupDetails: MdDashboard,
  SignupOTP: MdDashboard,
  Student: MdPeople,
  StudentDetail: MdPeople,
  Students: MdPeople,
  SuperAdmin: MdDashboard,
  Todo: MdSwapVert,
  analytics: MdAutoGraph,
  'bar-chart': MdBarChart,
  book: MdBook,
  cards: MdChecklist,
  chatbubbles: MdForum,
  grid: MdGridView,
  help: MdHelp,
  layers: MdLayers,
  people: MdPeople,
  ribbon: MdWorkspacePremium,
  settings: MdSettings,
  speedometer: MdSpeed,
  'swap-vertical': MdSwapVert,
};

const toPascal = (name = '') =>
  name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

export const resolveIconComponent = (name) => {
  if (!name) {
    return IoIcons.IoHelpCircleOutline;
  }

  const ioCandidate = IoIcons[`Io${toPascal(name)}`];
  if (ioCandidate) {
    return ioCandidate;
  }

  const outlineFallback = name.endsWith('-outline') ? fallbackIcons[name.replace(/-outline$/, '')] : undefined;
  return fallbackIcons[name] || outlineFallback || IoIcons.IoHelpCircleOutline;
};

export const createIconComponent = (resolver) => {
  const IconComponent = ({ name, size = 20, color = '#0f172a', style }) => {
    const Component = resolver(name);
    if (!Component) {
      return (
        <Text style={style}>
          ?
        </Text>
      );
    }

    return <Component size={size} color={color} style={style} />;
  };

  return IconComponent;
};
