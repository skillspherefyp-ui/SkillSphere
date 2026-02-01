import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  TextInput,
  ActivityIndicator,
  Image,
  Linking,
  Modal,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MainLayout from '../../components/ui/MainLayout';
import AppCard from '../../components/ui/AppCard';
import AppButton from '../../components/ui/AppButton';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { certificateTemplateAPI, courseAPI, API_BASE } from '../../services/apiClient';

const CertificateManagementScreen = () => {
  const { user, logout } = useAuth();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;
  const isTablet = width > 768;
  const isMobile = width <= 480;

  const isSuperAdmin = user?.role === 'superadmin';

  // State
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCertificates: 0, hasActiveTemplate: false });
  const [recentCertificates, setRecentCertificates] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [activatingTemplate, setActivatingTemplate] = useState(null);
  const [activateCourseIds, setActivateCourseIds] = useState([]);
  const [activeAssignments, setActiveAssignments] = useState([]);

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: 'Default Template',
    primaryColor: '#4F46E5',
    secondaryColor: '#22D3EE',
    fontFamily: 'Arial, sans-serif',
    titleText: 'Certificate of Completion',
    subtitleText: 'This is to certify that',
    footerText: '',
  });

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

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, templatesRes, activeRes, coursesRes, activePerCourseRes] = await Promise.all([
        certificateTemplateAPI.getStats(),
        certificateTemplateAPI.getAll(),
        certificateTemplateAPI.getActive(),
        courseAPI.getAll(),
        certificateTemplateAPI.getActivePerCourse(),
      ]);

      if (statsRes.success) {
        setStats(statsRes.stats);
        setRecentCertificates(statsRes.recentCertificates || []);
      }

      if (templatesRes.success) {
        setTemplates(templatesRes.templates || []);
      }

      if (activeRes.success) {
        setActiveTemplate(activeRes.template);
      }

      if (coursesRes.courses) {
        setAllCourses(coursesRes.courses || []);
      }

      if (activePerCourseRes.success) {
        setActiveAssignments(activePerCourseRes.activeAssignments || []);
      }
    } catch (error) {
      console.error('Error fetching certificate data:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load certificate data' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create new template
  const handleCreateTemplate = async () => {
    try {
      setSaving(true);
      const response = await certificateTemplateAPI.create({
        ...templateForm,
        isActive: templates.length === 0,
        courseIds: selectedCourseIds,
      });

      if (response.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Template created successfully' });
        setShowTemplateModal(false);
        resetForm();
        fetchData();
      }
    } catch (error) {
      console.error('Error creating template:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to create template' });
    } finally {
      setSaving(false);
    }
  };

  // Update template
  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      setSaving(true);
      const response = await certificateTemplateAPI.update(editingTemplate.id, {
        ...templateForm,
        courseIds: selectedCourseIds,
      });

      if (response.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Template updated successfully' });
        setShowTemplateModal(false);
        setEditingTemplate(null);
        resetForm();
        fetchData();
      }
    } catch (error) {
      console.error('Error updating template:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to update template' });
    } finally {
      setSaving(false);
    }
  };

  // Activate template as global default
  const handleActivateTemplate = async (id) => {
    try {
      const response = await certificateTemplateAPI.activate(id);
      if (response.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Template set as default' });
        fetchData();
      }
    } catch (error) {
      console.error('Error activating template:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to activate template' });
    }
  };

  // Open activate for courses modal
  const openActivateForCoursesModal = (template) => {
    setActivatingTemplate(template);
    // Pre-select courses that already have this template active
    const preselected = (template.courses || [])
      .filter(c => c.TemplateCourse?.isActive)
      .map(c => c.id);
    setActivateCourseIds(preselected);
    setShowActivateModal(true);
  };

  // Activate template for specific courses
  const handleActivateForCourses = async () => {
    if (!activatingTemplate || activateCourseIds.length === 0) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please select at least one course' });
      return;
    }

    try {
      setSaving(true);
      const response = await certificateTemplateAPI.activateForCourses(activatingTemplate.id, activateCourseIds);
      if (response.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: response.message || 'Template activated for courses' });
        setShowActivateModal(false);
        setActivatingTemplate(null);
        setActivateCourseIds([]);
        fetchData();
      }
    } catch (error) {
      console.error('Error activating template for courses:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to activate template for courses' });
    } finally {
      setSaving(false);
    }
  };

  // Toggle course selection for activation
  const toggleActivateCourse = (courseId) => {
    setActivateCourseIds(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      }
      return [...prev, courseId];
    });
  };

  // Get active template for a course by checking all templates
  const getActiveTemplateForCourse = (courseId) => {
    if (!courseId) return null;

    // First check activeAssignments if available
    if (activeAssignments && activeAssignments.length > 0) {
      const assignment = activeAssignments.find(a => {
        // Handle different data structures for course ID
        const assignedCourseId = a.course?.id || a.course?._id || a.courseId;
        return assignedCourseId === courseId;
      });
      if (assignment?.template) {
        return assignment.template;
      }
    }

    // Fallback: Check templates directly for course assignments
    // This handles the case where activeAssignments might not be populated
    for (const template of templates) {
      // Check if course is in this template's courses array
      if (template.courses && template.courses.length > 0) {
        const courseAssignment = template.courses.find(c => {
          // Handle different data structures for course ID
          const cId = c.id || c.courseId || c._id;
          // If course is in the array, consider it assigned
          // Only exclude if TemplateCourse.isActive is explicitly set to false
          if (c.TemplateCourse && c.TemplateCourse.isActive === false) {
            return false;
          }
          return cId === courseId;
        });
        if (courseAssignment) {
          return template;
        }
      }

      // Also check if template has a courseIds array (raw IDs without full course objects)
      if (template.courseIds && template.courseIds.length > 0) {
        if (template.courseIds.includes(courseId)) {
          return template;
        }
      }
    }

    return null;
  };

  // Show delete confirmation modal
  const confirmDeleteTemplate = (template) => {
    setTemplateToDelete(template);
    setDeleteModalVisible(true);
  };

  // Delete template after confirmation
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    setDeleteModalVisible(false);
    try {
      Toast.show({ type: 'info', text1: 'Deleting', text2: 'Removing template...' });
      const response = await certificateTemplateAPI.delete(templateToDelete.id);
      if (response.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Template deleted successfully' });
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to delete template' });
    } finally {
      setTemplateToDelete(null);
    }
  };

  // Cancel delete
  const cancelDeleteTemplate = () => {
    setDeleteModalVisible(false);
    setTemplateToDelete(null);
  };

  // Handle color picker for web
  const handleColorChange = (field, color) => {
    setTemplateForm({ ...templateForm, [field]: color });
  };

  // Handle image upload (web-compatible)
  const handleUploadImage = async (templateId, type) => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/jpg,image/gif,image/webp';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          await uploadImage(templateId, type, file);
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

  const uploadImage = async (templateId, type, file) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append(type === 'background' ? 'background' : 'signature', file);

      const uploadFn = type === 'background'
        ? certificateTemplateAPI.uploadBackground
        : certificateTemplateAPI.uploadSignature;

      const response = await uploadFn(templateId, formData);

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `${type === 'background' ? 'Background' : 'Signature'} uploaded successfully`
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to upload image' });
    } finally {
      setUploadingImage(false);
    }
  };

  // Preview certificate
  const handlePreviewCertificate = async (templateId) => {
    try {
      Toast.show({ type: 'info', text1: 'Loading', text2: 'Generating preview...' });
      const blobUrl = await certificateTemplateAPI.getPreview(templateId);
      if (Platform.OS === 'web') {
        window.open(blobUrl, '_blank');
      } else {
        Linking.openURL(blobUrl);
      }
    } catch (error) {
      console.error('Error previewing certificate:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to load preview' });
    }
  };

  // Open edit modal
  const openEditModal = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name || 'Default Template',
      primaryColor: template.primaryColor || '#4F46E5',
      secondaryColor: template.secondaryColor || '#22D3EE',
      fontFamily: template.fontFamily || 'Arial, sans-serif',
      titleText: template.titleText || 'Certificate of Completion',
      subtitleText: template.subtitleText || 'This is to certify that',
      footerText: template.footerText || '',
    });
    // Set selected courses from template
    setSelectedCourseIds(template.courses ? template.courses.map(c => c.id) : []);
    setShowTemplateModal(true);
  };

  // Reset form
  const resetForm = () => {
    setTemplateForm({
      name: 'Default Template',
      primaryColor: '#4F46E5',
      secondaryColor: '#22D3EE',
      fontFamily: 'Arial, sans-serif',
      titleText: 'Certificate of Completion',
      subtitleText: 'This is to certify that',
      footerText: '',
    });
    setSelectedCourseIds([]);
    setEditingTemplate(null);
  };

  // Toggle course selection
  const toggleCourseSelection = (courseId) => {
    setSelectedCourseIds(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      }
      return [...prev, courseId];
    });
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_BASE.replace('/api', '')}${imagePath}`;
  };

  const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile);

  if (loading) {
    return (
      <MainLayout
        showSidebar={true}
        sidebarItems={sidebarItems}
        activeRoute="CertificateManagement"
        onNavigate={handleNavigate}
        userInfo={{ name: user?.name, role: isSuperAdmin ? 'Super Admin' : 'Administrator', avatar: user?.avatar }}
        onLogout={logout}
        onSettings={() => navigation.navigate('Settings')}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading certificate data...
          </Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      showSidebar={true}
      sidebarItems={sidebarItems}
      activeRoute="CertificateManagement"
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
                Certificate Management
              </Text>
            </View>
            <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>
              Manage certificate templates and track issued certificates
            </Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <AppCard style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
              <Icon name="ribbon" size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {stats.totalCertificates}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Total Certificates Issued
            </Text>
          </AppCard>
          <AppCard style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: stats.hasActiveTemplate ? '#10B98115' : '#F59E0B15' }]}>
              <Icon
                name={stats.hasActiveTemplate ? 'checkmark-circle' : 'warning'}
                size={24}
                color={stats.hasActiveTemplate ? '#10B981' : '#F59E0B'}
              />
            </View>
            <Text style={[styles.statValue, { color: stats.hasActiveTemplate ? '#10B981' : '#F59E0B' }]}>
              {stats.hasActiveTemplate ? 'Active' : 'None'}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Template Status
            </Text>
          </AppCard>
        </View>

        {/* Content Grid */}
        <View style={styles.contentGrid}>
          {/* Main Column */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.mainColumn}>
            {/* Active Template Card */}
            <AppCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                  Active Certificate Template
                </Text>
                <AppButton
                  title={activeTemplate ? 'Edit' : 'Create'}
                  onPress={() => {
                    if (activeTemplate) {
                      openEditModal(activeTemplate);
                    } else {
                      resetForm();
                      setShowTemplateModal(true);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  leftIcon={activeTemplate ? 'create-outline' : 'add-outline'}
                />
              </View>

              {activeTemplate ? (
                <View style={styles.templateDetails}>
                  {/* Logo Preview (Read-only) */}
                  <View style={styles.templateField}>
                    <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>
                      Logo (Automatic)
                    </Text>
                    <View style={[styles.logoPreviewContainer, { backgroundColor: theme.colors.surface }]}>
                      <View style={[styles.logoPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                        <Icon name="school" size={24} color={theme.colors.primary} />
                      </View>
                      <Text style={[styles.autoText, { color: theme.colors.textTertiary }]}>
                        SkillSphere logo is automatically applied
                      </Text>
                    </View>
                  </View>

                  {/* Background Image */}
                  <View style={styles.templateField}>
                    <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>
                      Background Image (Optional)
                    </Text>
                    <View style={styles.uploadRow}>
                      {activeTemplate.backgroundImage ? (
                        <Image
                          source={{ uri: getImageUrl(activeTemplate.backgroundImage) }}
                          style={styles.thumbnailImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.placeholderImage, { backgroundColor: theme.colors.surface }]}>
                          <Icon name="image-outline" size={24} color={theme.colors.textTertiary} />
                        </View>
                      )}
                      <AppButton
                        title={uploadingImage ? 'Uploading...' : 'Upload'}
                        onPress={() => handleUploadImage(activeTemplate.id, 'background')}
                        variant="outline"
                        size="sm"
                        leftIcon="cloud-upload-outline"
                        disabled={uploadingImage}
                      />
                    </View>
                  </View>

                  {/* Admin Signature */}
                  <View style={styles.templateField}>
                    <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>
                      Admin Signature
                    </Text>
                    <View style={styles.uploadRow}>
                      {activeTemplate.adminSignature ? (
                        <Image
                          source={{ uri: getImageUrl(activeTemplate.adminSignature) }}
                          style={styles.signatureImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={[styles.placeholderSignature, { backgroundColor: theme.colors.surface }]}>
                          <Icon name="pencil-outline" size={20} color={theme.colors.textTertiary} />
                          <Text style={[styles.placeholderText, { color: theme.colors.textTertiary }]}>
                            No signature
                          </Text>
                        </View>
                      )}
                      <AppButton
                        title={uploadingImage ? 'Uploading...' : 'Upload'}
                        onPress={() => handleUploadImage(activeTemplate.id, 'signature')}
                        variant="outline"
                        size="sm"
                        leftIcon="cloud-upload-outline"
                        disabled={uploadingImage}
                      />
                    </View>
                  </View>

                  {/* Colors */}
                  <View style={styles.colorsRow}>
                    <View style={styles.colorField}>
                      <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>
                        Primary Color
                      </Text>
                      <View style={styles.colorPreview}>
                        <View style={[styles.colorSwatch, { backgroundColor: activeTemplate.primaryColor }]} />
                        <Text style={[styles.colorValue, { color: theme.colors.textPrimary }]}>
                          {activeTemplate.primaryColor}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.colorField}>
                      <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>
                        Secondary Color
                      </Text>
                      <View style={styles.colorPreview}>
                        <View style={[styles.colorSwatch, { backgroundColor: activeTemplate.secondaryColor }]} />
                        <Text style={[styles.colorValue, { color: theme.colors.textPrimary }]}>
                          {activeTemplate.secondaryColor}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Preview Button */}
                  <AppButton
                    title="Preview Certificate"
                    onPress={() => handlePreviewCertificate(activeTemplate.id)}
                    variant="primary"
                    leftIcon="eye-outline"
                    style={styles.previewButton}
                  />
                </View>
              ) : (
                <View style={[styles.emptyTemplate, { borderColor: theme.colors.border }]}>
                  <Icon name="document-text-outline" size={40} color={theme.colors.textTertiary} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                    No Active Template
                  </Text>
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    Create a certificate template to start issuing certificates
                  </Text>
                  <AppButton
                    title="Create Template"
                    onPress={() => {
                      resetForm();
                      setShowTemplateModal(true);
                    }}
                    variant="primary"
                    leftIcon="add-outline"
                    style={styles.createButton}
                  />
                </View>
              )}
            </AppCard>

            {/* Recent Certificates Card */}
            <AppCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                Recent Certificates
              </Text>

              {recentCertificates.length > 0 ? (
                <View style={styles.certificateList}>
                  {recentCertificates.map((cert) => (
                    <View key={cert.id} style={[styles.certificateItem, { borderColor: theme.colors.border }]}>
                      <View style={[styles.certificateIcon, { backgroundColor: '#F59E0B15' }]}>
                        <Icon name="ribbon" size={20} color="#F59E0B" />
                      </View>
                      <View style={styles.certificateInfo}>
                        <Text style={[styles.certificateName, { color: theme.colors.textPrimary }]}>
                          {cert.course?.name || 'Unknown Course'}
                        </Text>
                        <Text style={[styles.certificateStudent, { color: theme.colors.textSecondary }]}>
                          {cert.user?.name || 'Unknown Student'} - {formatDate(cert.issuedDate)}
                        </Text>
                      </View>
                      {cert.certificateUrl && (
                        <TouchableOpacity
                          style={[styles.certificateAction, { backgroundColor: theme.colors.primary + '10' }]}
                          onPress={() => {
                            const url = getImageUrl(cert.certificateUrl);
                            if (Platform.OS === 'web') {
                              window.open(url, '_blank');
                            } else {
                              Linking.openURL(url);
                            }
                          }}
                        >
                          <Icon name="download-outline" size={18} color={theme.colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={[styles.emptySection, { borderColor: theme.colors.border }]}>
                  <Icon name="ribbon-outline" size={32} color={theme.colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No certificates issued yet
                  </Text>
                </View>
              )}
            </AppCard>
          </Animated.View>

          {/* Side Column */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.sideColumn}>
            {/* All Templates Card */}
            <AppCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                  All Templates
                </Text>
                <AppButton
                  title="New"
                  onPress={() => {
                    resetForm();
                    setShowTemplateModal(true);
                  }}
                  variant="outline"
                  size="sm"
                  leftIcon="add-outline"
                />
              </View>

              {templates.length > 0 ? (
                <View style={styles.templateList}>
                  {templates.map((template) => {
                    // Get courses where this template is active
                    const activeCourses = (template.courses || []).filter(c => c.TemplateCourse?.isActive);
                    return (
                      <View
                        key={template.id}
                        style={[
                          styles.templateItem,
                          { borderColor: template.isActive || activeCourses.length > 0 ? theme.colors.primary : theme.colors.border }
                        ]}
                      >
                        <View style={styles.templateItemHeader}>
                          <View style={styles.templateItemInfo}>
                            <Text style={[styles.templateItemName, { color: theme.colors.textPrimary }]}>
                              {template.name}
                            </Text>
                            <View style={styles.badgeRow}>
                              {template.isActive && (
                                <View style={[styles.activeBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                                  <Text style={[styles.activeBadgeText, { color: theme.colors.primary }]}>
                                    Default
                                  </Text>
                                </View>
                              )}
                              {activeCourses.length > 0 && (
                                <View style={[styles.activeBadge, { backgroundColor: '#10B98115' }]}>
                                  <Text style={[styles.activeBadgeText, { color: '#10B981' }]}>
                                    {activeCourses.length} Course{activeCourses.length > 1 ? 's' : ''}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <View style={styles.templateItemColors}>
                            <View style={[styles.colorDot, { backgroundColor: template.primaryColor }]} />
                            <View style={[styles.colorDot, { backgroundColor: template.secondaryColor }]} />
                          </View>
                        </View>

                        {/* Show active courses */}
                        {activeCourses.length > 0 && (
                          <View style={styles.activeCoursesList}>
                            {activeCourses.slice(0, 3).map(course => (
                              <View key={course.id} style={[styles.courseTag, { backgroundColor: '#10B98110' }]}>
                                <Text style={[styles.courseTagText, { color: '#10B981' }]} numberOfLines={1}>
                                  {course.name}
                                </Text>
                              </View>
                            ))}
                            {activeCourses.length > 3 && (
                              <Text style={[styles.moreCourses, { color: theme.colors.textTertiary }]}>
                                +{activeCourses.length - 3} more
                              </Text>
                            )}
                          </View>
                        )}

                        <View style={styles.templateItemActions}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnWide, { backgroundColor: '#10B98115' }]}
                            onPress={() => openActivateForCoursesModal(template)}
                          >
                            <Icon name="school-outline" size={14} color="#10B981" />
                            <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Courses</Text>
                          </TouchableOpacity>
                          {!template.isActive && (
                            <TouchableOpacity
                              style={[styles.actionBtn, { backgroundColor: '#6366F115' }]}
                              onPress={() => handleActivateTemplate(template.id)}
                            >
                              <Icon name="star-outline" size={16} color="#6366F1" />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: theme.colors.primary + '15' }]}
                            onPress={() => openEditModal(template)}
                          >
                            <Icon name="create-outline" size={16} color={theme.colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: theme.colors.primary + '15' }]}
                            onPress={() => handlePreviewCertificate(template.id)}
                          >
                            <Icon name="eye-outline" size={16} color={theme.colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#EF444415' }]}
                            onPress={() => confirmDeleteTemplate(template)}
                          >
                            <Icon name="trash-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={[styles.emptySection, { borderColor: theme.colors.border }]}>
                  <Icon name="document-outline" size={32} color={theme.colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No templates created
                  </Text>
                </View>
              )}
            </AppCard>

            {/* Info Card */}
            <AppCard style={[styles.infoCard, { backgroundColor: theme.colors.primary + '10' }]}>
              <Icon name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoCardText, { color: theme.colors.primary }]}>
                Certificates are automatically generated and emailed when students complete 100% of a course.
              </Text>
            </AppCard>

            {/* Settings Info Card */}
            <AppCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                Auto-Generation Settings
              </Text>
              <View style={styles.settingsList}>
                <View style={styles.settingItem}>
                  <View style={[styles.settingIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Icon name="checkmark-done-outline" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingLabel, { color: theme.colors.textTertiary }]}>
                      Trigger
                    </Text>
                    <Text style={[styles.settingValue, { color: theme.colors.textPrimary }]}>
                      100% course completion
                    </Text>
                  </View>
                </View>
                <View style={styles.settingItem}>
                  <View style={[styles.settingIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Icon name="mail-outline" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingLabel, { color: theme.colors.textTertiary }]}>
                      Delivery
                    </Text>
                    <Text style={[styles.settingValue, { color: theme.colors.textPrimary }]}>
                      Email with PDF attachment
                    </Text>
                  </View>
                </View>
                <View style={styles.settingItem}>
                  <View style={[styles.settingIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Icon name="document-text-outline" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingLabel, { color: theme.colors.textTertiary }]}>
                      Format
                    </Text>
                    <Text style={[styles.settingValue, { color: theme.colors.textPrimary }]}>
                      PDF (A4 Landscape)
                    </Text>
                  </View>
                </View>
              </View>
            </AppCard>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Template Modal */}
      <Modal
        visible={showTemplateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowTemplateModal(false);
          setEditingTemplate(null);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
              >
                <Icon name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: theme.colors.textPrimary }]}>Template Name</Text>
                <TextInput
                  style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                  value={templateForm.name}
                  onChangeText={(text) => setTemplateForm({ ...templateForm, name: text })}
                  placeholder="Template Name"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: theme.colors.textPrimary }]}>Title Text</Text>
                <TextInput
                  style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                  value={templateForm.titleText}
                  onChangeText={(text) => setTemplateForm({ ...templateForm, titleText: text })}
                  placeholder="Certificate of Completion"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: theme.colors.textPrimary }]}>Subtitle Text</Text>
                <TextInput
                  style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                  value={templateForm.subtitleText}
                  onChangeText={(text) => setTemplateForm({ ...templateForm, subtitleText: text })}
                  placeholder="This is to certify that"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formField, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.formLabel, { color: theme.colors.textPrimary }]}>Primary Color</Text>
                  <View style={styles.colorPickerContainer}>
                    {Platform.OS === 'web' ? (
                      <input
                        type="color"
                        value={templateForm.primaryColor}
                        onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                        style={{
                          width: 50,
                          height: 40,
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      />
                    ) : (
                      <View style={[styles.colorSwatchLarge, { backgroundColor: templateForm.primaryColor }]} />
                    )}
                    <TextInput
                      style={[styles.colorTextInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                      value={templateForm.primaryColor}
                      onChangeText={(text) => handleColorChange('primaryColor', text)}
                      placeholder="#4F46E5"
                      placeholderTextColor={theme.colors.textTertiary}
                    />
                  </View>
                </View>
                <View style={[styles.formField, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.formLabel, { color: theme.colors.textPrimary }]}>Secondary Color</Text>
                  <View style={styles.colorPickerContainer}>
                    {Platform.OS === 'web' ? (
                      <input
                        type="color"
                        value={templateForm.secondaryColor}
                        onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                        style={{
                          width: 50,
                          height: 40,
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      />
                    ) : (
                      <View style={[styles.colorSwatchLarge, { backgroundColor: templateForm.secondaryColor }]} />
                    )}
                    <TextInput
                      style={[styles.colorTextInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                      value={templateForm.secondaryColor}
                      onChangeText={(text) => handleColorChange('secondaryColor', text)}
                      placeholder="#22D3EE"
                      placeholderTextColor={theme.colors.textTertiary}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: theme.colors.textPrimary }]}>Font Family</Text>
                <TextInput
                  style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                  value={templateForm.fontFamily}
                  onChangeText={(text) => setTemplateForm({ ...templateForm, fontFamily: text })}
                  placeholder="Arial, sans-serif"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: theme.colors.textPrimary }]}>Footer Text (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                  value={templateForm.footerText}
                  onChangeText={(text) => setTemplateForm({ ...templateForm, footerText: text })}
                  placeholder="Additional footer text..."
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Course Selection */}
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: theme.colors.textPrimary }]}>Apply to Courses</Text>
                <Text style={[styles.formHint, { color: theme.colors.textTertiary }]}>
                  Select courses this template applies to. Courses already assigned to other templates are not shown.
                </Text>
                <View style={styles.courseSelectionContainer}>
                  {allCourses.length > 0 ? (
                    allCourses.map(course => {
                      // Check if this course already has a template assigned (that is NOT the one being edited)
                      const existingTemplate = getActiveTemplateForCourse(course.id);
                      const isAssignedToOtherTemplate = existingTemplate && editingTemplate && existingTemplate.id !== editingTemplate.id;
                      const isAssignedToAnyTemplate = existingTemplate && !editingTemplate;

                      // Skip courses that are already assigned to other templates
                      if (isAssignedToOtherTemplate || isAssignedToAnyTemplate) {
                        return null;
                      }

                      return (
                        <TouchableOpacity
                          key={course.id}
                          style={[
                            styles.courseChip,
                            {
                              backgroundColor: selectedCourseIds.includes(course.id)
                                ? theme.colors.primary
                                : theme.colors.surface,
                              borderColor: selectedCourseIds.includes(course.id)
                                ? theme.colors.primary
                                : theme.colors.border
                            }
                          ]}
                          onPress={() => toggleCourseSelection(course.id)}
                        >
                          <Icon
                            name={selectedCourseIds.includes(course.id) ? 'checkmark-circle' : 'ellipse-outline'}
                            size={16}
                            color={selectedCourseIds.includes(course.id) ? '#fff' : theme.colors.textSecondary}
                          />
                          <Text style={[
                            styles.courseChipText,
                            { color: selectedCourseIds.includes(course.id) ? '#fff' : theme.colors.textPrimary }
                          ]}>
                            {course.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <Text style={[styles.noCourses, { color: theme.colors.textTertiary }]}>
                      No courses available
                    </Text>
                  )}
                  {/* Show message if all courses are assigned */}
                  {allCourses.length > 0 && allCourses.every(course => {
                    const existingTemplate = getActiveTemplateForCourse(course.id);
                    return existingTemplate && (!editingTemplate || existingTemplate.id !== editingTemplate.id);
                  }) && (
                    <Text style={[styles.noCourses, { color: theme.colors.textTertiary }]}>
                      All courses already have templates assigned
                    </Text>
                  )}
                </View>
                {selectedCourseIds.length > 0 && (
                  <Text style={[styles.selectedCount, { color: theme.colors.primary }]}>
                    {selectedCourseIds.length} course{selectedCourseIds.length > 1 ? 's' : ''} selected
                  </Text>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                onPress={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
                variant="outline"
                style={{ flex: 1, marginRight: 8 }}
              />
              <AppButton
                title={saving ? 'Saving...' : (editingTemplate ? 'Update' : 'Create')}
                onPress={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                variant="primary"
                disabled={saving}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDeleteTemplate}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.deleteModalContainer, { backgroundColor: theme.colors.background }]}>
            <View style={styles.deleteModalIcon}>
              <Icon name="warning" size={48} color="#EF4444" />
            </View>
            <Text style={[styles.deleteModalTitle, { color: theme.colors.textPrimary }]}>
              Delete Template
            </Text>
            <Text style={[styles.deleteModalMessage, { color: theme.colors.textSecondary }]}>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalActions}>
              <AppButton
                title="Cancel"
                onPress={cancelDeleteTemplate}
                variant="outline"
                style={{ flex: 1, marginRight: 8 }}
              />
              <AppButton
                title="Delete"
                onPress={handleDeleteTemplate}
                variant="danger"
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Activate for Courses Modal */}
      <Modal
        visible={showActivateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowActivateModal(false);
          setActivatingTemplate(null);
          setActivateCourseIds([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Activate for Courses
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowActivateModal(false);
                  setActivatingTemplate(null);
                  setActivateCourseIds([]);
                }}
              >
                <Icon name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.activateModalInfo}>
              <View style={[styles.activateTemplatePreview, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.activateTemplateColors}>
                  <View style={[styles.colorDotLarge, { backgroundColor: activatingTemplate?.primaryColor || '#4F46E5' }]} />
                  <View style={[styles.colorDotLarge, { backgroundColor: activatingTemplate?.secondaryColor || '#22D3EE' }]} />
                </View>
                <Text style={[styles.activateTemplateName, { color: theme.colors.textPrimary }]}>
                  {activatingTemplate?.name || 'Template'}
                </Text>
              </View>
              <Text style={[styles.activateHint, { color: theme.colors.textSecondary }]}>
                Select courses where this template will be used for certificates. This will replace any other active template for the selected courses.
              </Text>
            </View>

            <ScrollView style={styles.activateCourseList}>
              {allCourses.length > 0 ? (
                allCourses.map(course => {
                  const isSelected = activateCourseIds.includes(course.id);
                  const currentActiveTemplate = getActiveTemplateForCourse(course.id);
                  const hasOtherActive = currentActiveTemplate && currentActiveTemplate.id !== activatingTemplate?.id;

                  // Skip courses that already have another template assigned
                  if (hasOtherActive) {
                    return (
                      <View
                        key={course.id}
                        style={[
                          styles.activateCourseItem,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            opacity: 0.6,
                          }
                        ]}
                      >
                        <Icon
                          name="lock-closed"
                          size={22}
                          color={theme.colors.textTertiary}
                        />
                        <View style={styles.activateCourseInfo}>
                          <Text style={[styles.activateCourseName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                            {course.name}
                          </Text>
                          <Text style={[styles.activateCourseStatus, { color: '#F59E0B' }]}>
                            Already assigned to: {currentActiveTemplate.name}
                          </Text>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={course.id}
                      style={[
                        styles.activateCourseItem,
                        {
                          backgroundColor: isSelected ? theme.colors.primary + '10' : theme.colors.surface,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border
                        }
                      ]}
                      onPress={() => toggleActivateCourse(course.id)}
                    >
                      <Icon
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isSelected ? theme.colors.primary : theme.colors.textTertiary}
                      />
                      <View style={styles.activateCourseInfo}>
                        <Text style={[styles.activateCourseName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                          {course.name}
                        </Text>
                        {currentActiveTemplate && currentActiveTemplate.id === activatingTemplate?.id && (
                          <Text style={[styles.activateCourseStatus, { color: '#10B981' }]}>
                            Currently using this template
                          </Text>
                        )}
                        {!currentActiveTemplate && (
                          <Text style={[styles.activateCourseStatus, { color: theme.colors.textTertiary }]}>
                            Using default template
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={[styles.noCourses, { color: theme.colors.textTertiary }]}>
                  No courses available
                </Text>
              )}
            </ScrollView>

            {activateCourseIds.length > 0 && (
              <View style={[styles.selectedSummary, { backgroundColor: theme.colors.primary + '10' }]}>
                <Icon name="checkmark-circle" size={18} color={theme.colors.primary} />
                <Text style={[styles.selectedSummaryText, { color: theme.colors.primary }]}>
                  {activateCourseIds.length} course{activateCourseIds.length > 1 ? 's' : ''} selected
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                onPress={() => {
                  setShowActivateModal(false);
                  setActivatingTemplate(null);
                  setActivateCourseIds([]);
                }}
                variant="outline"
                style={{ flex: 1, marginRight: 8 }}
              />
              <AppButton
                title={saving ? 'Saving...' : 'Activate'}
                onPress={handleActivateForCourses}
                variant="primary"
                disabled={saving || activateCourseIds.length === 0}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
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

    // Stats Section
    statsSection: {
      flexDirection: isMobile ? 'column' : 'row',
      flexWrap: 'wrap',
      gap: isMobile ? 12 : 16,
      marginBottom: 24,
    },
    statCard: {
      flex: isMobile ? undefined : 1,
      width: isMobile ? '100%' : undefined,
      minWidth: isMobile ? undefined : isTablet ? 200 : 250,
      maxWidth: isLargeScreen ? 350 : undefined,
      padding: isMobile ? 16 : 20,
      alignItems: 'center',
    },
    statIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    statValue: {
      fontSize: isMobile ? 28 : 36,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.regular,
      textAlign: 'center',
    },

    // Content Grid
    contentGrid: {
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
    card: {
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

    // Template Details
    templateDetails: {
      gap: 16,
    },
    templateField: {
      gap: 8,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    logoPreviewContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      gap: 12,
    },
    logoPlaceholder: {
      width: 50,
      height: 50,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    autoText: {
      fontSize: 12,
      fontStyle: 'italic',
      flex: 1,
    },
    uploadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    thumbnailImage: {
      width: 80,
      height: 50,
      borderRadius: 6,
    },
    signatureImage: {
      width: 120,
      height: 50,
      borderRadius: 4,
    },
    placeholderImage: {
      width: 80,
      height: 50,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderSignature: {
      width: 120,
      height: 50,
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    placeholderText: {
      fontSize: 11,
    },
    colorsRow: {
      flexDirection: 'row',
      gap: 16,
    },
    colorField: {
      flex: 1,
      gap: 6,
    },
    colorPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    colorSwatch: {
      width: 24,
      height: 24,
      borderRadius: 6,
    },
    colorValue: {
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.medium,
    },
    previewButton: {
      marginTop: 8,
    },

    // Empty Template
    emptyTemplate: {
      padding: 32,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: 'dashed',
      alignItems: 'center',
      gap: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    emptyText: {
      fontSize: 13,
      textAlign: 'center',
    },
    createButton: {
      marginTop: 8,
    },

    // Certificate List
    certificateList: {
      gap: 12,
    },
    certificateItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      gap: 12,
    },
    certificateIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    certificateInfo: {
      flex: 1,
    },
    certificateName: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 2,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    certificateStudent: {
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.regular,
    },
    certificateAction: {
      width: 36,
      height: 36,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Empty Section
    emptySection: {
      padding: 32,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      alignItems: 'center',
      gap: 8,
    },

    // Template List
    templateList: {
      gap: 12,
    },
    templateItem: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      gap: 10,
    },
    templateItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    templateItemInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    templateItemName: {
      fontSize: 14,
      fontWeight: '600',
    },
    activeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    activeBadgeText: {
      fontSize: 10,
      fontWeight: '600',
    },
    templateItemColors: {
      flexDirection: 'row',
      gap: 4,
    },
    colorDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
    },
    templateItemActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      width: 32,
      height: 32,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Settings
    settingsList: {
      gap: 12,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    settingIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingContent: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 11,
      marginBottom: 2,
    },
    settingValue: {
      fontSize: 13,
      fontWeight: '500',
    },

    // Info Card
    infoCard: {
      flexDirection: 'row',
      padding: 16,
      borderRadius: 12,
      alignItems: 'flex-start',
      gap: 12,
    },
    infoCardText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContainer: {
      width: '100%',
      maxWidth: 500,
      maxHeight: '90%',
      borderRadius: 16,
      ...theme.shadows.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    modalContent: {
      padding: 20,
      maxHeight: 400,
    },
    formField: {
      marginBottom: 16,
    },
    formRow: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 6,
    },
    textInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    colorPickerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    colorSwatchLarge: {
      width: 50,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    colorTextInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
    },
    modalActions: {
      flexDirection: 'row',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },

    // Delete Modal
    deleteModalContainer: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      ...theme.shadows.lg,
    },
    deleteModalIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#EF444415',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    deleteModalTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 8,
      textAlign: 'center',
    },
    deleteModalMessage: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },
    deleteModalActions: {
      flexDirection: 'row',
      width: '100%',
    },

    // Course Selection styles
    formHint: {
      fontSize: 12,
      marginBottom: 8,
      lineHeight: 16,
    },
    courseSelectionContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    courseChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      gap: 6,
    },
    courseChipText: {
      fontSize: 13,
      fontWeight: '500',
    },
    noCourses: {
      fontSize: 13,
      fontStyle: 'italic',
      padding: 12,
    },
    selectedCount: {
      fontSize: 12,
      marginTop: 8,
      fontWeight: '500',
    },

    // Badge row for multiple badges
    badgeRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
    },

    // Active courses list in template item
    activeCoursesList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
      marginBottom: 4,
    },
    courseTag: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      maxWidth: 120,
    },
    courseTagText: {
      fontSize: 11,
      fontWeight: '500',
    },
    moreCourses: {
      fontSize: 11,
      alignSelf: 'center',
    },

    // Action button with text
    actionBtnWide: {
      flexDirection: 'row',
      gap: 4,
      paddingHorizontal: 10,
      width: 'auto',
    },
    actionBtnText: {
      fontSize: 11,
      fontWeight: '600',
    },

    // Activate modal styles
    activateModalInfo: {
      padding: 20,
      paddingBottom: 12,
    },
    activateTemplatePreview: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 10,
      gap: 12,
      marginBottom: 12,
    },
    activateTemplateColors: {
      flexDirection: 'row',
      gap: 4,
    },
    colorDotLarge: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    activateTemplateName: {
      fontSize: 15,
      fontWeight: '600',
    },
    activateHint: {
      fontSize: 13,
      lineHeight: 18,
    },
    activateCourseList: {
      maxHeight: 300,
      paddingHorizontal: 20,
    },
    activateCourseItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      gap: 12,
      marginBottom: 8,
    },
    activateCourseInfo: {
      flex: 1,
    },
    activateCourseName: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 2,
    },
    activateCourseStatus: {
      fontSize: 11,
    },
    selectedSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      marginHorizontal: 20,
      borderRadius: 8,
      gap: 8,
      marginTop: 4,
    },
    selectedSummaryText: {
      fontSize: 13,
      fontWeight: '600',
    },
  });

export default CertificateManagementScreen;
