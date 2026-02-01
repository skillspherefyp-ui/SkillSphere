import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import MainLayout from '../../components/ui/MainLayout';
import AppCard from '../../components/ui/AppCard';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { certificateAPI, API_BASE } from '../../services/apiClient';

const CertificatesScreen = () => {
  const { user, logout } = useAuth();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;
  const isTablet = width > 768;
  const isMobile = width <= 480;

  // Student sidebar navigation items
  const sidebarItems = [
    { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid', route: 'Dashboard' },
    { label: 'Browse Courses', icon: 'library-outline', iconActive: 'library', route: 'Courses' },
    { label: 'My Learning', icon: 'school-outline', iconActive: 'school', route: 'EnrolledCourses' },
    { label: 'AI Assistant', icon: 'sparkles-outline', iconActive: 'sparkles', route: 'AITutor' },
    { label: 'Certificates', icon: 'ribbon-outline', iconActive: 'ribbon', route: 'Certificates' },
  ];

  const sortOptions = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Oldest First', value: 'oldest' },
    { label: 'Course Name A-Z', value: 'name-asc' },
    { label: 'Course Name Z-A', value: 'name-desc' },
  ];

  const handleNavigate = (route) => {
    navigation.navigate(route);
  };

  // Fetch certificates
  const fetchCertificates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await certificateAPI.getMyCertificates();
      if (response.success) {
        setCertificates(response.certificates || []);
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load certificates' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCertificates();
    setRefreshing(false);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = certificates.length;
    const thisMonth = certificates.filter(cert => {
      const date = new Date(cert.issuedDate);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    const thisYear = certificates.filter(cert => {
      const date = new Date(cert.issuedDate);
      return date.getFullYear() === new Date().getFullYear();
    }).length;

    return { total, thisMonth, thisYear };
  }, [certificates]);

  // Filter and sort certificates
  const filteredCertificates = useMemo(() => {
    let filtered = certificates.filter(cert => {
      const courseName = cert.course?.name || '';
      return courseName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Sort
    switch (sortOrder) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.issuedDate) - new Date(b.issuedDate));
        break;
      case 'name-asc':
        filtered.sort((a, b) => (a.course?.name || '').localeCompare(b.course?.name || ''));
        break;
      case 'name-desc':
        filtered.sort((a, b) => (b.course?.name || '').localeCompare(a.course?.name || ''));
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.issuedDate) - new Date(a.issuedDate));
        break;
    }

    return filtered;
  }, [certificates, searchQuery, sortOrder]);

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get certificate URL
  const getCertificateUrl = (certificateUrl) => {
    if (!certificateUrl) return null;
    if (certificateUrl.startsWith('http')) return certificateUrl;
    return `${API_BASE.replace('/api', '')}${certificateUrl}`;
  };

  // Handle download/view certificate
  const handleViewCertificate = (certificate) => {
    const url = getCertificateUrl(certificate.certificateUrl);
    if (url) {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        Linking.openURL(url);
      }
    } else {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Certificate file not available' });
    }
  };

  // Handle download certificate
  const handleDownloadCertificate = async (certificate) => {
    const url = getCertificateUrl(certificate.certificateUrl);
    if (url) {
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Certificate-${certificate.certificateNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Toast.show({ type: 'success', text1: 'Success', text2: 'Downloading certificate...' });
      } else {
        Linking.openURL(url);
      }
    } else {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Certificate file not available' });
    }
  };

  const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile);

  // Loading state
  if (loading) {
    return (
      <MainLayout
        showSidebar={true}
        sidebarItems={sidebarItems}
        activeRoute="Certificates"
        onNavigate={handleNavigate}
        userInfo={{ name: user?.name, role: 'Student', avatar: user?.avatar }}
        onLogout={logout}
        onSettings={() => navigation.navigate('Settings')}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading your certificates...
          </Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      showSidebar={true}
      sidebarItems={sidebarItems}
      activeRoute="Certificates"
      onNavigate={handleNavigate}
      userInfo={{ name: user?.name, role: 'Student', avatar: user?.avatar }}
      onLogout={logout}
      onSettings={() => navigation.navigate('Settings')}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
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
                My Certificates
              </Text>
            </View>
            <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>
              View and download your earned certificates
            </Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <AppCard style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B15' }]}>
              <Icon name="ribbon" size={24} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {stats.total}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Total Certificates
            </Text>
          </AppCard>
          <AppCard style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#10B98115' }]}>
              <Icon name="calendar" size={24} color="#10B981" />
            </View>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {stats.thisMonth}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              This Month
            </Text>
          </AppCard>
          <AppCard style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
              <Icon name="trophy" size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {stats.thisYear}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              This Year
            </Text>
          </AppCard>
        </View>

        {/* Search & Filter Section */}
        <AppCard style={styles.filterCard} allowOverflow>
          <AppInput
            placeholder="Search certificates by course name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Icon name="search" size={20} color={theme.colors.textSecondary} />}
            containerStyle={styles.searchInputContainer}
          />
          <View style={styles.filterRow}>
            {/* Sort Filter */}
            <View style={styles.filterDropdownContainer}>
              <TouchableOpacity
                style={[styles.filterBtn, { borderColor: theme.colors.border, backgroundColor: isDark ? theme.colors.card : theme.colors.background }]}
                onPress={() => setShowSortDropdown(!showSortDropdown)}
              >
                <Icon name="swap-vertical" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.filterBtnText, { color: theme.colors.textPrimary }]}>
                  {sortOptions.find(o => o.value === sortOrder)?.label || 'Sort'}
                </Text>
                <Icon name="chevron-down" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              {showSortDropdown && (
                <View style={[styles.dropdown, { backgroundColor: isDark ? theme.colors.card : theme.colors.surface, borderColor: theme.colors.border }]}>
                  {sortOptions.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dropdownItem,
                        sortOrder === option.value && { backgroundColor: theme.colors.primary + '15' }
                      ]}
                      onPress={() => {
                        setSortOrder(option.value);
                        setShowSortDropdown(false);
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

            {/* Results count */}
            <Text style={[styles.resultsCount, { color: theme.colors.textTertiary }]}>
              {filteredCertificates.length} certificate{filteredCertificates.length !== 1 ? 's' : ''} found
            </Text>
          </View>
        </AppCard>

        {/* Certificates Grid */}
        {filteredCertificates.length > 0 ? (
          <View style={styles.certificatesGrid}>
            {filteredCertificates.map((certificate, index) => (
              <Animated.View
                key={certificate.id}
                entering={FadeInDown.duration(400).delay(index * 80)}
                style={styles.certificateCardWrapper}
              >
                <TouchableOpacity
                  style={[
                    styles.certificateCard,
                    { backgroundColor: isDark ? theme.colors.card : theme.colors.surface },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleViewCertificate(certificate)}
                >
                  {/* Certificate Header */}
                  <View style={styles.certificateHeader}>
                    <View style={[styles.certificateIconContainer, { backgroundColor: '#F59E0B15' }]}>
                      <Icon name="ribbon" size={32} color="#F59E0B" />
                    </View>
                    <View style={[styles.verifiedBadge, { backgroundColor: '#10B98115' }]}>
                      <Icon name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={[styles.verifiedText, { color: '#10B981' }]}>Verified</Text>
                    </View>
                  </View>

                  {/* Course Info */}
                  <Text style={[styles.courseName, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                    {certificate.course?.name || 'Course Certificate'}
                  </Text>

                  {/* Certificate Details */}
                  <View style={styles.certificateDetails}>
                    <View style={styles.detailItem}>
                      <Icon name="document-text-outline" size={14} color={theme.colors.textTertiary} />
                      <Text style={[styles.detailText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {certificate.certificateNumber || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Icon name="calendar-outline" size={14} color={theme.colors.textTertiary} />
                      <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                        {formatDate(certificate.issuedDate)}
                      </Text>
                    </View>
                    {certificate.grade && (
                      <View style={styles.detailItem}>
                        <Icon name="star-outline" size={14} color={theme.colors.textTertiary} />
                        <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                          Grade: {certificate.grade}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={styles.certificateActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: theme.colors.primary }]}
                      onPress={() => handleViewCertificate(certificate)}
                    >
                      <Icon name="eye-outline" size={16} color={theme.colors.primary} />
                      <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.downloadBtn, { backgroundColor: theme.colors.primary }]}
                      onPress={() => handleDownloadCertificate(certificate)}
                    >
                      <Icon name="download-outline" size={16} color="#FFFFFF" />
                      <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Download</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        ) : (
          <AppCard style={styles.emptyContainer}>
            <EmptyState
              icon="ribbon-outline"
              title={searchQuery ? 'No certificates found' : 'No certificates yet'}
              subtitle={searchQuery
                ? 'Try a different search term'
                : 'Complete courses to earn certificates. They will appear here automatically.'}
            />
            {!searchQuery && (
              <AppButton
                title="Browse Courses"
                onPress={() => navigation.navigate('Courses')}
                variant="primary"
                leftIcon="library-outline"
                style={styles.browseButton}
              />
            )}
          </AppCard>
        )}

        {/* Info Card */}
        {certificates.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <AppCard style={[styles.infoCard, { backgroundColor: theme.colors.primary + '10' }]}>
              <Icon name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoCardText, { color: theme.colors.primary }]}>
                Certificates are automatically generated when you complete 100% of a course. They are also sent to your email as PDF attachments.
              </Text>
            </AppCard>
          </Animated.View>
        )}
      </ScrollView>
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
      minWidth: isMobile ? undefined : isTablet ? 150 : 180,
      maxWidth: isLargeScreen ? 280 : undefined,
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
      alignItems: isMobile ? 'stretch' : 'center',
      justifyContent: 'space-between',
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
      fontFamily: theme.typography.fontFamily.medium,
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
      ...theme.shadows.lg,
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
      fontFamily: theme.typography.fontFamily.regular,
    },
    resultsCount: {
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.regular,
    },

    // Certificates Grid
    certificatesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      marginBottom: 24,
    },
    certificateCardWrapper: {
      width: isLargeScreen
        ? 'calc(33.333% - 11px)'
        : isTablet
          ? 'calc(50% - 8px)'
          : '100%',
      ...(Platform.OS !== 'web' && {
        width: isLargeScreen ? '31%' : isTablet ? '48%' : '100%',
      }),
    },
    certificateCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border,
      padding: isMobile ? 16 : 20,
      ...theme.shadows.sm,
    },
    certificateHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    certificateIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    verifiedText: {
      fontSize: 11,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    courseName: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
      marginBottom: 12,
      lineHeight: 22,
    },
    certificateDetails: {
      gap: 8,
      marginBottom: 16,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detailText: {
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.regular,
      flex: 1,
    },
    certificateActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      gap: 6,
    },
    downloadBtn: {
      borderWidth: 0,
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },

    // Empty State
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
    },
    browseButton: {
      marginTop: 20,
    },

    // Info Card
    infoCard: {
      flexDirection: 'row',
      padding: 16,
      borderRadius: 12,
      alignItems: 'flex-start',
      gap: 12,
      marginTop: 8,
    },
    infoCardText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
      fontFamily: theme.typography.fontFamily.regular,
    },
  });

export default CertificatesScreen;
