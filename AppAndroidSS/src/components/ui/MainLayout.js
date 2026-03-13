import React from 'react';
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
import AppHeader from './AppHeader';

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
  showMenuButton = true,
  customSidebar = null,
  customSidebarVisible = false,
  onCustomSidebarToggle = null,
  customMenuIcon = null,
  hideHeaderToggle = false,
}) => {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;
  const isTablet = width > 768;
  const hasCustomSidebar = !!customSidebar;

  // Responsive sidebar width — narrow enough to leave content usable on any screen
  const sidebarWidth = isLargeScreen ? 280 : isTablet ? 250 : 220;

  const styles = getStyles(theme, isDark, isWeb, isTablet);

  const toggleCustomSidebar = () => {
    if (hasCustomSidebar && onCustomSidebarToggle) {
      onCustomSidebarToggle(!customSidebarVisible);
    }
  };

  // Toggle button shown in header left section on ALL screen sizes when there's a custom sidebar
  const HeaderLeftComponent = hasCustomSidebar && !hideHeaderToggle ? (
    <TouchableOpacity
      style={[
        styles.menuButton,
        customSidebarVisible && styles.menuButtonActive,
      ]}
      onPress={toggleCustomSidebar}
      activeOpacity={0.7}
    >
      <Icon
        name={customSidebarVisible ? 'close' : (customMenuIcon || 'menu')}
        size={20}
        color="#FFFFFF"
      />
    </TouchableOpacity>
  ) : null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#1A1A2E' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

      <View style={styles.container}>

        {/* Header — always full width across top */}
        {showHeader && (
          <AppHeader
            showBack={showBack}
            rightActions={rightActions}
            leftComponent={HeaderLeftComponent}
            style={headerStyle}
            navItems={showSidebar && sidebarItems.length > 0 ? sidebarItems : []}
            activeRoute={activeRoute}
            onNavigate={onNavigate}
          />
        )}

        {/* Body row: sidebar panel + content side-by-side */}
        <View style={styles.bodyRow}>

          {/* Custom sidebar panel — slides in from left, no overlay */}
          {hasCustomSidebar && customSidebarVisible && (
            <View style={[styles.sidebarPanel, { width: sidebarWidth }]}>
              {customSidebar}
            </View>
          )}

          {/* Main content — takes remaining space */}
          <View style={[styles.content, contentStyle]}>
            {children}
          </View>

        </View>

      </View>
    </SafeAreaView>
  );
};

const getStyles = (theme, isDark, isWeb, isTablet) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      flex: 1,
      flexDirection: 'column',
    },
    bodyRow: {
      flex: 1,
      flexDirection: 'row',
    },

    // Sidebar panel — fixed width, sits to the left of content
    sidebarPanel: {
      backgroundColor: theme.colors.surface,
      borderRightWidth: 1,
      borderRightColor: isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 4,
    },

    // Main content area
    content: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // Sidebar toggle button in header
    menuButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      marginRight: 6,
    },
    menuButtonActive: {
      backgroundColor: 'rgba(255,140,66,0.25)',
      borderColor: 'rgba(255,140,66,0.5)',
    },
  });

export default MainLayout;
