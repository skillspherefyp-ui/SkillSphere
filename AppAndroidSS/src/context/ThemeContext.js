
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme, Animated, View, StyleSheet } from 'react-native';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// SkillSphere Modern Learning Platform Theme
// Based on Comprehensive UI Design Guide
// Clean, Modern, Accessible, Professional

// Typography configuration - System fonts for best readability
// iOS: San Francisco, Android: Roboto, Web: system-ui
const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },
  weights: {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  },
  sizes: {
    caption: 13,      // Caption: 13px (+3)
    xs: 15,           // Extra Small: 15px (+3)
    sm: 17,           // Small: 17px (+3)
    base: 15,         // Base: 15px (+3)
    lg: 21,           // Large: 21px (+3)
    xl: 23,           // Extra Large: 23px (+3)
    '2xl': 27,        // 2XL: 27px (+3)
    '3xl': 33,        // 3XL: 33px (+3)
    '4xl': 39,        // 4XL: 39px (+3)
    '5xl': 51,        // 5XL: 51px (+3)
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,      // Line Height: 1.5x as per guide
    relaxed: 1.75,
  },
};

// Spacing System - 4px based as per guide
const spacing = {
  micro: 4,   // 4px - Micro spacing (icon gaps)
  xs: 8,      // 8px - Small spacing (labels, inline elements)
  sm: 12,     // 12px - Compact padding
  md: 16,     // 16px - Default padding (cards, sections)
  lg: 24,     // 24px - Section spacing
  xl: 32,     // 32px - Page-level spacing
  '2xl': 48,  // 48px - Major section breaks
  '3xl': 64,
};

// Border Radius as per guide
const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,      // Forms & Inputs: 12px
  xl: 14,      // Toast notifications: 14px
  '2xl': 16,   // Cards: 16px as per guide
  '3xl': 20,
  full: 9999,
};

// Light Theme - EduView Orange / Navy palette
const lightTheme = {
  mode: 'light',
  colors: {
    // Primary Palette — warm orange
    primary: '#FF8C42',
    primaryDark: '#E87532',
    primaryLight: '#F5A53A',
    primaryMuted: '#FFB380',

    // Secondary Colors — purple
    secondary: '#7C6FCD',
    secondaryDark: '#6455B0',
    secondaryLight: '#9B8DE0',
    secondaryMuted: '#BDB0F0',

    // Accent Colors — yellow
    accent: '#F5C842',
    accentHover: '#E0B530',

    // Gradient Colors
    gradientStart: '#FF8C42',
    gradientMid: '#F5A53A',
    gradientEnd: '#F5C842',

    // Hero/Navbar Gradient — navy
    heroGradientStart: '#1A1A2E',
    heroGradientMid: '#1E1E38',
    heroGradientEnd: '#252540',

    // Button Gradients
    buttonGradientStart: '#FF8C42',
    buttonGradientEnd: '#F5A53A',

    // Background Colors (Section 5.2 - Light Theme)
    background: '#F9FAFB',        // Background: #F9FAFB
    backgroundSecondary: '#F3F4F6',
    backgroundTertiary: '#E5E7EB',
    surface: '#FFFFFF',           // Surface/Card: #FFFFFF

    // Card Colors
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    cardBackground: '#FFFFFF',
    cardGlass: 'rgba(255, 255, 255, 0.65)',  // Glass Effect (Section 27.2)
    cardBorder: '#E5E7EB',        // Border: #E5E7EB
    cardBorderHover: '#4F46E5',

    // Text Colors (Section 5.2)
    text: '#111827',              // Text Primary: #111827
    textPrimary: '#111827',
    textSecondary: '#6B7280',     // Text Secondary: #6B7280
    textTertiary: '#9CA3AF',
    textMuted: '#D1D5DB',
    textInverse: '#FFFFFF',
    textOnPrimary: '#FFFFFF',

    // Border Colors
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    borderFocus: '#FF8C42',
    divider: '#E5E7EB',

    // Interactive States
    link: '#FF8C42',
    linkHover: '#E87532',
    placeholder: '#9CA3AF',
    disabled: '#D1D5DB',
    disabledText: '#9CA3AF',

    // Status Colors (consistent with guide)
    success: '#10B981',
    successLight: '#D1FAE5',
    successDark: '#059669',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    errorDark: '#DC2626',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    warningDark: '#D97706',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
    infoDark: '#2563EB',

    // Shadow Colors (Section 7.2)
    shadow: 'rgba(0,0,0,0.08)',   // Light: 0 8px 24px rgba(0,0,0,0.08)
    shadowMedium: 'rgba(0,0,0,0.12)',
    shadowStrong: 'rgba(0,0,0,0.18)',
    shadowPrimary: 'rgba(255, 140, 66, 0.25)',

    // Overlay
    overlay: 'rgba(17, 24, 39, 0.5)',
    overlayLight: 'rgba(17, 24, 39, 0.3)',

    // Glow Effects
    primaryGlow: 'rgba(255, 140, 66, 0.2)',
    secondaryGlow: 'rgba(124, 111, 205, 0.2)',
    successGlow: 'rgba(16, 185, 129, 0.15)',
    errorGlow: 'rgba(239, 68, 68, 0.15)',

    // Input Colors
    inputBackground: '#FFFFFF',
    inputBorder: '#E5E7EB',
    inputBorderFocus: '#FF8C42',
    inputText: '#111827',
    inputPlaceholder: '#9CA3AF',

    // Navbar specific
    navbarBackground: 'linear-gradient(135deg, #1A1A2E 0%, #252540 100%)',
    navbarText: '#FFFFFF',
    navbarTextHover: 'rgba(255, 255, 255, 0.8)',

    // Sidebar / surface extras
    sidebarGradientTop: '#1A1A2E',
    sidebarGradientBottom: '#252540',

    // Tab Bar
    tabBarBackground: '#FFFFFF',
    tabBarActiveTint: '#FF8C42',
    tabBarInactiveTint: '#9CA3AF',
    tabBarBorder: '#E5E7EB',
  },

  // Glassmorphism config
  glass: {
    background: 'rgba(255, 255, 255, 0.65)',
    backdropBlur: 12,
    border: 'rgba(255, 255, 255, 0.3)',
    borderHover: 'rgba(255, 140, 66, 0.3)',
  },

  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 30,
      elevation: 8,
    },
    glow: {
      shadowColor: '#FF8C42',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
  },

  borderRadius,
  spacing,
  typography,

  // Animation durations (Section 11)
  animation: {
    fast: 150,     // 150-250ms
    normal: 250,
    slow: 300,     // Smooth animated transition: 300ms
  },

  // Layout (Section 2 & 3)
  layout: {
    headerHeight: 64,        // Web: 64px
    headerHeightMobile: 56,  // Mobile App: 56px
    sidebarWidth: 260,       // Width: 260px
    sidebarTriggerZone: 12,  // Collapsed trigger zone: 12px
    maxContentWidth: 1440,   // Max width: 1440px
    gutter: 24,              // Gutter: 24px
    margin: 32,              // Margin: 32px
  },
};

