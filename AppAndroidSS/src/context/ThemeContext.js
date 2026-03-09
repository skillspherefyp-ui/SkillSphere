import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

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

const createSemanticColors = (palette) => {
  return {
    primary: palette.primary,
    primaryDark: palette.primaryDark,
    primaryLight: palette.primaryLight,
    primaryMuted: palette.primaryMuted,

    secondary: palette.secondary,
    secondaryDark: palette.secondaryDark,
    secondaryLight: palette.secondaryLight,
    secondaryMuted: palette.secondaryMuted,

    accent: palette.accent,
    accentHover: palette.accentHover,

    background: palette.background,
    backgroundSecondary: palette.backgroundSecondary,
    backgroundTertiary: palette.backgroundTertiary,
    surface: palette.surface,
    card: palette.card,
    cardElevated: palette.cardElevated,
    cardBackground: palette.card,
    cardGlass: palette.cardGlass,
    cardBorder: palette.cardBorder,
    cardBorderHover: palette.cardBorderHover,

    text: palette.text,
    textPrimary: palette.text,
    textSecondary: palette.textSecondary,
    textTertiary: palette.textTertiary,
    textMuted: palette.muted,
    textInverse: palette.textInverse,
    textOnPrimary: palette.textOnPrimary,

    muted: palette.muted,
    border: palette.border,
    borderLight: palette.borderLight,
    borderFocus: palette.primary,
    divider: palette.divider,

    success: palette.success,
    successLight: palette.successLight,
    successDark: palette.successDark,
    warning: palette.warning,
    warningLight: palette.warningLight,
    warningDark: palette.warningDark,
    error: palette.error,
    errorLight: palette.errorLight,
    errorDark: palette.errorDark,
    info: palette.info,
    infoLight: palette.infoLight,
    infoDark: palette.infoDark,

    icon: palette.icon,
    placeholder: palette.placeholder,
    inputBackground: palette.inputBackground,
    inputBorder: palette.inputBorder,
    inputBorderFocus: palette.primary,
    inputText: palette.inputText,
    inputPlaceholder: palette.placeholder,
    disabled: palette.disabled,
    disabledText: palette.disabledText,
    shadow: palette.shadow,
    shadowMedium: palette.shadowMedium,
    shadowStrong: palette.shadowStrong,
    shadowPrimary: palette.shadowPrimary,
    notification: palette.notification,
    overlay: palette.overlay,
    overlayLight: palette.overlayLight,

    tabBarBackground: palette.tabBarBackground,
    tabBarActiveTint: palette.tabBarActiveTint,
    tabBarInactiveTint: palette.tabBarInactiveTint,
    tabBarBorder: palette.tabBarBorder,

    link: palette.primary,
    linkHover: palette.primaryDark,

    gradientStart: palette.gradientStart,
    gradientMid: palette.gradientMid,
    gradientEnd: palette.gradientEnd,
    heroGradientStart: palette.gradientStart,
    heroGradientMid: palette.gradientMid,
    heroGradientEnd: palette.gradientEnd,
    buttonGradientStart: palette.buttonGradientStart,
    buttonGradientEnd: palette.buttonGradientEnd,

    navbarBackground: palette.navbarBackground,
    navbarText: palette.navbarText,
    navbarTextHover: palette.navbarTextHover,
    sidebarGradientTop: palette.sidebarGradientTop,
    sidebarGradientBottom: palette.sidebarGradientBottom,

    headerBackground: palette.headerBackground,
    headerSurface: palette.headerSurface,
    headerBorder: palette.headerBorder,
    headerText: palette.headerText,
    headerMutedText: palette.headerMutedText,
    headerIcon: palette.headerIcon,
    sectionBackground: palette.sectionBackground,
    sectionElevated: palette.sectionElevated,

    primaryGlow: palette.primaryGlow,
    secondaryGlow: palette.secondaryGlow,
    successGlow: palette.successGlow,
    errorGlow: palette.errorGlow,
  };
};

