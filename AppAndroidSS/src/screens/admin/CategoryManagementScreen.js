import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ScrollView,
  Modal,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MainLayout from '../../components/ui/MainLayout';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

// Color palette for category cards
const CATEGORY_COLORS = [
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#F97316', // Orange
  '#EF4444', // Red
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F59E0B', // Amber
];

const CategoryManagementScreen = () => {
  const { categories, courses, addCategory, deleteCategory } = useData();
  const { user, logout } = useAuth();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [newCategory, setNewCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;
  const isTablet = width > 768;
  const isMobile = width <= 480;

  const isSuperAdmin = user?.role === 'superadmin';

  // Sidebar navigation items based on user role
  const sidebarItems = isSuperAdmin ? [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Manage Admins', icon: 'person-outline', iconActive: 'person', route: 'ManageAdmins' },
    { label: 'Manage Experts', icon: 'people-outline', iconActive: 'people', route: 'ManageExperts' },
    { label: 'All Courses', icon: 'book-outline', iconActive: 'book', route: 'Courses' },
    { label: 'All Students', icon: 'school-outline', iconActive: 'school', route: 'Students' },
    { label: 'Categories', icon: 'layers-outline', iconActive: 'layers', route: 'Categories' },
    { label: 'Certificates', icon: 'ribbon-outline', iconActive: 'ribbon', route: 'CertificateManagement' },
  ] : [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Skill Categories', icon: 'layers-outline', iconActive: 'layers', route: 'CategoryManagement' },
    { label: 'Manage Courses', icon: 'book-outline', iconActive: 'book', route: 'Courses' },
    { label: 'Students', icon: 'people-outline', iconActive: 'people', route: 'Students' },
    { label: 'Certificates', icon: 'ribbon-outline', iconActive: 'ribbon', route: 'CertificateManagement' },
    { label: 'Expert Feedback', icon: 'chatbubbles-outline', iconActive: 'chatbubbles', route: 'Feedback' },
  ];

  // Calculate stats
  const stats = useMemo(() => {
    const totalCategories = categories.length;
    const totalCourses = courses.length;
    const avgCoursesPerCategory = totalCategories > 0
      ? Math.round(totalCourses / totalCategories)
      : 0;
    return { totalCategories, totalCourses, avgCoursesPerCategory };
  }, [categories, courses]);

  // Get course count for each category
  const getCourseCount = (categoryId) => {
    return courses.filter(course => course.category?.id === categoryId).length;
  };

  // Get color for category based on index
  const getCategoryColor = (index) => {
    return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  };

  const handleNavigate = (route) => {
    if (isSuperAdmin) {
      if (route === 'ManageAdmins') {
        navigation.navigate('ManageUsers', { userType: 'admin' });
      } else if (route === 'ManageExperts') {
        navigation.navigate('ManageUsers', { userType: 'expert' });
      } else if (route === 'Categories') {
        navigation.navigate('CategoryManagement');
      } else {
        navigation.navigate(route);
      }
    } else {
      navigation.navigate(route);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a category name',
      });
      return;
    }

    if (categories.some(c => c.name.toLowerCase() === newCategory.trim().toLowerCase())) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Category already exists',
      });
      return;
    }

    const result = await addCategory(newCategory.trim());
    if (result.success) {
      setNewCategory('');
      setShowAddModal(false);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Category added successfully!',
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: result.error || 'Failed to add category',
      });
    }
  };

  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    setShowConfirmDialog(false);
    if (categoryToDelete) {
      const result = await deleteCategory(categoryToDelete.id);
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Category deleted successfully',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: result.error || 'Failed to delete category',
        });
      }
      setCategoryToDelete(null);
    }
  };

  const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile);

  const renderCategoryCard = (category, index) => {
    const courseCount = getCourseCount(category.id);
    const color = getCategoryColor(index);

    return (
      <Animated.View
        key={category.id}
        entering={FadeInDown.duration(400).delay(index * 80)}
        style={styles.categoryCardWrapper}
      >
        <TouchableOpacity
          style={[
            styles.categoryCard,
            { backgroundColor: isDark ? theme.colors.card : theme.colors.surface },
          ]}
          activeOpacity={0.7}
          onLongPress={() => handleDeleteClick(category)}
        >
          {/* Course Count Badge */}
          <View style={styles.courseCountBadge}>
            <Text style={[styles.courseCountNumber, { color: theme.colors.primary }]}>
              {courseCount}
            </Text>
            <Text style={[styles.courseCountLabel, { color: theme.colors.textSecondary }]}>
              courses
            </Text>
          </View>

          {/* Category Icon - Using first letter with colored background */}
          <View style={[styles.categoryIconContainer, { backgroundColor: color + '20' }]}>
            <Text style={[styles.categoryIconText, { color: color }]}>
              {category.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          {/* Category Name */}
          <Text style={[styles.categoryName, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {category.name}
          </Text>

          {/* Delete Button */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteClick(category)}
          >
            <Icon name="trash-outline" size={18} color={theme.colors.error} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <MainLayout
      showSidebar={true}
      sidebarItems={sidebarItems}
      activeRoute={isSuperAdmin ? "Categories" : "CategoryManagement"}
      onNavigate={handleNavigate}
      userInfo={{ name: user?.name, role: isSuperAdmin ? 'Super Admin' : 'Administrator', avatar: user?.avatar }}
      onLogout={logout}
      onSettings={() => navigation.navigate('Settings')}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerTextContainer}>
            <View style={styles.titleRow}>
              <TouchableOpacity
                style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-back" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.pageTitle, { color: theme.colors.textPrimary }]}>
                Skill Categories
              </Text>
            </View>
            <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>
              Organize your courses into meaningful categories
            </Text>
          </View>
          <AppButton
            title="Add Category"
            onPress={() => setShowAddModal(true)}
            variant="primary"
            style={styles.addButton}
            leftIcon="add"
          />
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <AppCard style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Total Categories
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {stats.totalCategories}
            </Text>
          </AppCard>

          <AppCard style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Total Courses
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {stats.totalCourses}
            </Text>
          </AppCard>

          <AppCard style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Avg Courses per Category
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {stats.avgCoursesPerCategory}
            </Text>
          </AppCard>
        </View>

        {/* Categories Grid */}
        {categories.length > 0 ? (
          <View style={styles.categoriesGrid}>
            {categories.map((category, index) => renderCategoryCard(category, index))}
          </View>
        ) : (
          <AppCard style={styles.emptyContainer}>
            <EmptyState
              icon="layers-outline"
              title="No categories yet"
              subtitle="Add your first category to organize your courses"
              actionLabel="Add Category"
              onAction={() => setShowAddModal(true)}
            />
          </AppCard>
        )}
      </ScrollView>

      {/* Add Category Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? theme.colors.card : theme.colors.background }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  Create New Category
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  Add a new skill category to organize your courses
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAddModal(false)}
              >
                <Icon name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <View style={styles.modalBody}>
              <AppInput
                label="Category Name"
                value={newCategory}
                onChangeText={setNewCategory}
                placeholder="e.g., Web Development"
              />
            </View>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <AppButton
                title="Cancel"
                onPress={() => {
                  setNewCategory('');
                  setShowAddModal(false);
                }}
                variant="outline"
                style={styles.modalCancelButton}
              />
              <AppButton
                title="Create Category"
                onPress={handleAddCategory}
                variant="primary"
                style={styles.modalCreateButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={showConfirmDialog}
        title="Delete Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name}" category? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirmDialog(false);
          setCategoryToDelete(null);
        }}
      />
    </MainLayout>
  );
};

const getStyles = (theme, isDark, isLargeScreen, isTablet, isMobile) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: isMobile ? 16 : 24,
      paddingBottom: 40,
    },

    // Header Section
    headerSection: {
      flexDirection: isTablet ? 'row' : 'column',
      justifyContent: 'space-between',
      alignItems: isTablet ? 'center' : 'flex-start',
      marginBottom: 24,
      gap: 16,
    },
    headerTextContainer: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 4,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    pageTitle: {
      fontSize: isMobile ? 24 : 28,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
    },
    pageSubtitle: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.regular,
    },
    addButton: {
      minWidth: isMobile ? '100%' : 150,
    },

    // Stats Section
    statsSection: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      minWidth: isMobile ? '100%' : isTablet ? 180 : 200,
      maxWidth: isLargeScreen ? 300 : undefined,
      padding: 20,
    },
    statLabel: {
      fontSize: 13,
      marginBottom: 8,
      fontFamily: theme.typography.fontFamily.regular,
    },
    statValue: {
      fontSize: isMobile ? 28 : 36,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
    },

    // Categories Grid
    categoriesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    categoryCardWrapper: {
      width: isLargeScreen
        ? 'calc(33.333% - 11px)'
        : isTablet
          ? 'calc(50% - 8px)'
          : '100%',
      ...(Platform.OS !== 'web' && {
        width: isLargeScreen ? '31%' : isTablet ? '48%' : '100%',
      }),
    },
    categoryCard: {
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border,
      minHeight: 160,
      position: 'relative',
      ...theme.shadows.sm,
    },
    courseCountBadge: {
      position: 'absolute',
      top: 16,
      right: 16,
      alignItems: 'flex-end',
    },
    courseCountNumber: {
      fontSize: 24,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
    },
    courseCountLabel: {
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.regular,
    },
    categoryIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    categoryIconText: {
      fontSize: 24,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
    },
    categoryName: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
      marginBottom: 8,
    },
    deleteButton: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      padding: 8,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.1)',
    },

    // Empty State
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
    },

    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 480,
      borderRadius: 16,
      padding: 24,
      ...theme.shadows.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 24,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 4,
      fontFamily: theme.typography.fontFamily.bold,
    },
    modalSubtitle: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.regular,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalBody: {
      marginBottom: 24,
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    modalCancelButton: {
      minWidth: 100,
    },
    modalCreateButton: {
      minWidth: 140,
    },
  });

export default CategoryManagementScreen;
