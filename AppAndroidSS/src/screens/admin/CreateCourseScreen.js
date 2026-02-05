import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Image,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MainLayout from '../../components/ui/MainLayout';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';
import SearchableDropdown from '../../components/ui/SearchableDropdown';
import AddMaterialModal from '../../components/AddMaterialModal';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { uploadAPI } from '../../services/apiClient';
import { resolveFileUrl } from '../../utils/urlHelpers';

const CreateCourseScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { courseId, courseData } = route.params || {};
  const { addCourse, updateCourse, categories } = useData();
  const { user, logout } = useAuth();
  const isEditMode = !!courseId;
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();

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

  const handleNavigate = (navRoute) => {
    if (isSuperAdmin) {
      if (navRoute === 'ManageAdmins') {
        navigation.navigate('ManageUsers', { userType: 'admin' });
      } else if (navRoute === 'ManageExperts') {
        navigation.navigate('ManageUsers', { userType: 'expert' });
      } else if (navRoute === 'Categories') {
        navigation.navigate('CategoryManagement');
      } else {
        navigation.navigate(navRoute);
      }
    } else {
      navigation.navigate(navRoute);
    }
  };

  const [courseName, setCourseName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('Beginner');
  const [language, setLanguage] = useState('English');
  const [category, setCategory] = useState(categories[0]?.name || '');
  const [duration, setDuration] = useState('');
  const [materials, setMaterials] = useState([]);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [thumbnailImage, setThumbnailImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const categoryNames = categories.map(cat => cat.name);
  const levels = ['Beginner', 'Intermediate', 'Advanced'];
  const languages = ['English', 'Urdu'];

  // Pre-fill form when editing
  useEffect(() => {
    if (isEditMode && courseData) {
      setCourseName(courseData.name || '');
      setDescription(courseData.description || '');
      setLevel(courseData.level || 'Beginner');
      setLanguage(courseData.language || 'English');
      setCategory(courseData.category?.name || categories[0]?.name || '');
      setDuration(courseData.duration || '');
      setThumbnailImage(courseData.thumbnailImage || null);
      setMaterials(courseData.materials || []);
    }
  }, [isEditMode, courseData]);

  const handleAddMaterial = (newMaterial) => {
    setMaterials((prev) => [...prev, newMaterial]);
  };

  const handleRemoveMaterial = (id) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const handleImagePick = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/jpg';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          await uploadThumbnail(file);
        }
      };
      input.click();
    } else {
      Toast.show({
        type: 'info',
        text1: 'Coming Soon',
        text2: 'Image upload on mobile coming soon',
      });
    }
  };

  const uploadThumbnail = async (file) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);
      const response = await uploadAPI.uploadFile(formData);
      if (response.success) {
        setThumbnailImage(response.file.url);
        Toast.show({ type: 'success', text1: 'Success', text2: 'Thumbnail uploaded!' });
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to upload' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!courseName || !description || !category || !duration) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please fill all required fields' });
      return;
    }

    const selectedCategory = categories.find(cat => cat.name === category);
    if (!selectedCategory) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Invalid category selected' });
      return;
    }

    const formattedMaterials = materials.map(m => ({
      type: m.type,
      uri: m.uri,
      title: m.fileName || m.uri,
      description: m.description || '',
    }));

    const payload = {
      name: courseName,
      description,
      level,
      language,
      categoryId: selectedCategory.id,
      duration,
      materials: formattedMaterials,
      thumbnailImage,
    };

    if (isEditMode) {
      const result = await updateCourse(courseId, payload);
      if (result.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Course updated!' });
        navigation.goBack();
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: result.error || 'Failed to update' });
      }
    } else {
      const result = await addCourse(payload);
      if (result.success) {
        setCourseName('');
        setDescription('');
        setLevel('Beginner');
        setLanguage('English');
        setCategory(categories[0]?.name || '');
        setDuration('');
        setMaterials([]);
        setThumbnailImage(null);
        Toast.show({ type: 'success', text1: 'Success', text2: 'Course created!' });
        navigation.navigate('AddTopics', { courseId: result.course.id });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: result.error || 'Failed to create' });
      }
    }
  };

  const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile);

  return (
    <MainLayout
      showSidebar={true}
      sidebarItems={sidebarItems}
      activeRoute="Courses"
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
                {isEditMode ? 'Edit Course' : 'Create New Course'}
              </Text>
            </View>
            <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>
              {isEditMode ? 'Update your course information' : 'Add a new course to your catalog'}
            </Text>
          </View>
        </View>

        {/* Form Grid */}
        <View style={styles.formGrid}>
          {/* Left Column - Main Info */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.mainColumn}>
            {/* Basic Info Card */}
            <AppCard style={styles.formCard}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                Basic Information
              </Text>

              <AppInput
                label="Course Name *"
                value={courseName}
                onChangeText={setCourseName}
                placeholder="Enter course name"
              />

              <AppInput
                label="Description *"
                value={description}
                onChangeText={setDescription}
                placeholder="Enter course description..."
                multiline={true}
                numberOfLines={4}
              />

              <SearchableDropdown
                label="Category *"
                options={categoryNames}
                selectedValue={category}
                onSelect={setCategory}
                placeholder="Select a category"
              />

              <AppInput
                label="Duration *"
                value={duration}
                onChangeText={setDuration}
                placeholder="e.g., 4 weeks, 10 hours"
              />
            </AppCard>

            {/* Course Settings Card */}
            <AppCard style={styles.formCard}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                Course Settings
              </Text>

              <View style={styles.optionGroup}>
                <Text style={[styles.optionLabel, { color: theme.colors.textSecondary }]}>Level *</Text>
                <View style={styles.optionsRow}>
                  {levels.map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.optionChip,
                        {
                          backgroundColor: level === lvl ? theme.colors.primary : (isDark ? theme.colors.card : theme.colors.surface),
                          borderColor: level === lvl ? theme.colors.primary : theme.colors.border,
                        }
                      ]}
                      onPress={() => setLevel(lvl)}
                    >
                      <Text style={[
                        styles.optionChipText,
                        { color: level === lvl ? '#FFFFFF' : theme.colors.textSecondary }
                      ]}>
                        {lvl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.optionGroup}>
                <Text style={[styles.optionLabel, { color: theme.colors.textSecondary }]}>Language *</Text>
                <View style={styles.optionsRow}>
                  {languages.map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      style={[
                        styles.optionChip,
                        {
                          backgroundColor: language === lang ? theme.colors.primary : (isDark ? theme.colors.card : theme.colors.surface),
                          borderColor: language === lang ? theme.colors.primary : theme.colors.border,
                        }
                      ]}
                      onPress={() => setLanguage(lang)}
                    >
                      <Text style={[
                        styles.optionChipText,
                        { color: language === lang ? '#FFFFFF' : theme.colors.textSecondary }
                      ]}>
                        {lang}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </AppCard>
          </Animated.View>

          {/* Right Column - Media & Materials */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.sideColumn}>
            {/* Thumbnail Card */}
            <AppCard style={styles.formCard}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                Course Thumbnail
              </Text>

              {thumbnailImage ? (
                <View style={styles.thumbnailPreviewContainer}>
                  <Image
                    source={{ uri: resolveFileUrl(thumbnailImage) }}
                    style={styles.thumbnailPreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={[styles.removeThumbnailBtn, { backgroundColor: theme.colors.error }]}
                    onPress={() => setThumbnailImage(null)}
                  >
                    <Icon name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadPlaceholder, { borderColor: theme.colors.border, backgroundColor: isDark ? theme.colors.card : theme.colors.background }]}
                  onPress={handleImagePick}
                  disabled={uploadingImage}
                >
                  <Icon name="cloud-upload-outline" size={36} color={theme.colors.textTertiary} />
                  <Text style={[styles.uploadText, { color: theme.colors.textSecondary }]}>
                    {uploadingImage ? 'Uploading...' : 'Click to upload'}
                  </Text>
                  <Text style={[styles.uploadHint, { color: theme.colors.textTertiary }]}>
                    PNG, JPG up to 5MB
                  </Text>
                </TouchableOpacity>
              )}
            </AppCard>

            {/* Materials Card */}
            <AppCard style={styles.formCard}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                  Course Materials
                </Text>
                <TouchableOpacity
                  style={[styles.addMaterialBtn, { backgroundColor: theme.colors.primary + '15' }]}
                  onPress={() => setShowAddMaterialModal(true)}
                >
                  <Icon name="add" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>

              {materials.length === 0 ? (
                <View style={[styles.emptyMaterials, { borderColor: theme.colors.border }]}>
                  <Icon name="folder-open-outline" size={28} color={theme.colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No materials added
                  </Text>
                </View>
              ) : (
                <View style={styles.materialsList}>
                  {materials.map((material) => (
                    <View
                      key={material.id}
                      style={[styles.materialItem, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.background, borderColor: theme.colors.border }]}
                    >
                      <Icon
                        name={material.type === 'pdf' ? 'document-text-outline' : material.type === 'image' ? 'image-outline' : 'code-slash-outline'}
                        size={18}
                        color={theme.colors.primary}
                      />
                      <Text style={[styles.materialName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {material.fileName || material.uri || 'Material'}
                      </Text>
                      <TouchableOpacity onPress={() => handleRemoveMaterial(material.id)}>
                        <Icon name="close-circle" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </AppCard>
          </Animated.View>
        </View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.actionSection}>
          <AppButton
            title="Cancel"
            onPress={() => navigation.goBack()}
            variant="outline"
            style={styles.cancelBtn}
          />
          <AppButton
            title={isEditMode ? 'Update Course' : 'Create Course'}
            onPress={handleSubmit}
            variant="primary"
            style={styles.submitBtn}
            leftIcon={isEditMode ? 'save-outline' : 'checkmark'}
          />
        </Animated.View>
      </ScrollView>

      <AddMaterialModal
        visible={showAddMaterialModal}
        onClose={() => setShowAddMaterialModal(false)}
        onAddMaterial={handleAddMaterial}
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
      marginBottom: 24,
      width: '100%',
    },
    headerTextContainer: {
      width: '100%',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 4,
      flexWrap: 'wrap',
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
      fontSize: isMobile ? 20 : 28,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
      flex: isMobile ? 1 : undefined,
    },
    pageSubtitle: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Form Grid
    formGrid: {
      flexDirection: isTablet ? 'row' : 'column',
      gap: 20,
    },
    mainColumn: {
      flex: isTablet ? 2 : undefined,
      width: isTablet ? undefined : '100%',
      gap: 20,
    },
    sideColumn: {
      flex: isTablet ? 1 : undefined,
      width: isTablet ? undefined : '100%',
      gap: 20,
    },

    // Cards
    formCard: {
      padding: isMobile ? 16 : 20,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 16,
      fontFamily: theme.typography.fontFamily.semiBold,
    },

    // Options
    optionGroup: {
      marginBottom: 20,
    },
    optionLabel: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 10,
      fontFamily: theme.typography.fontFamily.medium,
    },
    optionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    optionChip: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
    },
    optionChipText: {
      fontSize: 14,
      fontWeight: '500',
      fontFamily: theme.typography.fontFamily.medium,
    },

    // Thumbnail
    thumbnailPreviewContainer: {
      position: 'relative',
      height: 160,
      borderRadius: 12,
      overflow: 'hidden',
    },
    thumbnailPreview: {
      width: '100%',
      height: '100%',
    },
    removeThumbnailBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    uploadPlaceholder: {
      height: 160,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    uploadText: {
      fontSize: 14,
      fontWeight: '500',
      fontFamily: theme.typography.fontFamily.medium,
    },
    uploadHint: {
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Materials
    addMaterialBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyMaterials: {
      padding: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      alignItems: 'center',
      gap: 8,
    },
    emptyText: {
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.regular,
    },
    materialsList: {
      gap: 8,
    },
    materialItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      gap: 10,
    },
    materialName: {
      flex: 1,
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Actions
    actionSection: {
      flexDirection: isMobile ? 'column-reverse' : 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 24,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border,
    },
    cancelBtn: {
      minWidth: isMobile ? '100%' : 100,
    },
    submitBtn: {
      minWidth: isMobile ? '100%' : 160,
    },
  });

export default CreateCourseScreen;
