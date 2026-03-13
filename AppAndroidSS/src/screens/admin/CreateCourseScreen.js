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

const ORANGE = '#FF8C42';

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
  const [creationMode, setCreationMode] = useState('ai'); // 'ai' | 'manual'
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
      setCreationMode(courseData.creationMode || 'ai');
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
      creationMode,
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
        navigation.navigate('AddTopics', { courseId: result.course.id, creationMode });
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
        {/* Page Banner */}
        <View style={{
          backgroundColor: isDark ? 'rgba(255,140,66,0.06)' : 'rgba(255,140,66,0.05)',
          borderColor: 'rgba(255,140,66,0.15)',
          borderRadius: 16,
          borderWidth: 1,
          padding: 20,
          marginBottom: 24,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}>
          <TouchableOpacity
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,46,0.08)',
              borderRadius: 10,
              padding: 10,
            }}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ backgroundColor: ORANGE + '20', borderRadius: 12, padding: 12 }}>
            <Icon name="create" size={22} color={ORANGE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' }}>
              {isEditMode ? 'Edit Course' : 'Create New Course'}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Fill in course details below</Text>
          </View>
        </View>

        {/* Form Grid */}
        <View style={styles.formGrid}>
          {/* Left Column - Main Info */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.mainColumn}>

            {/* Course Details Section */}
            <View style={styles.formCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconWrap, { backgroundColor: '#6366F1' + '18' }]}>
                  <Icon name="book" size={18} color="#6366F1" />
                </View>
                <View style={styles.sectionTitleBlock}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Course Details</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                    Basic information about your course
                  </Text>
                </View>
              </View>

              <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.08)' }]} />

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
            </View>

            {/* Settings Section */}
            <View style={styles.formCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconWrap, { backgroundColor: ORANGE + '18' }]}>
                  <Icon name="settings" size={18} color={ORANGE} />
                </View>
                <View style={styles.sectionTitleBlock}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Settings</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                    Configure level and language
                  </Text>
                </View>
              </View>

              <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : ORANGE + '12' }]} />

              <View style={styles.optionGroup}>
                <Text style={[styles.optionLabel, { color: theme.colors.textSecondary }]}>Level *</Text>
                <View style={styles.optionsRow}>
                  {levels.map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.optionChip,
                        {
                          backgroundColor: level === lvl ? ORANGE : (isDark ? theme.colors.card : theme.colors.surface),
                          borderColor: level === lvl ? ORANGE : theme.colors.border,
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
                          backgroundColor: language === lang ? ORANGE : (isDark ? theme.colors.card : theme.colors.surface),
                          borderColor: language === lang ? ORANGE : theme.colors.border,
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
            </View>
          </Animated.View>

          {/* Right Column - Media & Materials */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.sideColumn}>

            {/* Creation Mode Section */}
            <View style={styles.formCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconWrap, { backgroundColor: '#8B5CF6' + '18' }]}>
                  <Icon name="sparkles" size={18} color="#8B5CF6" />
                </View>
                <View style={styles.sectionTitleBlock}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Creation Mode</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                    How will content be created?
                  </Text>
                </View>
              </View>

              <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#8B5CF6' + '12' }]} />

              <TouchableOpacity
                style={[
                  styles.modeOption,
                  creationMode === 'ai' && { borderColor: '#8B5CF6', backgroundColor: '#8B5CF6' + '10' },
                  creationMode !== 'ai' && { borderColor: theme.colors.border },
                ]}
                onPress={() => setCreationMode('ai')}
              >
                <View style={[styles.modeIconWrap, { backgroundColor: creationMode === 'ai' ? '#8B5CF6' : theme.colors.surface }]}>
                  <Icon name="sparkles" size={20} color={creationMode === 'ai' ? '#fff' : theme.colors.textSecondary} />
                </View>
                <View style={styles.modeTextWrap}>
                  <Text style={[styles.modeTitle, { color: theme.colors.textPrimary }]}>AI Generated</Text>
                  <Text style={[styles.modeSubtitle, { color: theme.colors.textSecondary }]}>
                    Enter topic names — AI generates content automatically
                  </Text>
                </View>
                {creationMode === 'ai' && (
                  <Icon name="checkmark-circle" size={22} color="#8B5CF6" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeOption,
                  { marginTop: 10 },
                  creationMode === 'manual' && { borderColor: ORANGE, backgroundColor: ORANGE + '10' },
                  creationMode !== 'manual' && { borderColor: theme.colors.border },
                ]}
                onPress={() => setCreationMode('manual')}
              >
                <View style={[styles.modeIconWrap, { backgroundColor: creationMode === 'manual' ? ORANGE : theme.colors.surface }]}>
                  <Icon name="videocam" size={20} color={creationMode === 'manual' ? '#fff' : theme.colors.textSecondary} />
                </View>
                <View style={styles.modeTextWrap}>
                  <Text style={[styles.modeTitle, { color: theme.colors.textPrimary }]}>Manual (Videos)</Text>
                  <Text style={[styles.modeSubtitle, { color: theme.colors.textSecondary }]}>
                    Upload YouTube links, PDFs and files yourself
                  </Text>
                </View>
                {creationMode === 'manual' && (
                  <Icon name="checkmark-circle" size={22} color={ORANGE} />
                )}
              </TouchableOpacity>
            </View>

            {/* Media / Thumbnail Section */}
            <View style={styles.formCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconWrap, { backgroundColor: '#EC4899' + '18' }]}>
                  <Icon name="image" size={18} color="#EC4899" />
                </View>
                <View style={styles.sectionTitleBlock}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Course Thumbnail</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                    Upload a cover image for your course
                  </Text>
                </View>
              </View>

              <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#EC4899' + '12' }]} />

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
                  style={[
                    styles.uploadPlaceholder,
                    {
                      borderColor: isDark ? 'rgba(255,255,255,0.2)' : ORANGE + '50',
                      backgroundColor: isDark ? 'rgba(255,140,66,0.04)' : 'rgba(255,140,66,0.04)',
                    },
                  ]}
                  onPress={handleImagePick}
                  disabled={uploadingImage}
                >
                  <View style={[styles.uploadIconCircle, { backgroundColor: ORANGE + '18' }]}>
                    <Icon name="camera-outline" size={32} color={ORANGE} />
                  </View>
                  <Text style={[styles.uploadText, { color: theme.colors.textPrimary }]}>
                    {uploadingImage ? 'Uploading...' : 'Click to upload thumbnail'}
                  </Text>
                  <Text style={[styles.uploadHint, { color: theme.colors.textTertiary }]}>
                    PNG, JPG up to 5MB
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Course Materials Section */}
            <View style={styles.formCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconWrap, { backgroundColor: '#06B6D4' + '18' }]}>
                    <Icon name="folder-open" size={18} color="#06B6D4" />
                  </View>
                  <View style={styles.sectionTitleBlock}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                      Course Materials
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                      PDFs, images and files
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.addMaterialBtn, { backgroundColor: ORANGE + '18', borderColor: ORANGE + '30' }]}
                  onPress={() => setShowAddMaterialModal(true)}
                >
                  <Icon name="add" size={18} color={ORANGE} />
                </TouchableOpacity>
              </View>

              <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#06B6D4' + '12' }]} />

              {materials.length === 0 ? (
                <View style={[styles.emptyMaterials, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : theme.colors.border }]}>
                  <Icon name="folder-open-outline" size={28} color={theme.colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No materials added
                  </Text>
                  <Text style={[styles.emptyHint, { color: theme.colors.textTertiary }]}>
                    Tap + above to add files
                  </Text>
                </View>
              ) : (
                <View style={styles.materialsList}>
                  {materials.map((material) => {
                    const matType = material.type || 'file';
                    const matColor = matType === 'pdf' ? '#EF4444' : matType === 'image' ? '#EC4899' : '#06B6D4';
                    return (
                      <View
                        key={material.id}
                        style={[
                          styles.materialItem,
                          {
                            backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.background,
                            borderColor: theme.colors.border,
                            borderLeftColor: matColor,
                          },
                        ]}
                      >
                        <View style={[styles.materialIconWrap, { backgroundColor: matColor + '18' }]}>
                          <Icon
                            name={matType === 'pdf' ? 'document-text-outline' : matType === 'image' ? 'image-outline' : 'code-slash-outline'}
                            size={18}
                            color={matColor}
                          />
                        </View>
                        <Text style={[styles.materialName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                          {material.fileName || material.uri || 'Material'}
                        </Text>
                        <TouchableOpacity onPress={() => handleRemoveMaterial(material.id)}>
                          <Icon name="close-circle" size={20} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
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

    // Form Cards
    formCard: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)',
      padding: isMobile ? 16 : 20,
      ...(Platform.OS === 'web' && {
        boxShadow: isDark ? 'none' : '0 1px 8px rgba(26,26,46,0.06)',
      }),
    },

    // Section headers
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 0,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 0,
    },
    sectionIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionTitleBlock: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
      marginBottom: 1,
    },
    sectionSubtitle: {
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.regular,
    },
    sectionDivider: {
      height: 1,
      borderRadius: 1,
      marginVertical: 16,
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
      borderWidth: 1.5,
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
    uploadIconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    uploadText: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    uploadHint: {
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Materials
    addMaterialBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyMaterials: {
      padding: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      alignItems: 'center',
      gap: 6,
    },
    emptyText: {
      fontSize: 13,
      fontWeight: '500',
      fontFamily: theme.typography.fontFamily.medium,
    },
    emptyHint: {
      fontSize: 12,
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
      borderLeftWidth: 3,
      gap: 10,
    },
    materialIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    materialName: {
      flex: 1,
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Creation Mode
    modeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1.5,
      padding: 12,
      gap: 12,
    },
    modeIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modeTextWrap: {
      flex: 1,
    },
    modeTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 2,
    },
    modeSubtitle: {
      fontSize: 12,
      lineHeight: 16,
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
