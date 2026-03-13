import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Animated,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../ThemeToggle';
import { useAuth } from '../../context/AuthContext';

// PNG logo (same asset as Sidebar)
const LogoImage = require('../../assets/images/skillsphere-logo.png');

// ── Date / time helpers ──────────────────────────────────────────────────────
const formatDate = (date) =>
  date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const formatTime = (date) =>
  date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

// ── Component ────────────────────────────────────────────────────────────────
const AppHeader = ({
  showBack = true,
  rightActions,
  forceShowBack = false,
  leftComponent,
  style,
  showDateTime = true,
  navItems = [],
  activeRoute,
  onNavigate,
}) => {
  const { theme, isDark } = useTheme();
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();

  // Live clock
  const [currentTime, setCurrentTime] = useState(new Date());
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Mobile dropdown state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Pulsing live dot
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Back-button logic — hide on main/auth screens
  const isMainScreen =
    route.name === 'Login' || route.name === 'Signup' || route.name === 'Dashboard';
  const canGoBack = navigation.canGoBack() && !isMainScreen;
  const shouldShowBack = (showBack && canGoBack) || forceShowBack;

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  const isWeb = Platform.OS === 'web';
  const isDesktop = width > 1024;
  const isTablet = width > 768;
  const isMobile = !isTablet;

  const headerHeight = isWeb
    ? theme.layout.headerHeight
    : theme.layout.headerHeightMobile;

  // Total offset from screen top (status bar + header) for dropdown positioning
  const totalHeaderOffset = Platform.OS === 'ios'
    ? 44 + headerHeight
    : isWeb ? headerHeight : 24 + headerHeight;

  const styles = getStyles(theme, isDark, isWeb, isDesktop, isTablet, headerHeight);

  // ── Mobile dropdown open/close ──────────────────────────────────────────
  const openMenu = () => {
    setMenuOpen(true);
    Animated.spring(menuAnim, {
      toValue: 1,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setMenuOpen(false));
  };

  const handleNavPress = (routeName) => {
    closeMenu();
    setTimeout(() => onNavigate?.(routeName), 100);
  };

  const handleLogout = () => {
    closeMenu();
    setTimeout(() => logout(), 150);
  };

  // ── Mobile Dropdown Menu (rendered in Modal) ─────────────────────────────
  const MobileDropdown = () => (
    <Modal
      visible={menuOpen}
      transparent
      animationType="none"
      onRequestClose={closeMenu}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.modalBackdrop}
        onPress={closeMenu}
        activeOpacity={1}
      >
        {/* Dropdown card — positioned top-right below header */}
        <Animated.View
          style={[
            styles.dropdownCard,
            {
              top: totalHeaderOffset + 8,
              opacity: menuAnim,
              transform: [
                {
                  translateY: menuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-12, 0],
                  }),
                },
                {
                  scale: menuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* ── User info strip ── */}
          {user && (
            <View style={styles.dropdownUserRow}>
              <View style={styles.dropdownAvatar}>
                <Text style={styles.dropdownAvatarText}>
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownUserName} numberOfLines={1}>
                  {user.name || 'Student'}
                </Text>
                <Text style={styles.dropdownUserRole}>
                  ⚡ {user.role || 'Student'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.dropdownDivider} />

          {/* ── Nav items ── */}
          {navItems.map((item) => {
            const isActive = activeRoute === item.route;
            return (
              <TouchableOpacity
                key={item.route}
                style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                onPress={() => handleNavPress(item.route)}
                activeOpacity={0.7}
              >
                <View style={[styles.dropdownItemIcon, isActive && styles.dropdownItemIconActive]}>
                  <Icon
                    name={isActive ? (item.iconActive || item.icon) : item.icon}
                    size={18}
                    color={isActive ? '#FFFFFF' : '#FF8C42'}
                  />
                </View>
                <Text style={[styles.dropdownItemLabel, isActive && styles.dropdownItemLabelActive]}>
                  {item.label}
                </Text>
                {isActive && (
                  <View style={styles.dropdownActiveDot} />
                )}
              </TouchableOpacity>
            );
          })}

          <View style={styles.dropdownDivider} />

          {/* ── Theme toggle row ── */}
          <View style={styles.dropdownItem}>
            <View style={[styles.dropdownItemIcon, { backgroundColor: 'rgba(124,111,205,0.15)' }]}>
              <Icon name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color="#7C6FCD" />
            </View>
            <Text style={styles.dropdownItemLabel}>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </Text>
            <ThemeToggle iconColor={isDark ? '#F5C842' : '#7C6FCD'} />
          </View>

          {/* ── Settings row ── */}
          {user && (
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => { closeMenu(); setTimeout(() => navigation.navigate('Settings'), 100); }}
              activeOpacity={0.7}
            >
              <View style={[styles.dropdownItemIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(100,116,139,0.12)' }]}>
                <Icon name="settings-outline" size={18} color={isDark ? '#FFFFFF' : '#64748B'} />
              </View>
              <Text style={styles.dropdownItemLabel}>
                Settings
              </Text>
            </TouchableOpacity>
          )}

          {/* ── Logout row ── */}
          {user && (
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={[styles.dropdownItemIcon, { backgroundColor: 'rgba(255,80,80,0.12)' }]}>
                <Icon name="log-out-outline" size={18} color="#FF5050" />
              </View>
              <Text style={[styles.dropdownItemLabel, { color: '#FF5050' }]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );

  // ── Header inner content ────────────────────────────────────────────────
  const HeaderContent = () => (
    <View style={styles.contentWrapper}>
      <View style={styles.content}>

        {/* ── LEFT: Logo + optional back / custom menu ── */}
        <View style={styles.leftSection}>
          <View style={styles.logoArea}>
            <Image source={LogoImage} style={styles.logoImg} resizeMode="cover" />
            {isDesktop && (
              <Text style={styles.logoText}>
                SKILL<Text style={{ color: '#FF8C42' }}>SPHERE</Text>
              </Text>
            )}
          </View>

          {leftComponent}

          {shouldShowBack && (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── CENTER: Nav pills — tablet/desktop only ── */}
        {!isMobile && navItems.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navPillsWrap}
            style={styles.navPillsScroll}
          >
            {navItems.map((item) => {
              const isActive = activeRoute === item.route;
              return (
                <TouchableOpacity
                  key={item.route}
                  style={[styles.navPill, isActive && styles.navPillActive]}
                  onPress={() => onNavigate?.(item.route)}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={isActive ? (item.iconActive || item.icon) : item.icon}
                    size={isDesktop ? 12 : 11}
                    color={isActive ? '#1A1A2E' : 'rgba(255,255,255,0.6)'}
                  />
                  {isActive && isDesktop && (
                    <Text style={styles.navPillTextActive}>{item.label}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── RIGHT ── */}
        <View style={styles.rightSection}>

          {/* Date/time pill — full date + time on all screen sizes */}
          {showDateTime && (
            <View style={styles.dateTimeWrapper}>
              <View style={styles.dateContainer}>
                <Icon name="calendar" size={isMobile ? 16 : 14} color="#FFFFFF" />
                <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
              </View>
              <View style={styles.dateTimeDivider} />
              <View style={styles.timeContainer}>
                <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
                <Icon name="time" size={isMobile ? 16 : 14} color="#FFFFFF" />
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              </View>
            </View>
          )}

          {/* Greeting + avatar — desktop only */}
          {isDesktop && user && (
            <View style={styles.userGreeting}>
              <Text style={styles.greetingName}>
                Hello, {user.name?.split(' ')[0] || 'Student'}
              </Text>
              <Text style={styles.greetingRole}>⚡ {user.role || 'Student'}</Text>
            </View>
          )}

          {!isMobile && user && (
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}

          {/* Theme toggle + settings + logout — tablet/desktop only */}
          {!isMobile && (
            <>
              <ThemeToggle style={styles.themeToggle} iconColor="#FFFFFF" />
              {user && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Settings')}
                  style={styles.settingsButton}
                  activeOpacity={0.7}
                >
                  <Icon name="settings-outline" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {user && (
                <TouchableOpacity
                  onPress={() => logout()}
                  style={styles.logoutButton}
                  activeOpacity={0.7}
                >
                  <Icon name="log-out-outline" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {rightActions}
            </>
          )}

          {/* Mobile: apps trigger in place of theme toggle + logout */}
          {isMobile && (
            <TouchableOpacity
              onPress={menuOpen ? closeMenu : openMenu}
              style={[styles.menuTrigger, menuOpen && styles.menuTriggerOpen]}
              activeOpacity={0.8}
            >
              <Animated.View
                style={{
                  transform: [{
                    rotate: menuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '90deg'],
                    }),
                  }],
                }}
              >
                <Icon name={menuOpen ? 'close' : 'apps'} size={20} color="#FFFFFF" />
              </Animated.View>
            </TouchableOpacity>
          )}
        </View>

      </View>
    </View>
  );

  // ── Web render ──────────────────────────────────────────────────────────
  if (isWeb) {
    return (
      <>
        <View
          style={[
            styles.container,
            {
              backgroundColor: '#1A1A2E',
              background: 'linear-gradient(135deg, #1A1A2E 0%, #1E1E38 100%)',
            },
            style,
          ]}
        >
          {HeaderContent()}
        </View>
        {isMobile && MobileDropdown()}
      </>
    );
  }

  // ── Native render (LinearGradient) ──────────────────────────────────────
  return (
    <>
      <LinearGradient
        colors={['#1A1A2E', '#1E1E38']}
        style={[styles.container, style]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {HeaderContent()}
      </LinearGradient>
      {isMobile && MobileDropdown()}
    </>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────
const getStyles = (theme, isDark, isWeb, isDesktop, isTablet, headerHeight) =>
  StyleSheet.create({
    container: {
      height: headerHeight + (Platform.OS === 'ios' ? 44 : isWeb ? 0 : 24),
      paddingTop: Platform.OS === 'ios' ? 44 : isWeb ? 0 : 24,
      paddingHorizontal: isTablet ? 20 : 16,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 10,
    },
    contentWrapper: {
      flex: 1,
      width: '100%',
      alignSelf: 'center',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 10,
    },

    // ── Left ──
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    },
    logoArea: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    logoImg: {
      width: 46,
      height: 46,
      borderRadius: 13,
    },
    logoText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 16,
      letterSpacing: 1.2,
    },
    backButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },

    // ── Center nav pills (tablet/desktop) ──
    navPillsScroll: {
      flex: 1,
      marginHorizontal: isDesktop ? 8 : 4,
    },
    navPillsWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#252540',
      borderRadius: 14,
      padding: 4,
      gap: 2,
      flexGrow: 1,
    },
    navPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: isDesktop ? 10 : 8,
      paddingVertical: isDesktop ? 5 : 4,
      borderRadius: 8,
    },
    navPillActive: {
      backgroundColor: '#FFFFFF',
    },
    navPillTextActive: {
      color: '#1A1A2E',
      fontSize: 11,
      fontWeight: '700',
    },

    // ── Right ──
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      ...(isTablet ? { flexShrink: 0 } : { flex: 1, justifyContent: 'flex-end' }),
    },
    dateTimeWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(255,255,255,0.1)',
      paddingHorizontal: isTablet ? 20 : 14,
      paddingVertical: 8,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      ...(isTablet ? { minWidth: isDesktop ? 280 : 240 } : { flex: 1, marginHorizontal: 18, alignSelf: 'center' }),
      gap: 8,
      ...(isWeb && {
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }),
    },
    dateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    dateText: {
      color: '#FFFFFF',
      fontSize: isTablet ? 10 : 14,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    dateTimeDivider: {
      width: 1,
      height: 16,
      backgroundColor: 'rgba(255,255,255,0.3)',
      marginHorizontal: 4,
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      justifyContent: 'flex-end',
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#4ADE80',
      shadowColor: '#4ADE80',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
      elevation: 3,
    },
    timeText: {
      color: '#FFFFFF',
      fontSize: isTablet ? 10 : 14,
      fontWeight: '700',
      letterSpacing: 0.5,
      fontVariant: ['tabular-nums'],
    },
    userGreeting: {
      alignItems: 'flex-end',
    },
    greetingName: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 13,
    },
    greetingRole: {
      color: '#FF8C42',
      fontSize: 11,
      fontWeight: '600',
      marginTop: 1,
    },
    avatarSmall: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#F5C842',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarSmallText: {
      color: '#1A1A2E',
      fontWeight: '800',
      fontSize: 14,
    },
    themeToggle: {
      marginLeft: 0,
    },
    settingsButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    logoutButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,80,80,0.18)',
      borderWidth: 1,
      borderColor: 'rgba(255,80,80,0.35)',
    },

    // ── Mobile menu trigger ──
    menuTrigger: {
      width: 38,
      height: 38,
      borderRadius: 19,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,140,66,0.2)',
      borderWidth: 1.5,
      borderColor: 'rgba(255,140,66,0.5)',
    },
    menuTriggerOpen: {
      backgroundColor: 'rgba(255,140,66,0.35)',
      borderColor: '#FF8C42',
    },

    // ── Mobile dropdown (inside Modal) ──
    modalBackdrop: {
      flex: 1,
      backgroundColor: isWeb ? 'rgba(10,10,30,0.4)' : 'rgba(0,0,0,0.6)',
      ...(isWeb ? {
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      } : {}),
    },
    dropdownCard: {
      position: 'absolute',
      right: 12,
      width: 230,
      backgroundColor: isDark ? '#1E1E38' : '#FFFFFF',
      borderRadius: 20,
      paddingVertical: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,140,66,0.25)' : 'rgba(255,140,66,0.2)',
      overflow: 'hidden',
    },

    // User strip
    dropdownUserRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    dropdownAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#F5C842',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,140,66,0.4)',
    },
    dropdownAvatarText: {
      color: '#1A1A2E',
      fontWeight: '900',
      fontSize: 16,
    },
    dropdownUserName: {
      color: isDark ? '#FFFFFF' : '#1A1A2E',
      fontWeight: '700',
      fontSize: 14,
    },
    dropdownUserRole: {
      color: '#FF8C42',
      fontSize: 11,
      fontWeight: '600',
      marginTop: 1,
    },

    // Divider
    dropdownDivider: {
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
      marginVertical: 4,
      marginHorizontal: 12,
    },

    // Nav item row
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginHorizontal: 6,
      marginVertical: 1,
      borderRadius: 12,
      gap: 12,
    },
    dropdownItemActive: {
      backgroundColor: isDark ? 'rgba(255,140,66,0.12)' : 'rgba(255,140,66,0.08)',
    },
    dropdownItemIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,140,66,0.1)',
    },
    dropdownItemIconActive: {
      backgroundColor: '#FF8C42',
    },
    dropdownItemLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? 'rgba(255,255,255,0.85)' : '#1A1A2E',
    },
    dropdownItemLabelActive: {
      color: '#FF8C42',
      fontWeight: '700',
    },
    dropdownActiveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#FF8C42',
    },
  });

export default AppHeader;
