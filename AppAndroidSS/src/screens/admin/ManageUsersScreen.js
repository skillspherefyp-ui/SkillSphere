import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
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
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { adminAPI } from '../../services/apiClient';

const ManageUsersScreen = () => {
  const { user, logout } = useAuth();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { userType } = route.params || { userType: 'admin' };
  const { width } = useWindowDimensions();

  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;
  const isTablet = width > 768;
  const isMobile = width <= 480;

  const isSuperAdmin = user?.role === 'superadmin';
  const userTypeLabel = userType === 'admin' ? 'Admin' : 'Expert';
  const userTypeLabelPlural = userType === 'admin' ? 'Admins' : 'Experts';

  // Sidebar navigation items
  const sidebarItems = [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Manage Admins', icon: 'person-outline', iconActive: 'person', route: 'ManageAdmins' },
    { label: 'Manage Experts', icon: 'people-outline', iconActive: 'people', route: 'ManageExperts' },
    { label: 'All Courses', icon: 'book-outline', iconActive: 'book', route: 'Courses' },
    { label: 'All Students', icon: 'school-outline', iconActive: 'school', route: 'Students' },
    { label: 'Categories', icon: 'layers-outline', iconActive: 'layers', route: 'Categories' },
    { label: 'Certificates', icon: 'ribbon-outline', iconActive: 'ribbon', route: 'CertificateManagement' },
  ];

  const handleNavigate = (route) => {
    if (route === 'ManageAdmins') {
      navigation.navigate('ManageUsers', { userType: 'admin' });
    } else if (route === 'ManageExperts') {
      navigation.navigate('ManageUsers', { userType: 'expert' });
    } else if (route === 'Categories') {
      navigation.navigate('CategoryManagement');
    } else {
      navigation.navigate(route);
    }
  };

  const activeRoute = userType === 'admin' ? 'ManageAdmins' : 'ManageExperts';

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, [userType]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAll();
      if (response.success && response.users) {
        const filtered = response.users.filter(u => u.role === userType);
        setAllUsers(filtered);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch users',
      });
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { label: `All ${userTypeLabelPlural}`, value: null },
    { label: 'Active', value: true },
    { label: 'Inactive', value: false },
  ];

  // Stats calculation
  const stats = useMemo(() => {
    const total = allUsers.length;
    const active = allUsers.filter(u => u.isActive !== false).length;
    const inactive = allUsers.filter(u => u.isActive === false).length;
    return { total, active, inactive };
  }, [allUsers]);

  const filteredUsers = allUsers.filter(userItem => {
    const matchesSearch = userItem.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userItem.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === null || (userItem.isActive !== false) === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateAccount = async () => {
    if (!newUserEmail.trim() || !newUserPassword.trim() || !newUserName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill all fields',
      });
      return;
    }

    setIsCreating(true);
    try {
      const result = await adminAPI.create({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: userType,
      });

      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Account Created',
          text2: `${userTypeLabel} account created successfully!`,
        });
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserName('');
        setShowCreateModal(false);
        fetchUsers();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: result.error || 'Failed to create account',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to create account',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = (userItem) => {
    setUserToToggle(userItem);
    setShowConfirmDialog(true);
  };

  const confirmToggleStatus = async () => {
    setShowConfirmDialog(false);
    if (userToToggle) {
      try {
        const result = await adminAPI.toggleStatus(userToToggle.id);
        if (result.success) {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: result.message || `Account status updated!`,
          });
          fetchUsers();
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: result.error || 'Failed to update status',
          });
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.message || 'Failed to update status',
        });
      }
      setUserToToggle(null);
    }
  };

  const handleManagePermissions = (userItem) => {
    const defaultPermissions = {
      canManageAllCourses: false,
      canManageCategories: false,
      canManageStudents: false,
      canManageCertificates: false,
      canViewFeedback: false
    };

    setSelectedUserPermissions({
      id: userItem.id,
      name: userItem.name,
      permissions: {
        ...defaultPermissions,
        ...(userItem.permissions || {})
      }
    });
    setShowPermissionsModal(true);
  };

  const handleTogglePermission = (permissionKey) => {
    setSelectedUserPermissions(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permissionKey]: !prev.permissions[permissionKey]
      }
    }));
  };

  const handleSavePermissions = async () => {
    try {
      const result = await adminAPI.updatePermissions(
        selectedUserPermissions.id,
        selectedUserPermissions.permissions
      );
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Permissions updated successfully!',
        });
        setShowPermissionsModal(false);
        setSelectedUserPermissions(null);
        fetchUsers();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: result.error || 'Failed to update permissions',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to update permissions',
      });
    }
  };

  const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile);

  const renderUserCard = (userItem, index) => (
    <Animated.View
      key={userItem.id}
      entering={FadeInDown.duration(400).delay(index * 80)}
      style={styles.userCardWrapper}
    >
      <View
        style={[
          styles.userCard,
          { backgroundColor: isDark ? theme.colors.card : theme.colors.surface },
        ]}
      >
        {/* Avatar & Info */}
        <View style={styles.userHeader}>
          <View style={[styles.avatar, { backgroundColor: userItem.isActive === false ? theme.colors.error : userType === 'admin' ? '#6366F1' : '#8B5CF6' }]}>
            <Text style={styles.avatarText}>{userItem.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {userItem.name || 'Unknown'}
            </Text>
            <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {userItem.email || '-'}
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: userItem.isActive !== false ? '#10B98120' : '#EF444420' },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: userItem.isActive !== false ? '#10B981' : '#EF4444' },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: userItem.isActive !== false ? '#10B981' : '#EF4444' },
              ]}
            >
              {userItem.isActive !== false ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Meta Info */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon name="time-outline" size={14} color={theme.colors.textTertiary} />
            <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>
              {userItem.createdAt ? new Date(userItem.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name={userType === 'admin' ? 'shield-checkmark-outline' : 'star-outline'} size={14} color={theme.colors.textTertiary} />
            <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>
              {userTypeLabel}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          {userType === 'admin' && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: theme.colors.border }]}
              onPress={() => handleManagePermissions(userItem)}
            >
              <Icon name="settings-outline" size={16} color={theme.colors.primary} />
              <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>Permissions</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.toggleBtn,
              { backgroundColor: userItem.isActive !== false ? theme.colors.error : '#10B981' },
            ]}
            onPress={() => handleToggleStatus(userItem)}
          >
            <Icon name={userItem.isActive !== false ? 'close-circle-outline' : 'checkmark-circle-outline'} size={16} color="#FFFFFF" />
            <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
              {userItem.isActive !== false ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <MainLayout
        showSidebar={true}
        sidebarItems={sidebarItems}
        activeRoute={activeRoute}
        onNavigate={handleNavigate}
        userInfo={{ name: user?.name, role: 'Super Admin', avatar: user?.avatar }}
        onLogout={logout}
        onSettings={() => navigation.navigate('Settings')}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ color: theme.colors.textSecondary, marginTop: 10 }}>Loading {userTypeLabelPlural.toLowerCase()}...</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      showSidebar={true}
      sidebarItems={sidebarItems}
      activeRoute={activeRoute}
      onNavigate={handleNavigate}
      userInfo={{ name: user?.name, role: 'Super Admin', avatar: user?.avatar }}
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
                {userTypeLabelPlural}
              </Text>
            </View>
            <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>
              Manage {userType} accounts and permissions
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: userType === 'admin' ? '#6366F1' : '#8B5CF6' }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Icon name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add {userTypeLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <AppCard style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Total {userTypeLabelPlural}
            </Text>
            <Text style={[styles.statValue, { color: userType === 'admin' ? '#6366F1' : '#8B5CF6' }]}>
              {stats.total}
            </Text>
          </AppCard>
          <AppCard style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Active
            </Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {stats.active}
            </Text>
          </AppCard>
          <AppCard style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Inactive
            </Text>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {stats.inactive}
            </Text>
          </AppCard>
        </View>

        {/* Search & Filter Section */}
        <AppCard style={styles.filterCard} allowOverflow>
          <AppInput
            placeholder={`Search ${userTypeLabelPlural.toLowerCase()} by name or email...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Icon name="search" size={20} color={theme.colors.textSecondary} />}
            containerStyle={styles.searchInputContainer}
          />
          <View style={styles.filterRow}>
            <View style={styles.filterDropdownContainer}>
              <TouchableOpacity
                style={[styles.filterBtn, { borderColor: theme.colors.border, backgroundColor: isDark ? theme.colors.card : theme.colors.background }]}
                onPress={() => setShowStatusDropdown(!showStatusDropdown)}
              >
                <Text style={[styles.filterBtnText, { color: theme.colors.textPrimary }]}>
                  {statusFilter === null ? 'Filter by Status' : statusFilter ? 'Active' : 'Inactive'}
                </Text>
                <Icon name="chevron-down" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              {showStatusDropdown && (
                <View style={[styles.dropdown, { backgroundColor: isDark ? theme.colors.card : theme.colors.surface, borderColor: theme.colors.border }]}>
                  {statusOptions.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dropdownItem,
                        statusFilter === option.value && { backgroundColor: theme.colors.primary + '15' }
                      ]}
                      onPress={() => {
                        setStatusFilter(option.value);
                        setShowStatusDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { color: theme.colors.textPrimary }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </AppCard>

        {/* Users Grid */}
        {filteredUsers.length > 0 ? (
          <View style={styles.usersGrid}>
            {filteredUsers.map((userItem, index) => renderUserCard(userItem, index))}
          </View>
        ) : (
          <AppCard style={styles.emptyContainer}>
            <EmptyState
              icon="people-outline"
              title={`No ${userTypeLabelPlural.toLowerCase()} found`}
              subtitle={`There are no ${userTypeLabelPlural.toLowerCase()} matching your search`}
            />
          </AppCard>
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Add New {userTypeLabel}
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Icon name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <AppInput
              label="Name"
              value={newUserName}
              onChangeText={setNewUserName}
              placeholder={`Enter ${userType} name`}
              containerStyle={styles.inputContainer}
            />
            <AppInput
              label="Email"
              value={newUserEmail}
              onChangeText={setNewUserEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder={`Enter ${userType} email`}
              containerStyle={styles.inputContainer}
            />
            <AppInput
              label="Password"
              value={newUserPassword}
              onChangeText={setNewUserPassword}
              secureTextEntry={!showPassword}
              placeholder={`Enter ${userType} password`}
              containerStyle={styles.inputContainer}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              }
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: theme.colors.border }]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.submitBtn, { backgroundColor: userType === 'admin' ? '#6366F1' : '#8B5CF6' }]}
                onPress={handleCreateAccount}
                disabled={isCreating}
              >
                <Text style={styles.submitBtnText}>{isCreating ? 'Creating...' : `Create ${userTypeLabel}`}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        visible={showPermissionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPermissionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  Manage Permissions
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  {selectedUserPermissions?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowPermissionsModal(false)}>
                <Icon name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedUserPermissions && (
              <View style={styles.permissionsContainer}>
                {[
                  { key: 'canManageAllCourses', icon: 'school-outline', title: 'Manage All Courses', desc: 'Can edit any course' },
                  { key: 'canManageCategories', icon: 'grid-outline', title: 'Manage Categories', desc: 'Create and edit categories' },
                  { key: 'canManageStudents', icon: 'people-outline', title: 'Manage Students', desc: 'View and manage students' },
                  { key: 'canManageCertificates', icon: 'ribbon-outline', title: 'Manage Certificates', desc: 'Issue certificates' },
                  { key: 'canViewFeedback', icon: 'chatbubbles-outline', title: 'View Feedback', desc: 'See student feedback' },
                ].map((perm) => (
                  <TouchableOpacity
                    key={perm.key}
                    style={[styles.permissionRow, { borderBottomColor: theme.colors.border }]}
                    onPress={() => handleTogglePermission(perm.key)}
                  >
                    <View style={styles.permissionInfo}>
                      <Icon name={perm.icon} size={20} color={theme.colors.primary} />
                      <View style={styles.permissionText}>
                        <Text style={[styles.permissionTitle, { color: theme.colors.textPrimary }]}>{perm.title}</Text>
                        <Text style={[styles.permissionDesc, { color: theme.colors.textSecondary }]}>{perm.desc}</Text>
                      </View>
                    </View>
                    <Icon
                      name={selectedUserPermissions.permissions[perm.key] ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={selectedUserPermissions.permissions[perm.key] ? '#10B981' : theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: theme.colors.border }]}
                onPress={() => setShowPermissionsModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.submitBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSavePermissions}
              >
                <Text style={styles.submitBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={showConfirmDialog}
        title={userToToggle?.isActive !== false ? 'Deactivate Account' : 'Activate Account'}
        message={`Are you sure you want to ${userToToggle?.isActive !== false ? 'deactivate' : 'activate'} this ${userType} account?`}
        confirmText={userToToggle?.isActive !== false ? 'Deactivate' : 'Activate'}
        onConfirm={confirmToggleStatus}
        onCancel={() => {
          setShowConfirmDialog(false);
          setUserToToggle(null);
        }}
      />
    </MainLayout>
  );
};

const getStyles = (theme, isDark, isLargeScreen, isTablet, isMobile) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
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
      flex: isTablet ? 1 : undefined,
      width: isTablet ? undefined : '100%',
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
      ...theme.shadows?.sm,
    },
    pageTitle: {
      fontSize: isMobile ? 20 : 28,
      fontWeight: '700',
      fontFamily: theme.typography?.fontFamily?.bold,
      flex: isMobile ? 1 : undefined,
    },
    pageSubtitle: {
      fontSize: 14,
      fontFamily: theme.typography?.fontFamily?.regular,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
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
      minWidth: isMobile ? undefined : isTablet ? 150 : 180,
      maxWidth: isLargeScreen ? 250 : undefined,
      padding: isMobile ? 16 : 20,
    },
    statLabel: {
      fontSize: 13,
      marginBottom: 8,
      fontFamily: theme.typography?.fontFamily?.regular,
    },
    statValue: {
      fontSize: isMobile ? 28 : 32,
      fontWeight: '700',
      fontFamily: theme.typography?.fontFamily?.bold,
    },

    // Filter Section
    filterCard: {
      padding: isMobile ? 12 : 16,
      marginBottom: isMobile ? 16 : 24,
      overflow: 'visible',
      zIndex: 20,
    },
    searchInputContainer: {
      marginBottom: 12,
    },
    filterRow: {
      flexDirection: isMobile ? 'column' : 'row',
      flexWrap: 'wrap',
      gap: 12,
      zIndex: 15,
    },
    filterDropdownContainer: {
      position: 'relative',
      zIndex: 100,
      ...(isMobile && { width: '100%' }),
    },
    filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: isMobile ? 'space-between' : 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      gap: 8,
      width: isMobile ? '100%' : 'auto',
    },
    filterBtnText: {
      fontSize: 14,
      fontWeight: '500',
      fontFamily: theme.typography?.fontFamily?.medium,
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: isMobile ? 0 : undefined,
      minWidth: isMobile ? undefined : 180,
      width: isMobile ? '100%' : undefined,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 4,
      zIndex: 1000,
      overflow: 'hidden',
      ...theme.shadows?.lg,
      ...(Platform.OS === 'web' && {
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }),
    },
    dropdownItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    dropdownItemText: {
      fontSize: 14,
      fontFamily: theme.typography?.fontFamily?.regular,
    },

    // Users Grid
    usersGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    userCardWrapper: {
      width: isLargeScreen
        ? 'calc(33.333% - 11px)'
        : isTablet
          ? 'calc(50% - 8px)'
          : '100%',
      ...(Platform.OS !== 'web' && {
        width: isLargeScreen ? '31%' : isTablet ? '48%' : '100%',
      }),
    },
    userCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border,
      padding: isMobile ? 14 : 16,
      ...theme.shadows?.sm,
    },
    userHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#ffffff',
      fontFamily: theme.typography?.fontFamily?.bold,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
      fontFamily: theme.typography?.fontFamily?.semiBold,
    },
    userEmail: {
      fontSize: 13,
      fontFamily: theme.typography?.fontFamily?.regular,
    },
    statusRow: {
      marginBottom: 12,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 6,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      fontFamily: theme.typography?.fontFamily?.semiBold,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 16,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      fontFamily: theme.typography?.fontFamily?.regular,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      gap: 4,
    },
    toggleBtn: {
      borderWidth: 0,
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: '600',
      fontFamily: theme.typography?.fontFamily?.semiBold,
    },

    // Empty State
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
    },

    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 500,
      maxHeight: '90%',
      borderRadius: 16,
      padding: isMobile ? 20 : 24,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: isMobile ? 18 : 20,
      fontWeight: '700',
    },
    modalSubtitle: {
      fontSize: 14,
      marginTop: 4,
    },
    inputContainer: {
      marginBottom: 16,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    modalBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    cancelBtn: {
      borderWidth: 1,
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: '600',
    },
    submitBtn: {},
    submitBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },

    // Permissions
    permissionsContainer: {
      marginBottom: 10,
    },
    permissionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    permissionInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    permissionText: {
      flex: 1,
    },
    permissionTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 2,
    },
    permissionDesc: {
      fontSize: 12,
    },
  });

export default ManageUsersScreen;