const lightPalette = {
  primary: '#274C77',
  primaryDark: '#1B3658',
  primaryLight: '#4F739E',
  primaryMuted: '#88A1BC',
  secondary: '#567C9B',
  secondaryDark: '#40627F',
  secondaryLight: '#7E9AB3',
  secondaryMuted: '#B2C0CD',
  accent: '#2D6F6D',
  accentHover: '#245C5A',
  background: '#F5F1EA',
  backgroundSecondary: '#EEE8DE',
  backgroundTertiary: '#E3DBCF',
  surface: '#FFFDFC',
  card: '#FFFCF8',
  cardElevated: '#FFFFFF',
  cardGlass: 'rgba(255, 252, 248, 0.82)',
  cardBorder: '#D8D1C7',
  cardBorderHover: '#88A1BC',
  text: '#132238',
  textSecondary: '#5B6776',
  textTertiary: '#7E8895',
  muted: '#AAB2BC',
  textInverse: '#FFFDFC',
  textOnPrimary: '#F8FAFC',
  border: '#D7D0C4',
  borderLight: '#EAE4DB',
  divider: '#DDD6CB',
  success: '#2F7D5A',
  successLight: '#DDEFE6',
  successDark: '#245E44',
  warning: '#A67C37',
  warningLight: '#F4E8CF',
  warningDark: '#7C5D27',
  error: '#B6544B',
  errorLight: '#F5DFDB',
  errorDark: '#8F413B',
  info: '#3F6F96',
  infoLight: '#DDE8F1',
  infoDark: '#2B5374',
  icon: '#506176',
  placeholder: '#8691A0',
  inputBackground: '#FFFFFF',
  inputBorder: '#D7D0C4',
  inputText: '#132238',
  disabled: '#D5D0C8',
  disabledText: '#9B9489',
  shadow: 'rgba(22, 35, 52, 0.10)',
  shadowMedium: 'rgba(22, 35, 52, 0.16)',
  shadowStrong: 'rgba(22, 35, 52, 0.22)',
  shadowPrimary: 'rgba(39, 76, 119, 0.20)',
  notification: '#2D6F6D',
  overlay: 'rgba(19, 34, 56, 0.42)',
  overlayLight: 'rgba(19, 34, 56, 0.24)',
  tabBarBackground: '#FFFDFC',
  tabBarActiveTint: '#274C77',
  tabBarInactiveTint: '#7E8895',
  tabBarBorder: '#D7D0C4',
  gradientStart: '#274C77',
  gradientMid: '#3B608A',
  gradientEnd: '#587B98',
  buttonGradientStart: '#274C77',
  buttonGradientEnd: '#3F648A',
  navbarBackground: 'linear-gradient(135deg, #274C77 0%, #587B98 100%)',
  navbarText: '#F8FAFC',
  navbarTextHover: 'rgba(248, 250, 252, 0.78)',
  sidebarGradientTop: '#FBF8F2',
  sidebarGradientBottom: '#ECE4D8',
  headerBackground: '#274C77',
  headerSurface: 'rgba(248, 250, 252, 0.14)',
  headerBorder: 'rgba(248, 250, 252, 0.18)',
  headerText: '#F8FAFC',
  headerMutedText: 'rgba(248, 250, 252, 0.78)',
  headerIcon: '#F8FAFC',
  sectionBackground: '#F0EBE2',
  sectionElevated: '#FFFFFF',
  primaryGlow: 'rgba(39, 76, 119, 0.12)',
  secondaryGlow: 'rgba(86, 124, 155, 0.12)',
  successGlow: 'rgba(47, 125, 90, 0.12)',
  errorGlow: 'rgba(182, 84, 75, 0.12)',
};

