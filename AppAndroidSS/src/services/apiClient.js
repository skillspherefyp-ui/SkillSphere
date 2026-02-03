import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_PORT = '5000';

const getHost = () => {
  // Check if we have a production API URL configured
  if (Platform.OS === 'web' && process.env.REACT_APP_API_URL) {
    console.log('🌐 Using production API:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }

  // Development environments
  if (Platform.OS === 'android') return `http://10.0.2.2:${DEFAULT_PORT}`;
  if (Platform.OS === 'web') {
    console.log('⚠️  No REACT_APP_API_URL found, using localhost');
    return `http://localhost:${DEFAULT_PORT}`;
  }
  return `http://localhost:${DEFAULT_PORT}`;
};

export const API_BASE = `${getHost()}/api`;
export const HEALTH_URL = `${getHost()}/health`;

const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('@skillsphere:token');
  } catch {
    return null;
  }
};

const handleResponse = async (response) => {
  try {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  } catch (err) {
    if (err.message) throw err;
    throw new Error('Failed to parse server response');
  }
};

export async function get(path, authenticated = true) {
  const headers = { 'Content-Type': 'application/json' };

  if (authenticated) {
    const token = await getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers
  });
  return handleResponse(res);
}

export async function post(path, data, authenticated = true) {
  const headers = { 'Content-Type': 'application/json' };

  if (authenticated) {
    const token = await getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  console.log(`📡 POST ${API_BASE}${path}`, JSON.stringify(data));

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    const result = await handleResponse(res);
    console.log(`📡 POST ${path} response:`, JSON.stringify(result));
    return result;
  } catch (err) {
    console.log(`❌ POST ${path} error:`, err.message);
    if (err.message === 'Network request failed') {
      throw new Error('Cannot connect to server. Make sure the backend is running.');
    }
    throw err;
  }
}

