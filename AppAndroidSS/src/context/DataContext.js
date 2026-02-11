import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import {
  categoryAPI,
  courseAPI,
  topicAPI,
  materialAPI,
  enrollmentAPI,
  quizAPI,
  certificateAPI,
  notificationAPI,
  progressAPI,
  userAPI,
  feedbackAPI,
} from '../services/apiClient';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [students, setStudents] = useState([]);
  const [experts, setExperts] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [progress, setProgress] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Categories
  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await categoryAPI.getAll();
      if (response.success) {
        setCategories(response.categories || []);
      }
      return response;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addCategory = async (name) => {
    try {
      const response = await categoryAPI.create({ name });
      if (response.success) {
        setCategories((prev) => [...prev, response.category]);
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteCategory = async (id) => {
    try {
      const response = await categoryAPI.delete(id);
      if (response.success) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Courses
  const fetchCourses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await courseAPI.getAll();
      if (response.success) {
        setCourses(response.courses || []);
      }
      return response;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCourseById = async (id) => {
    try {
      const response = await courseAPI.getById(id);
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const addCourse = async (courseData) => {
    try {
      const response = await courseAPI.create(courseData);
      if (response.success) {
        setCourses((prev) => [...prev, response.course]);
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateCourse = async (id, courseData) => {
    try {
      const response = await courseAPI.update(id, courseData);
      if (response.success) {
        setCourses((prev) => prev.map((c) => (c.id === id ? response.course : c)));
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteCourse = async (id) => {
    try {
      const response = await courseAPI.delete(id);
      if (response.success) {
        setCourses((prev) => prev.filter((c) => c.id !== id));
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const publishCourse = async (id) => {
    try {
      const response = await courseAPI.publish(id);
      if (response.success) {
        setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'published' } : c)));
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Topics
  const addTopic = async (topicData) => {
    try {
      const response = await topicAPI.create(topicData);
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateTopic = async (id, topicData) => {
    try {
      const response = await topicAPI.update(id, topicData);
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteTopic = async (id) => {
    try {
      const response = await topicAPI.delete(id);
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Materials
  const addMaterial = async (materialData) => {
    try {
      const response = await materialAPI.create(materialData);
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteMaterial = async (id) => {
    try {
      const response = await materialAPI.delete(id);
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Enrollments
  const fetchMyEnrollments = useCallback(async () => {
    try {
      const response = await enrollmentAPI.getMyEnrollments();
      if (response.success) {
        setEnrollments(response.enrollments || []);
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const enrollInCourse = async (courseId) => {
    try {
      const response = await enrollmentAPI.enroll(courseId);
      if (response.success) {
        setEnrollments((prev) => [...prev, response.enrollment]);
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const unenrollFromCourse = async (courseId) => {
    try {
      const response = await enrollmentAPI.unenroll(courseId);
      if (response.success) {
        setEnrollments((prev) => prev.filter((e) => e.courseId !== courseId));
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const checkEnrollment = async (courseId) => {
    try {
      const response = await enrollmentAPI.checkEnrollment(courseId);
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Progress
  const fetchMyProgress = useCallback(async () => {
    try {
      const response = await progressAPI.getMyProgress();
      if (response.success) {
        setProgress(response.progress || []);
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const updateTopicProgress = async (data) => {
    try {
      const response = await progressAPI.updateTopicProgress(data);
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const getLearningStats = async () => {
    try {
      const response = await progressAPI.getLearningStats();
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Quizzes
  const fetchQuizzes = useCallback(async (params) => {
    try {
      const response = await quizAPI.getAll(params);
      if (response.success) {
        setQuizzes(response.quizzes || []);
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const getQuizById = async (id) => {
    try {
      const response = await quizAPI.getById(id);
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const submitQuiz = async (data) => {
    try {
      const response = await quizAPI.submit(data);
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const getMyQuizResults = async () => {
    try {
      const response = await quizAPI.getMyResults();
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Certificates
  const fetchMyCertificates = useCallback(async () => {
    try {
      const response = await certificateAPI.getMyCertificates();
      if (response.success) {
        setCertificates(response.certificates || []);
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const generateCertificate = async (data) => {
    try {
      const response = await certificateAPI.generate(data);
      if (response.success) {
        setCertificates((prev) => [...prev, response.certificate]);
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Notifications
  const fetchMyNotifications = useCallback(async (unreadOnly = false) => {
    try {
      const response = await notificationAPI.getMyNotifications(unreadOnly);
      if (response.success) {
        setNotifications(response.notifications || []);
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const markNotificationAsRead = async (id) => {
    try {
      const response = await notificationAPI.markAsRead(id);
      if (response.success) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const response = await notificationAPI.markAllAsRead();
      if (response.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Users (Admin)
  const fetchStudents = useCallback(async () => {
    try {
      const response = await userAPI.getStudents();
      if (response.success) {
        setStudents(response.students || []);
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const fetchExperts = useCallback(async () => {
    try {
      const response = await userAPI.getExperts();
      if (response.success) {
        setExperts(response.experts || []);
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const updateUser = async (id, data) => {
    try {
      const response = await userAPI.update(id, data);
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteUser = async (id) => {
    try {
      const response = await userAPI.delete(id);
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const toggleUserStatus = async (id) => {
    try {
      const response = await userAPI.toggleStatus(id);
      if (response.success) {
        // Update students list
        await fetchStudents();
      }
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Feedback
  const fetchFeedback = useCallback(async () => {
    try {
      const response = await feedbackAPI.getAll();
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const addFeedback = async (data) => {
    try {
      const response = await feedbackAPI.create(data);
      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Initialize data on mount
  useEffect(() => {
    fetchCategories();
    fetchCourses();
  }, [fetchCategories, fetchCourses]);

  const value = {
    // State
    courses,
    categories,
    students,
    experts,
    enrollments,
    notifications,
    certificates,
    quizzes,
    progress,
    isLoading,
    error,

    // Categories
    fetchCategories,
    addCategory,
    deleteCategory,

    // Courses
    fetchCourses,
    getCourseById,
    addCourse,
    updateCourse,
    deleteCourse,
    publishCourse,

    // Topics
    addTopic,
    updateTopic,
    deleteTopic,

    // Materials
    addMaterial,
    deleteMaterial,

    // Enrollments
    fetchMyEnrollments,
    enrollInCourse,
    unenrollFromCourse,
    checkEnrollment,

    // Progress
    fetchMyProgress,
    updateTopicProgress,
    getLearningStats,

    // Quizzes
    fetchQuizzes,
    getQuizById,
    submitQuiz,
    getMyQuizResults,

    // Certificates
    fetchMyCertificates,
    generateCertificate,

    // Notifications
    fetchMyNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,

    // Users
    fetchStudents,
    fetchExperts,
    updateUser,
    deleteUser,
    toggleUserStatus,

    // Feedback
    fetchFeedback,
    addFeedback,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