// Dark Theme — navy + orange palette
const darkTheme = {
  mode: 'dark',
  colors: {
    // Primary Colors — orange consistent across themes
    primary: '#FF8C42',
    primaryDark: '#E87532',
    primaryLight: '#F5A53A',
    primaryMuted: '#C06820',

    // Secondary Colors — purple
    secondary: '#9B8DE0',
    secondaryDark: '#7C6FCD',
    secondaryLight: '#BDB0F0',
    secondaryMuted: '#6455B0',

    // Accent Colors
    accent: '#F5C842',
    accentHover: '#E0B530',

    // Gradient Colors
    gradientStart: '#FF8C42',
    gradientMid: '#F5A53A',
    gradientEnd: '#F5C842',

    // Hero/Navbar Gradient
    heroGradientStart: '#1A1A2E',
    heroGradientMid: '#1E1E38',
    heroGradientEnd: '#252540',

    // Button Gradients
    buttonGradientStart: '#FF8C42',
    buttonGradientEnd: '#F5A53A',

    // Background Colors — navy dark
    background: '#0D0D1E',
    backgroundSecondary: '#1A1A2E',
    backgroundTertiary: '#252540',
    surface: '#1A1A2E',

    // Card Colors
    card: '#1A1A2E',
    cardElevated: '#252540',
    cardBackground: '#1A1A2E',
    cardGlass: 'rgba(26, 26, 46, 0.85)',
    cardBorder: 'rgba(255,255,255,0.08)',
    cardBorderHover: '#FF8C42',

    // Text Colors
    text: '#F8FAFC',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    textMuted: '#475569',
    textInverse: '#0D0D1E',
    textOnPrimary: '#FFFFFF',

    // Border Colors
    border: 'rgba(255,255,255,0.1)',
    borderLight: 'rgba(255,255,255,0.06)',
    borderFocus: '#FF8C42',
    divider: 'rgba(255,255,255,0.08)',

    // Interactive States
    link: '#FF8C42',
    linkHover: '#F5A53A',
    placeholder: '#64748B',
    disabled: '#374151',
    disabledText: '#6B7280',

    // Status Colors
    success: '#34D399',
    successLight: 'rgba(52, 211, 153, 0.15)',
    successDark: '#10B981',
    error: '#F87171',
    errorLight: 'rgba(248, 113, 113, 0.15)',
    errorDark: '#EF4444',
    warning: '#FBBF24',
    warningLight: 'rgba(251, 191, 36, 0.15)',
    warningDark: '#F59E0B',
    info: '#60A5FA',
    infoLight: 'rgba(96, 165, 250, 0.15)',
    infoDark: '#3B82F6',

    // Shadow Colors
    shadow: 'rgba(0,0,0,0.5)',
    shadowMedium: 'rgba(0,0,0,0.6)',
    shadowStrong: 'rgba(0,0,0,0.7)',
    shadowPrimary: 'rgba(255, 140, 66, 0.3)',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.5)',

    // Tab Bar
    tabBarBackground: '#1A1A2E',
    tabBarActiveTint: '#FF8C42',
    tabBarInactiveTint: 'rgba(255,255,255,0.4)',
    tabBarBorder: 'rgba(255,255,255,0.08)',

    // Glow Effects
    primaryGlow: 'rgba(255, 140, 66, 0.3)',
    secondaryGlow: 'rgba(155, 141, 224, 0.3)',
    successGlow: 'rgba(52, 211, 153, 0.3)',
    errorGlow: 'rgba(248, 113, 113, 0.3)',

    // Input Colors
    inputBackground: '#252540',
    inputBorder: 'rgba(255,255,255,0.12)',
    inputBorderFocus: '#FF8C42',
    inputText: '#F8FAFC',
    inputPlaceholder: '#64748B',

    // Navbar specific
    navbarBackground: 'linear-gradient(135deg, #1A1A2E 0%, #252540 100%)',
    navbarText: '#FFFFFF',
    navbarTextHover: 'rgba(255, 255, 255, 0.8)',

    // Sidebar
    sidebarGradientTop: '#1A1A2E',
    sidebarGradientBottom: '#252540',
  },

  // Glassmorphism config — dark mode
  glass: {
    background: 'rgba(26, 26, 46, 0.85)',
    backdropBlur: 16,
    border: 'rgba(255, 255, 255, 0.1)',
    borderHover: 'rgba(255, 140, 66, 0.4)',
  },

  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 30,
      elevation: 8,
    },
    glow: {
      shadowColor: '#FF8C42',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 8,
    },
    glowPurple: {
      shadowColor: '#9B8DE0',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 8,
    },
  },

  borderRadius,
  spacing,
  typography,

  // Animation durations
  animation: {
    fast: 150,
    normal: 250,
    slow: 300,
  },

  // Layout
  layout: {
    headerHeight: 64,
    headerHeightMobile: 56,
    sidebarWidth: 260,
    sidebarTriggerZone: 12,
    maxContentWidth: 1440,
    gutter: 24,
    margin: 32,
  },
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('light');
  const [isLoading, setIsLoading] = useState(true);

  // Theme transition overlay
  const transitionAnim = useRef(new Animated.Value(0)).current;
  const [overlayColor, setOverlayColor] = useState('#F9FAFB');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme) {
        setThemeMode(savedTheme);
      } else {
        setThemeMode(systemColorScheme || 'light');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      setThemeMode('light');
    } finally {
      setIsLoading(false);
    }
  };

  // Animate a full-screen color wash: fade in the new theme's bg color,
  // switch theme at peak (invisible behind overlay), then fade out.
  const animateThemeSwitch = (newMode) => {
    const bgColor = newMode === 'dark' ? '#0D0D1E' : '#F9FAFB';
    setOverlayColor(bgColor);

    Animated.timing(transitionAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setThemeMode(newMode);
      AsyncStorage.setItem('themeMode', newMode).catch(() => {});

      Animated.timing(transitionAnim, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }).start();
    });
  };

  const toggleTheme = () => {
    const newTheme = themeMode === 'light' ? 'dark' : 'light';
    animateThemeSwitch(newTheme);
  };

  const setTheme = (mode) => {
    if (mode !== themeMode) {
      animateThemeSwitch(mode);
    }
  };

  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  const value = {
    theme,
    themeMode,
    toggleTheme,
    setTheme,
    isLoading,
    isDark: themeMode === 'dark',
  };

  return (
    <ThemeContext.Provider value={value}>
      <View style={themeProviderStyles.root}>
        {children}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: overlayColor, opacity: transitionAnim },
          ]}
        />
      </View>
    </ThemeContext.Provider>
  );
};

const themeProviderStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