const darkPalette = {
  primary: '#7E9FC4',
  primaryDark: '#6588AE',
  primaryLight: '#A9BED5',
  primaryMuted: '#526B87',
  secondary: '#93ADC6',
  secondaryDark: '#728CA5',
  secondaryLight: '#B8CAD9',
  secondaryMuted: '#4C5E73',
  accent: '#6FA2A1',
  accentHover: '#86B4B2',
  background: '#121A24',
  backgroundSecondary: '#1A2430',
  backgroundTertiary: '#243140',
  surface: '#1B2633',
  card: '#202C39',
  cardElevated: '#263544',
  cardGlass: 'rgba(30, 42, 56, 0.82)',
  cardBorder: '#314254',
  cardBorderHover: '#567C9B',
  text: '#E8EEF5',
  textSecondary: '#A9B6C5',
  textTertiary: '#8090A2',
  muted: '#657487',
  textInverse: '#121A24',
  textOnPrimary: '#F4F7FB',
  border: '#314254',
  borderLight: '#243140',
  divider: '#2D3D4D',
  success: '#67B48D',
  successLight: 'rgba(103, 180, 141, 0.18)',
  successDark: '#4B906E',
  warning: '#D5B06A',
  warningLight: 'rgba(213, 176, 106, 0.18)',
  warningDark: '#A9884E',
  error: '#D0867F',
  errorLight: 'rgba(208, 134, 127, 0.18)',
  errorDark: '#AA655F',
  info: '#77A8D3',
  infoLight: 'rgba(119, 168, 211, 0.18)',
  infoDark: '#5B87B0',
  icon: '#9CADBE',
  placeholder: '#738296',
  inputBackground: '#18222D',
  inputBorder: '#314254',
  inputText: '#E8EEF5',
  disabled: '#2A3644',
  disabledText: '#667587',
  shadow: 'rgba(4, 10, 18, 0.38)',
  shadowMedium: 'rgba(4, 10, 18, 0.48)',
  shadowStrong: 'rgba(4, 10, 18, 0.58)',
  shadowPrimary: 'rgba(126, 159, 196, 0.26)',
  notification: '#6FA2A1',
  overlay: 'rgba(6, 10, 16, 0.68)',
  overlayLight: 'rgba(6, 10, 16, 0.46)',
  tabBarBackground: '#1A2430',
  tabBarActiveTint: '#A9BED5',
  tabBarInactiveTint: '#8090A2',
  tabBarBorder: '#314254',
  gradientStart: '#1E3550',
  gradientMid: '#274663',
  gradientEnd: '#32516D',
  buttonGradientStart: '#365676',
  buttonGradientEnd: '#4A6885',
  navbarBackground: 'linear-gradient(135deg, #1E3550 0%, #32516D 100%)',
  navbarText: '#F4F7FB',
  navbarTextHover: 'rgba(244, 247, 251, 0.78)',
  sidebarGradientTop: '#1A2430',
  sidebarGradientBottom: '#121A24',
  headerBackground: '#1E3550',
  headerSurface: 'rgba(244, 247, 251, 0.10)',
  headerBorder: 'rgba(244, 247, 251, 0.14)',
  headerText: '#F4F7FB',
  headerMutedText: 'rgba(244, 247, 251, 0.76)',
  headerIcon: '#F4F7FB',
  sectionBackground: '#16202A',
  sectionElevated: '#22303D',
  primaryGlow: 'rgba(126, 159, 196, 0.22)',
  secondaryGlow: 'rgba(147, 173, 198, 0.18)',
  successGlow: 'rgba(103, 180, 141, 0.18)',
  errorGlow: 'rgba(208, 134, 127, 0.18)',
};

// Light Theme - Academic and premium neutral palette
const lightTheme = {
  mode: 'light',
  colors: createSemanticColors(lightPalette),

  // Glassmorphism config (Section 27.2 - Light Mode)
  glass: {
    background: 'rgba(255, 252, 248, 0.72)',
    backdropBlur: 12,  // 12-16px
    border: 'rgba(216, 209, 199, 0.7)',
    borderHover: 'rgba(79, 115, 158, 0.28)',
  },

  // Shadows (Section 7.2)
  shadows: {
    sm: {
      shadowColor: '#162334',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#162334',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    lg: {
      shadowColor: '#162334',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,   // Light: rgba(0,0,0,0.08)
      shadowRadius: 24,
      elevation: 6,
    },
    xl: {
      shadowColor: '#162334',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 30,
      elevation: 8,
    },
    glow: {
      shadowColor: '#274C77',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
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

// Dark Theme - Graphite and slate academic palette
const darkTheme = {
  mode: 'dark',
  colors: createSemanticColors(darkPalette),

  // Glassmorphism config (Section 27.2 - Dark Mode)
  glass: {
    background: 'rgba(27, 38, 51, 0.82)',
    backdropBlur: 16,  // 12-20px
    border: 'rgba(98, 118, 140, 0.28)',
    borderHover: 'rgba(126, 159, 196, 0.36)',
  },

  // Shadows with dark mode adjustments
  shadows: {
    sm: {
      shadowColor: '#040A12',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#040A12',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 3,
    },
    lg: {
      shadowColor: '#040A12',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,   // Dark: rgba(0,0,0,0.4)
      shadowRadius: 24,
      elevation: 6,
    },
    xl: {
      shadowColor: '#040A12',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 30,
      elevation: 8,
    },
    glow: {
      shadowColor: '#7E9FC4',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 8,
    },
    glowBlue: {
      shadowColor: '#6FA2A1',
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

  const toggleTheme = async () => {
    const newTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newTheme);
    try {
      await AsyncStorage.setItem('themeMode', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setTheme = async (mode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem('themeMode', mode);
    } catch (error) {
      console.error('Error saving theme:', error);
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

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
