import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import Sidebar from './Sidebar';
import AppHeader from './AppHeader';

// Section 17 - Page Structure & Content Hierarchy
// Standard Page Layout: Fixed Header, Hover-trigger Sidebar, Main Content

const SIDEBAR_WIDTH = 260;

const MainLayout = ({
  children,
  showHeader = true,
  showSidebar = true,
  sidebarItems = [],
  activeRoute,
  onNavigate,
  userInfo,
  onLogout,
  onSettings,
  rightActions,
  showBack = false,
  headerStyle,
  contentStyle,
  showMenuButton = true, // Show hamburger menu on mobile
  customSidebar = null, // Custom sidebar content component
  customSidebarVisible = false, // Control custom sidebar visibility externally
  onCustomSidebarToggle = null, // Callback for custom sidebar toggle
  customMenuIcon = null, // Custom icon for menu button (e.g., 'book-outline' for topics)
}) => {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const shouldShowPersistentSidebar = isWeb && isLargeScreen && !customSidebar;
  const hasCustomSidebar = !!customSidebar;

  const styles = getStyles(theme, isDark, isWeb, isLargeScreen, shouldShowPersistentSidebar, hasCustomSidebar);

  // Toggle sidebar for mobile
  const toggleSidebar = () => {
    if (hasCustomSidebar && onCustomSidebarToggle) {
      onCustomSidebarToggle(!customSidebarVisible);
    } else {
      setSidebarVisible(!sidebarVisible);
    }
  };

  // Custom header left component with menu button
  const HeaderLeftComponent = () => {
    // For custom sidebar, always show menu button on non-large screens
    if (hasCustomSidebar) {
      if (isLargeScreen) return null; // Custom sidebar is always visible on large screens
      return (
        <TouchableOpacity
          style={[styles.menuButton, customMenuIcon && styles.menuButtonCustom]}
          onPress={toggleSidebar}
          activeOpacity={0.7}
        >
          <Icon name={customMenuIcon || 'menu'} size={24} color={customMenuIcon ? theme.colors.primary : theme.colors.textPrimary} />
        </TouchableOpacity>
      );
    }

    if (shouldShowPersistentSidebar || !showMenuButton) return null;

    return (
      <TouchableOpacity
        style={styles.menuButton}
        onPress={toggleSidebar}
        activeOpacity={0.7}
      >
        <Icon name="menu" size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <View style={styles.container}>
        {/* Custom Sidebar for large screens (persistent) */}
        {hasCustomSidebar && isLargeScreen && (
          <View style={styles.customSidebarContainer}>
            {customSidebar}
          </View>
        )}

        {/* Persistent Sidebar for large web screens (standard navigation) */}
        {showSidebar && shouldShowPersistentSidebar && !hasCustomSidebar && (
          <Sidebar
            items={sidebarItems}
            activeRoute={activeRoute}
            onNavigate={onNavigate}
            userInfo={userInfo}
            onLogout={onLogout}
            onSettings={onSettings}
            isPersistent={true}
          />
        )}

        {/* Main Content Area */}
        <View style={[
          styles.mainArea,
          shouldShowPersistentSidebar && styles.mainAreaWithSidebar,
          hasCustomSidebar && isLargeScreen && styles.mainAreaWithCustomSidebar
        ]}>
          {/* Header */}
          {showHeader && (
            <AppHeader
              showBack={showBack}
              rightActions={rightActions}
              leftComponent={<HeaderLeftComponent />}
              style={headerStyle}
            />
          )}

          {/* Page Content */}
          <View style={[styles.content, contentStyle]}>
            {children}
          </View>
        </View>

        {/* Custom Sidebar overlay for smaller screens */}
        {hasCustomSidebar && !isLargeScreen && customSidebarVisible && (
          <>
            <TouchableOpacity
              style={styles.customSidebarOverlay}
              activeOpacity={1}
              onPress={() => onCustomSidebarToggle?.(false)}
            />
            <View style={styles.customSidebarOverlayContent}>
              {customSidebar}
            </View>
          </>
        )}

        {/* Overlay Sidebar for smaller screens or mobile (standard navigation) */}
        {showSidebar && !shouldShowPersistentSidebar && !hasCustomSidebar && (
          <Sidebar
            items={sidebarItems}
            activeRoute={activeRoute}
            onNavigate={(route) => {
              setSidebarVisible(false);
              onNavigate?.(route);
            }}
            userInfo={userInfo}
            onLogout={onLogout}
            onSettings={onSettings}
            visible={sidebarVisible}
            onVisibilityChange={setSidebarVisible}
            isPersistent={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const CUSTOM_SIDEBAR_WIDTH = 280;

const getStyles = (theme, isDark, isWeb, isLargeScreen, hasPersistentSidebar, hasCustomSidebar) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      flex: 1,
      flexDirection: 'row',
    },
    mainArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    mainAreaWithSidebar: {
      marginLeft: SIDEBAR_WIDTH,
    },
    mainAreaWithCustomSidebar: {
      marginLeft: CUSTOM_SIDEBAR_WIDTH,
    },
    content: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    menuButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark
        ? theme.colors.backgroundTertiary
        : theme.colors.backgroundSecondary,
      marginRight: 12,
    },
    menuButtonCustom: {
      backgroundColor: isDark
        ? 'rgba(79, 70, 229, 0.2)'
        : theme.colors.primary + '15',
    },
    // Custom Sidebar styles
    customSidebarContainer: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: CUSTOM_SIDEBAR_WIDTH,
      backgroundColor: isDark ? '#1a1a2e' : theme.colors.surface,
      borderRightWidth: 1,
      borderRightColor: isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border,
      zIndex: 10,
    },
    customSidebarOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 99,
    },
    customSidebarOverlayContent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: CUSTOM_SIDEBAR_WIDTH,
      backgroundColor: isDark ? '#1a1a2e' : theme.colors.surface,
      zIndex: 100,
      shadowColor: '#000',
      shadowOffset: { width: 4, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 20,
    },
  });

export default MainLayout;
