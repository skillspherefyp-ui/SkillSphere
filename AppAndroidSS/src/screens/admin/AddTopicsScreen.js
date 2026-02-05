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
    Linking,
  } from 'react-native';
  import Toast from 'react-native-toast-message';
  import Icon from 'react-native-vector-icons/Ionicons';
  import Animated, { FadeInDown } from 'react-native-reanimated';
  import MainLayout from '../../components/ui/MainLayout';
  import AppInput from '../../components/ui/AppInput';
  import AppButton from '../../components/ui/AppButton';
  import AppCard from '../../components/ui/AppCard';
  import StatusBadge from '../../components/ui/StatusBadge';
  import EmptyState from '../../components/ui/EmptyState';
  import ConfirmDialog from '../../components/ConfirmDialog';
  import AddMaterialModal from '../../components/AddMaterialModal';
  import { useData } from '../../context/DataContext';
  import { useAuth } from '../../context/AuthContext';
  import { useTheme } from '../../context/ThemeContext';
  import { useNavigation, useRoute } from '@react-navigation/native';
  import { resolveFileUrl } from '../../utils/urlHelpers';

  // Color palette for topic cards
  const TOPIC_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#EF4444', // Red
    '#F59E0B', // Amber
  ];

  const AddTopicsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { courseId } = route.params;
    const { courses, updateCourse, addTopic, updateTopic, deleteTopic, fetchCourses } = useData();
    const { user, logout } = useAuth();
    const { theme, isDark } = useTheme();
    const { width } = useWindowDimensions();
    const course = courses.find(c => c.id === courseId);

    const isWeb = Platform.OS === 'web';
    const isLargeScreen = width > 1024;
    const isTablet = width > 768;
    const isMobile = width <= 480;

    // Check permissions
    const isOwner = course?.user?.id === user?.id;
    const isSuperAdmin = user?.role === 'superadmin';
    const canManageAllCourses = user?.permissions?.canManageAllCourses === true;
    const canAddTopics = isOwner || isSuperAdmin || canManageAllCourses;

    // State
    const [topicTitle, setTopicTitle] = useState('');
    const [topicMaterials, setTopicMaterials] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showMaterialsModal, setShowMaterialsModal] = useState(false);
    const [selectedTopicMaterials, setSelectedTopicMaterials] = useState(null);
    const [topicToDelete, setTopicToDelete] = useState(null);
    const [editingTopic, setEditingTopic] = useState(null);

    const topics = course?.topics || [];

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
      const totalTopics = topics.length;
      const totalMaterials = topics.reduce((acc, topic) => acc + (topic.materials?.length || 0), 0);
      const completedTopics = topics.filter(t => t.status === 'completed').length;
      return { totalTopics, totalMaterials, completedTopics };
    }, [topics]);

    // Get color for topic based on index
    const getTopicColor = (index) => {
      return TOPIC_COLORS[index % TOPIC_COLORS.length];
    };

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

    const handleAddTopicMaterial = (newMaterial) => {
      setTopicMaterials((prev) => [...prev, newMaterial]);
    };

    const handleRemoveTopicMaterial = (id) => {
      setTopicMaterials((prev) => prev.filter((m) => m.id !== id));
    };

    const handleOpenAddModal = () => {
      setEditingTopic(null);
      setTopicTitle('');
      setTopicMaterials([]);
      setShowAddModal(true);
    };

    const handleEditTopic = (topic) => {
      setEditingTopic(topic);
      setTopicTitle(topic.title);
      setTopicMaterials(topic.materials || []);
      setShowAddModal(true);
    };

    const handleCloseModal = () => {
      setShowAddModal(false);
      setEditingTopic(null);
      setTopicTitle('');
      setTopicMaterials([]);
    };

    const handleViewMaterials = (topic) => {
      setSelectedTopicMaterials({
        title: topic.title,
        materials: topic.materials || [],
      });
      setShowMaterialsModal(true);
    };

    const handleOpenMaterial = (material) => {
      const fileUrl = resolveFileUrl(material.uri);

      if (Platform.OS === 'web') {
        window.open(fileUrl, '_blank');
      } else {
        Linking.openURL(fileUrl);
      }
    };

    const handleSaveTopic = async () => {
      if (!topicTitle.trim()) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Please enter a topic title',
        });
        return;
      }

      const formattedMaterials = topicMaterials.map(material => ({
        type: material.type,
        uri: material.uri,
        title: material.fileName || material.uri,
        description: material.description || '',
      }));

      if (editingTopic) {
        const result = await updateTopic(editingTopic.id, { title: topicTitle });
        if (result.success) {
          handleCloseModal();
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Topic updated successfully!',
          });
          await fetchCourses();
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: result.error || 'Failed to update topic',
          });
        }
      } else {
        const result = await addTopic({
          courseId: courseId,
          title: topicTitle,
          materials: formattedMaterials,
        });

        if (result.success) {
          handleCloseModal();
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Topic added successfully!',
          });
          await fetchCourses();
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: result.error || 'Failed to add topic',
          });
        }
      }
    };

    const handleDeleteClick = (topic) => {
      setTopicToDelete(topic);
      setShowDeleteDialog(true);
    };

    const confirmDeleteTopic = async () => {
      setShowDeleteDialog(false);
      if (topicToDelete) {
        const result = await deleteTopic(topicToDelete.id);
        if (result.success) {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Topic deleted successfully!',
          });
          await fetchCourses();
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: result.error || 'Failed to delete topic',
          });
        }
        setTopicToDelete(null);
      }
    };

    const handleSubmitForAI = () => {
      if (topics.length === 0) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Please add at least one topic',
        });
        return;
      }
      setShowConfirmDialog(true);
    };

    const confirmSubmitForAI = () => {
      setShowConfirmDialog(false);
      updateCourse(courseId, { status: 'ai_generating' });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Course submitted for AI generation!',
      });
      setTimeout(() => {
        updateCourse(courseId, { status: 'draft' });
        Toast.show({
          type: 'info',
          text1: 'AI Generation Complete',
          text2: 'Course content has been generated successfully!',
        });
      }, 3000);
    };

    const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile);

    const renderTopicCard = (topic, index) => {
      const color = getTopicColor(index);
      const materialsCount = topic.materials?.length || 0;

      return (
        <Animated.View
          key={topic.id}
          entering={FadeInDown.duration(400).delay(index * 80)}
          style={styles.topicCardWrapper}
        >
          <View
            style={[
              styles.topicCard,
              { backgroundColor: isDark ? theme.colors.card : theme.colors.surface },
            ]}
          >
            {/* Top Right Section - Materials Count & Actions */}
            <View style={styles.topRightSection}>
              <View style={styles.materialsCountBadge}>
                <Text style={[styles.materialsCountNumber, { color: theme.colors.primary }]}>
                  {materialsCount}
                </Text>
                <Text style={[styles.materialsCountLabel, { color: theme.colors.textSecondary }]}>
                  materials
                </Text>
              </View>
              {canAddTopics && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: theme.colors.primary + '15' }]}
                    onPress={() => handleEditTopic(topic)}
                  >
                    <Icon name="create-outline" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: theme.colors.error + '15' }]}
                    onPress={() => handleDeleteClick(topic)}
                  >
                    <Icon name="trash-outline" size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Large Topic Number */}
            <View style={[styles.topicNumberContainer, { backgroundColor: color + '15' }]}>
              <Text style={[styles.topicNumberLarge, { color: color }]}>
                {String(index + 1).padStart(2, '0')}
              </Text>
            </View>

            {/* Topic Title */}
            <Text style={[styles.topicName, { color: theme.colors.textPrimary }]} numberOfLines={2}>
              {topic.title}
            </Text>

            {/* Status Badge */}
            <View style={styles.statusContainer}>
              <StatusBadge status={topic.status || 'pending'} />
            </View>

            {/* View Materials Button */}
            {materialsCount > 0 && (
              <TouchableOpacity
                style={[styles.viewMaterialsBtn, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '30' }]}
                onPress={() => handleViewMaterials(topic)}
              >
                <Icon name="folder-open-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.viewMaterialsText, { color: theme.colors.primary }]}>
                  View Materials
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      );
    };

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
                  Course Topics
                </Text>
              </View>
              <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>
                {course?.name || 'Manage topics for your course'}
              </Text>
            </View>
            {canAddTopics && (
              <AppButton
                title="Add Topic"
                onPress={handleOpenAddModal}
                variant="primary"
                style={styles.addButton}
                leftIcon="add"
              />
            )}
          </View>

          {/* Permission Warning */}
          {!canAddTopics && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <View style={[styles.permissionBox, { backgroundColor: theme.colors.warning + '15', borderColor: theme.colors.warning + '30' }]}>
                <Icon name="lock-closed" size={22} color={theme.colors.warning} />
                <Text style={[styles.permissionText, { color: theme.colors.warning }]}>
                  You don't have permission to manage topics. Only the course creator or admins with proper permissions can add/edit topics.
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <AppCard style={styles.statCard}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Total Topics
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {stats.totalTopics}
              </Text>
            </AppCard>

            <AppCard style={styles.statCard}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Total Materials
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {stats.totalMaterials}
              </Text>
            </AppCard>

            <AppCard style={styles.statCard}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Completed
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {stats.completedTopics}
              </Text>
            </AppCard>
          </View>

          {/* Info Banner */}
          <Animated.View entering={FadeInDown.duration(400).delay(50)}>
            <View style={[styles.infoBox, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '30' }]}>
              <Icon name="information-circle" size={22} color={theme.colors.primary} />
              <Text style={[styles.infoText, { color: theme.colors.primary }]}>
                Topics are displayed in order. Each topic will be locked until the previous one is completed by students.
              </Text>
            </View>
          </Animated.View>

          {/* Topics Grid */}
          {topics.length > 0 ? (
            <View style={styles.topicsGrid}>
              {topics.map((topic, index) => renderTopicCard(topic, index))}
            </View>
          ) : (
            <AppCard style={styles.emptyContainer}>
              <EmptyState
                icon="list-outline"
                title="No topics yet"
                subtitle="Add your first topic to start building your course"
                actionLabel={canAddTopics ? "Add Topic" : undefined}
                onAction={canAddTopics ? handleOpenAddModal : undefined}
              />
            </AppCard>
          )}

          {/* Generate with AI Button */}
          {topics.length > 0 && canAddTopics && (
            <Animated.View entering={FadeInDown.duration(400).delay(300)}>
              <AppButton
                title="Generate Content with AI"
                onPress={handleSubmitForAI}
                variant="primary"
                style={styles.aiButton}
                leftIcon="sparkles"
              />
            </Animated.View>
          )}
        </ScrollView>

        {/* Add/Edit Topic Modal */}
        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? theme.colors.card : theme.colors.background }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                    {editingTopic ? 'Edit Topic' : 'Add New Topic'}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                    {editingTopic ? 'Update topic details' : 'Create a new topic for your course'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={handleCloseModal}
                >
                  <Icon name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.modalBody}>
                  <AppInput
                    label="Topic Title *"
                    value={topicTitle}
                    onChangeText={setTopicTitle}
                    placeholder="e.g., Introduction to Variables"
                  />

                  {/* Materials Section */}
                  <View style={styles.materialsSection}>
                    <View style={styles.materialHeader}>
                      <Text style={[styles.materialLabel, { color: theme.colors.textPrimary }]}>
                        Materials ({topicMaterials.length})
                      </Text>
                      <TouchableOpacity
                        style={[styles.addMaterialBtn, { backgroundColor: theme.colors.primary + '15' }]}
                        onPress={() => setShowAddMaterialModal(true)}
                      >
                        <Icon name="add" size={18} color={theme.colors.primary} />
                        <Text style={[styles.addMaterialText, { color: theme.colors.primary }]}>Add</Text>
                      </TouchableOpacity>
                    </View>

                    {topicMaterials.length === 0 ? (
                      <View style={[styles.emptyMaterials, { borderColor: theme.colors.border }]}>
                        <Icon name="folder-open-outline" size={24} color={theme.colors.textTertiary} />
                        <Text style={[styles.emptyMaterialsText, { color: theme.colors.textSecondary }]}>
                          No materials added
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.materialsList}>
                        {topicMaterials.map((material) => (
                          <View
                            key={material.id}
                            style={[styles.materialItem, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.surface, borderColor: theme.colors.border }]}
                          >
                            <Icon
                              name={material.type === 'pdf' ? 'document-text-outline' : material.type === 'image' ? 'image-outline' : 'code-slash-outline'}
                              size={18}
                              color={theme.colors.primary}
                            />
                            <Text style={[styles.materialName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                              {material.fileName || material.uri || 'Material'}
                            </Text>
                            <TouchableOpacity onPress={() => handleRemoveTopicMaterial(material.id)}>
                              <Icon name="close-circle" size={20} color={theme.colors.error} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <AppButton
                  title="Cancel"
                  onPress={handleCloseModal}
                  variant="outline"
                  style={styles.modalCancelButton}
                />
                <AppButton
                  title={editingTopic ? 'Update Topic' : 'Add Topic'}
                  onPress={handleSaveTopic}
                  variant="primary"
                  style={styles.modalCreateButton}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* View Materials Modal */}
        <Modal
          visible={showMaterialsModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMaterialsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? theme.colors.card : theme.colors.background }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                    Topic Materials
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {selectedTopicMaterials?.title}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowMaterialsModal(false)}
                >
                  <Icon name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Materials List */}
              <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.modalBody}>
                  {selectedTopicMaterials?.materials?.length > 0 ? (
                    <View style={styles.viewMaterialsList}>
                      {selectedTopicMaterials.materials.map((material, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.viewMaterialItem, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.surface, borderColor: theme.colors.border }]}
                          onPress={() => handleOpenMaterial(material)}
                        >
                          <View style={[styles.materialIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                            <Icon
                              name={material.type === 'pdf' ? 'document-text' : material.type === 'image' ? 'image' : 'code-slash'}
                              size={24}
                              color={theme.colors.primary}
                            />
                          </View>
                          <View style={styles.materialInfo}>
                            <Text style={[styles.materialTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                              {material.title || material.fileName || 'Material'}
                            </Text>
                            <Text style={[styles.materialType, { color: theme.colors.textSecondary }]}>
                              {material.type?.toUpperCase() || 'FILE'}
                            </Text>
                          </View>
                          <View style={[styles.downloadIcon, { backgroundColor: theme.colors.success + '15' }]}>
                            <Icon name="download-outline" size={20} color={theme.colors.success} />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.noMaterialsContainer}>
                      <Icon name="folder-open-outline" size={48} color={theme.colors.textTertiary} />
                      <Text style={[styles.noMaterialsText, { color: theme.colors.textSecondary }]}>
                        No materials available
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <AppButton
                  title="Close"
                  onPress={() => setShowMaterialsModal(false)}
                  variant="outline"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Material Modal */}
        <AddMaterialModal
          visible={showAddMaterialModal}
          onClose={() => setShowAddMaterialModal(false)}
          onAddMaterial={handleAddTopicMaterial}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          visible={showDeleteDialog}
          title="Delete Topic"
          message={`Are you sure you want to delete "${topicToDelete?.title}"? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={confirmDeleteTopic}
          onCancel={() => {
            setShowDeleteDialog(false);
            setTopicToDelete(null);
          }}
        />

        {/* AI Generation Confirmation */}
        <ConfirmDialog
          visible={showConfirmDialog}
          title="Generate with AI"
          message="This will trigger AI content generation for all topics. Continue?"
          confirmText="Generate"
          confirmVariant="primary"
          onConfirm={confirmSubmitForAI}
          onCancel={() => setShowConfirmDialog(false)}
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
        fontFamily: theme.typography?.fontFamily?.bold,
      },
      pageSubtitle: {
        fontSize: 14,
        fontFamily: theme.typography?.fontFamily?.regular,
        marginLeft: 52,
      },
      addButton: {
        minWidth: isMobile ? '100%' : 150,
      },

      // Permission Box
      permissionBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        gap: 12,
      },
      permissionText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
      },

      // Stats Section
      statsSection: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20,
      },
      statCard: {
        flex: 1,
        minWidth: isMobile ? '100%' : isTablet ? 150 : 180,
        maxWidth: isLargeScreen ? 280 : undefined,
        padding: 20,
      },
      statLabel: {
        fontSize: 13,
        marginBottom: 8,
        fontFamily: theme.typography?.fontFamily?.regular,
      },
      statValue: {
        fontSize: isMobile ? 28 : 36,
        fontWeight: '700',
        fontFamily: theme.typography?.fontFamily?.bold,
      },

      // Info Box
      infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        gap: 12,
      },
      infoText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        fontFamily: theme.typography?.fontFamily?.regular,
      },

      // Topics Grid
      topicsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
      },
      topicCardWrapper: {
        width: isLargeScreen
          ? 'calc(33.333% - 11px)'
          : isTablet
            ? 'calc(50% - 8px)'
            : '100%',
        ...(Platform.OS !== 'web' && {
          width: isLargeScreen ? '31%' : isTablet ? '48%' : '100%',
        }),
      },
      topicCard: {
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border,
        minHeight: 240,
        ...theme.shadows.sm,
      },
      topRightSection: {
        position: 'absolute',
        top: 16,
        right: 16,
        alignItems: 'flex-end',
        gap: 10,
      },
      materialsCountBadge: {
        alignItems: 'flex-end',
      },
      materialsCountNumber: {
        fontSize: 24,
        fontWeight: '700',
        fontFamily: theme.typography?.fontFamily?.bold,
      },
      materialsCountLabel: {
        fontSize: 11,
        fontFamily: theme.typography?.fontFamily?.regular,
      },
      actionButtons: {
        flexDirection: 'row',
        gap: 8,
      },
      editButton: {
        padding: 8,
        borderRadius: 8,
      },
      deleteButton: {
        padding: 8,
        borderRadius: 8,
      },
      topicNumberContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
      },
      topicNumberLarge: {
        fontSize: 28,
        fontWeight: '800',
        fontFamily: theme.typography?.fontFamily?.bold,
      },
      topicName: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: theme.typography?.fontFamily?.semiBold,
        marginBottom: 8,
        paddingRight: 80,
      },
      statusContainer: {
        marginBottom: 12,
      },
      viewMaterialsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        gap: 8,
        marginTop: 8,
      },
      viewMaterialsText: {
        fontSize: 13,
        fontWeight: '600',
      },

      // Empty State
      emptyContainer: {
        padding: 40,
        alignItems: 'center',
      },

      // AI Button
      aiButton: {
        marginTop: 24,
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
        maxWidth: 520,
        maxHeight: '85%',
        borderRadius: 16,
        padding: 24,
        ...theme.shadows.lg,
      },
      modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
      },
      modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
        fontFamily: theme.typography?.fontFamily?.bold,
      },
      modalSubtitle: {
        fontSize: 14,
        fontFamily: theme.typography?.fontFamily?.regular,
      },
      modalCloseButton: {
        padding: 4,
      },
      modalBodyScroll: {
        maxHeight: 400,
      },
      modalBody: {
        marginBottom: 20,
      },
      modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border,
      },
      modalCancelButton: {
        minWidth: 100,
      },
      modalCreateButton: {
        minWidth: 140,
      },

      // Materials Section in Add/Edit Modal
      materialsSection: {
        marginTop: 20,
      },
      materialHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      },
      materialLabel: {
        fontSize: 14,
        fontWeight: '600',
      },
      addMaterialBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
      },
      addMaterialText: {
        fontSize: 13,
        fontWeight: '600',
      },
      emptyMaterials: {
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        gap: 8,
      },
      emptyMaterialsText: {
        fontSize: 13,
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
      },

      // View Materials Modal
      viewMaterialsList: {
        gap: 12,
      },
      viewMaterialItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 14,
      },
      materialIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
      },
      materialInfo: {
        flex: 1,
      },
      materialTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
      },
      materialType: {
        fontSize: 12,
        textTransform: 'uppercase',
      },
      downloadIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
      },
      noMaterialsContainer: {
        alignItems: 'center',
        padding: 40,
        gap: 12,
      },
      noMaterialsText: {
        fontSize: 14,
      },
    });

  export default AddTopicsScreen;