export async function put(path, data, authenticated = true) {
  const headers = { 'Content-Type': 'application/json' };

  if (authenticated) {
    const token = await getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function del(path, authenticated = true) {
  const headers = { 'Content-Type': 'application/json' };

  if (authenticated) {
    const token = await getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers
  });
  return handleResponse(res);
}

export async function patch(path, data, authenticated = true) {
  const headers = { 'Content-Type': 'application/json' };

  if (authenticated) {
    const token = await getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function health() {
  try {
    const res = await fetch(HEALTH_URL);
    return res.json();
  } catch (error) {
    return { status: 'ERROR', message: error.message };
  }
}

// Upload file with FormData
export async function uploadFile(formData, authenticated = true) {
  const headers = {};

  if (authenticated) {
    const token = await getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData - browser will set it automatically with boundary
  const res = await fetch(`${API_BASE}/upload/file`, {
    method: 'POST',
    headers,
    body: formData
  });
  return handleResponse(res);
}

// Auth APIs
export const authAPI = {
  login: (email, password) => post('/auth/login', { email, password }, false),
  register: (data) => post('/auth/register', data, false),
  getProfile: () => get('/auth/profile'),
  updateProfile: (data) => put('/auth/profile', data),
  changePassword: (data) => put('/auth/change-password', data),
  // OTP Authentication (for signup)
  sendOTP: (email, name) => post('/auth/send-otp', { email, name }, false),
  verifyOTP: (email, otp) => post('/auth/verify-otp', { email, otp }, false),
  resendOTP: (email) => post('/auth/resend-otp', { email }, false),
  completeRegistration: (data) => post('/auth/complete-registration', data, false),
  // OTP Login (for existing users)
  sendLoginOTP: (email) => post('/auth/send-login-otp', { email }, false),
  loginWithOTP: (email, otp) => post('/auth/login-with-otp', { email, otp }, false),
  // Password Reset
  forgotPassword: (email) => post('/auth/forgot-password', { email }, false),
  resetPassword: (email, otp, newPassword) => post('/auth/reset-password', { email, otp, newPassword }, false),
  verifySignupOTP: (email, otp) => post('/auth/verify-signup-otp', { email, otp }, false),
  // Google OAuth
  googleAuth: (idToken) => post('/auth/google-auth', { idToken }, false),
};

// Admin APIs
export const adminAPI = {
  getAll: () => get('/admins'),
  getById: (id) => get(`/admins/${id}`),
  create: (data) => post('/admins', data),
  update: (id, data) => put(`/admins/${id}`, data),
  toggleStatus: (id) => patch(`/admins/${id}/toggle-status`, {}),
  updatePermissions: (id, permissions) => patch(`/admins/${id}/permissions`, { permissions }),
  delete: (id) => del(`/admins/${id}`),
};

// User APIs
export const userAPI = {
  getAll: () => get('/users'),
  getStudents: () => get('/users/students'),
  getExperts: () => get('/users/experts'),
  getById: (id) => get(`/users/${id}`),
  update: (id, data) => put(`/users/${id}`, data),
  toggleStatus: (id) => patch(`/users/${id}/toggle-status`, {}),
  delete: (id) => del(`/users/${id}`),
  getStats: (id) => get(`/users/stats/${id || ''}`),
};

// Category APIs
export const categoryAPI = {
  getAll: () => get('/categories', false), // Public access
  getById: (id) => get(`/categories/${id}`, false), // Public access
  create: (data) => post('/categories', data),
  update: (id, data) => put(`/categories/${id}`, data),
  delete: (id) => del(`/categories/${id}`),
};

// Course APIs
export const courseAPI = {
  getAll: () => get('/courses', false), // Public access
  getById: (id) => get(`/courses/${id}`, false), // Public access
  create: (data) => post('/courses', data),
  update: (id, data) => put(`/courses/${id}`, data),
  delete: (id) => del(`/courses/${id}`),
  publish: (id) => patch(`/courses/${id}/publish`, {}),
};

// Topic APIs
export const topicAPI = {
  getAll: () => get('/topics'),
  getById: (id) => get(`/topics/${id}`),
  create: (data) => post('/topics', data),
  update: (id, data) => put(`/topics/${id}`, data),
  delete: (id) => del(`/topics/${id}`),
};

// Material APIs
export const materialAPI = {
  getAll: () => get('/materials'),
  getById: (id) => get(`/materials/${id}`),
  create: (data) => post('/materials', data),
  update: (id, data) => put(`/materials/${id}`, data),
  delete: (id) => del(`/materials/${id}`),
};

// Enrollment APIs
export const enrollmentAPI = {
  enroll: (courseId) => post('/enrollments', { courseId }),
  getMyEnrollments: () => get('/enrollments/my'),
  getAllEnrollments: () => get('/enrollments/all'),
  updateProgress: (courseId, progress) => put('/enrollments/progress', { courseId, progress }),
  checkEnrollment: (courseId) => get(`/enrollments/check/${courseId}`),
  unenroll: (courseId) => del(`/enrollments/${courseId}`),
};

// Quiz APIs
export const quizAPI = {
  getAll: (params) => get(`/quizzes${params ? `?${new URLSearchParams(params)}` : ''}`),
  getById: (id) => get(`/quizzes/${id}`),
  create: (data) => post('/quizzes', data),
  update: (id, data) => put(`/quizzes/${id}`, data),
  delete: (id) => del(`/quizzes/${id}`),
  submit: (data) => post('/quizzes/submit', data),
  getMyResults: () => get('/quizzes/results'),
  addQuestion: (data) => post('/quizzes/questions', data),
  updateQuestion: (id, data) => put(`/quizzes/questions/${id}`, data),
  deleteQuestion: (id) => del(`/quizzes/questions/${id}`),
};

// Certificate APIs
export const certificateAPI = {
  generate: (data) => post('/certificates', data),
  getMyCertificates: () => get('/certificates/my'),
  getAllCertificates: () => get('/certificates/all'),
  getById: (id) => get(`/certificates/${id}`),
  verify: (certificateId) => get(`/certificates/verify/${certificateId}`),
  delete: (id) => del(`/certificates/${id}`),
};

// Certificate Template APIs
export const certificateTemplateAPI = {
  getAll: () => get('/certificate-templates'),
  getActive: () => get('/certificate-templates/active'),
  getActivePerCourse: () => get('/certificate-templates/active-per-course'),
  getById: (id) => get(`/certificate-templates/${id}`),
  getForCourse: (courseId) => get(`/certificate-templates/for-course/${courseId}`),
  create: (data) => post('/certificate-templates', data),
  update: (id, data) => put(`/certificate-templates/${id}`, data),
  activate: (id) => put(`/certificate-templates/${id}/activate`, {}),
  activateForCourses: (id, courseIds) => put(`/certificate-templates/${id}/activate-for-courses`, { courseIds }),
  delete: (id) => del(`/certificate-templates/${id}`),
  getStats: () => get('/certificate-templates/stats'),
  // Fetch preview PDF with authentication and return blob URL
  getPreview: async (id) => {
    const token = await AsyncStorage.getItem('@skillsphere:token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const url = `${API_BASE}/certificate-templates/preview${id ? `/${id}` : ''}`;
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to load preview' }));
      throw new Error(error.error || 'Failed to load preview');
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
  uploadBackground: async (id, formData) => {
    const token = await AsyncStorage.getItem('@skillsphere:token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/certificate-templates/${id}/upload/background`, {
      method: 'POST',
      headers,
      body: formData
    });
    return handleResponse(res);
  },
  uploadSignature: async (id, formData) => {
    const token = await AsyncStorage.getItem('@skillsphere:token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/certificate-templates/${id}/upload/signature`, {
      method: 'POST',
      headers,
      body: formData
    });
    return handleResponse(res);
  },
};

// Notification APIs
export const notificationAPI = {
  getMyNotifications: (unreadOnly) => get(`/notifications/my${unreadOnly ? '?unreadOnly=true' : ''}`),
  markAsRead: (id) => put(`/notifications/read/${id}`, {}),
  markAllAsRead: () => put('/notifications/read-all', {}),
  delete: (id) => del(`/notifications/${id}`),
  clearAll: () => del('/notifications/clear'),
};

// Progress APIs
export const progressAPI = {
  updateTopicProgress: (data) => post('/progress/topic', data),
  getCourseProgress: (courseId) => get(`/progress/course/${courseId}`),
  getMyProgress: () => get('/progress/my'),
  getLearningStats: () => get('/progress/stats'),
  resetCourseProgress: (courseId) => del(`/progress/reset/${courseId}`),
};

// Feedback APIs
export const feedbackAPI = {
  getAll: () => get('/feedback'),
  getById: (id) => get(`/feedback/${id}`),
  create: (data) => post('/feedback', data),
  update: (id, data) => put(`/feedback/${id}`, data),
  delete: (id) => del(`/feedback/${id}`),
};

// Upload APIs
export const uploadAPI = {
  uploadFile: (formData) => uploadFile(formData),
};

// AI Chat APIs
export const aiChatAPI = {
  // Sessions
  createSession: (data) => post('/ai-chat/sessions', data || {}),
  getSessions: () => get('/ai-chat/sessions'),
  getSession: (id) => get(`/ai-chat/sessions/${id}`),
  updateSession: (id, data) => put(`/ai-chat/sessions/${id}`, data),
  deleteSession: (id) => del(`/ai-chat/sessions/${id}`),
  // Messages
  sendMessage: (sessionId, content) => post(`/ai-chat/sessions/${sessionId}/messages`, { content }),
};

export default {
  API_BASE,
  HEALTH_URL,
  get,
  post,
  put,
  del,
  patch,
  health,
  authAPI,
  adminAPI,
  userAPI,
  categoryAPI,
  courseAPI,
  topicAPI,
  materialAPI,
  enrollmentAPI,
  quizAPI,
  certificateAPI,
  certificateTemplateAPI,
  notificationAPI,
  progressAPI,
  feedbackAPI,
  uploadAPI,
  aiChatAPI
};
