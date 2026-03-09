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
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 22,
  '3xl': 28,
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
  primary: '#1F4D78',
  primaryDark: '#173A5B',
  primaryLight: '#4D7193',
  primaryMuted: '#89A1B9',
  secondary: '#6A7B8D',
  secondaryDark: '#566678',
  secondaryLight: '#93A1AE',
  secondaryMuted: '#BAC4CE',
  accent: '#3D7B74',
  accentHover: '#2F645F',
  background: '#F7F5F1',
  backgroundSecondary: '#F1EEE8',
  backgroundTertiary: '#E6E1D8',
  surface: '#FEFDFC',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  cardGlass: 'rgba(255, 253, 250, 0.84)',
  cardBorder: '#DDD8CF',
  cardBorderHover: '#89A1B9',
  text: '#1B2430',
  textSecondary: '#5E6A77',
  textTertiary: '#858F9A',
  muted: '#A7AFB8',
  textInverse: '#FFFDFC',
  textOnPrimary: '#F8FAFC',
  border: '#DDD8CF',
  borderLight: '#EAE4DC',
  divider: '#E2DDD4',
  success: '#2F6F57',
  successLight: '#DCECE4',
  successDark: '#245540',
  warning: '#A57A3B',
  warningLight: '#F2E7D1',
  warningDark: '#7E5D29',
  error: '#B45D53',
  errorLight: '#F3E0DD',
  errorDark: '#8E473F',
  info: '#456E94',
  infoLight: '#DDE6EF',
  infoDark: '#315474',
  icon: '#566677',
  placeholder: '#88929D',
  inputBackground: '#FFFFFF',
  inputBorder: '#D6D0C7',
  inputText: '#1B2430',
  disabled: '#D7D2CA',
  disabledText: '#9D968C',
  shadow: 'rgba(15, 23, 34, 0.08)',
  shadowMedium: 'rgba(15, 23, 34, 0.13)',
  shadowStrong: 'rgba(15, 23, 34, 0.18)',
  shadowPrimary: 'rgba(31, 77, 120, 0.18)',
  notification: '#1F4D78',
  overlay: 'rgba(19, 31, 46, 0.40)',
  overlayLight: 'rgba(19, 31, 46, 0.22)',
  tabBarBackground: '#FEFDFC',
  tabBarActiveTint: '#1F4D78',
  tabBarInactiveTint: '#858F9A',
  tabBarBorder: '#DDD8CF',
  gradientStart: '#1C4063',
  gradientMid: '#315779',
  gradientEnd: '#4D6882',
  buttonGradientStart: '#1F4D78',
  buttonGradientEnd: '#355D83',
  navbarBackground: 'linear-gradient(135deg, #1C4063 0%, #4D6882 100%)',
  navbarText: '#F8FAFC',
  navbarTextHover: 'rgba(248, 250, 252, 0.78)',
  sidebarGradientTop: '#FBF9F5',
  sidebarGradientBottom: '#EEE8DE',
  headerBackground: '#1C4063',
  headerSurface: 'rgba(248, 250, 252, 0.12)',
  headerBorder: 'rgba(248, 250, 252, 0.18)',
  headerText: '#F8FAFC',
  headerMutedText: 'rgba(248, 250, 252, 0.78)',
  headerIcon: '#F8FAFC',
  sectionBackground: '#F2EEE7',
  sectionElevated: '#FFFFFF',
  primaryGlow: 'rgba(31, 77, 120, 0.12)',
  secondaryGlow: 'rgba(106, 123, 141, 0.10)',
  successGlow: 'rgba(47, 111, 87, 0.12)',
  errorGlow: 'rgba(180, 93, 83, 0.12)',
};

const darkPalette = {
  primary: '#7EA4C8',
  primaryDark: '#6488AB',
  primaryLight: '#A6BDD4',
  primaryMuted: '#53687F',
  secondary: '#93A4B7',
  secondaryDark: '#76889B',
  secondaryLight: '#B4C0CB',
  secondaryMuted: '#536273',
  accent: '#6D978E',
  accentHover: '#83AAA2',
  background: '#111821',
  backgroundSecondary: '#17202B',
  backgroundTertiary: '#223040',
  surface: '#1A2430',
  card: '#1F2A36',
  cardElevated: '#263341',
  cardGlass: 'rgba(31, 42, 54, 0.82)',
  cardBorder: '#324252',
  cardBorderHover: '#6488AB',
  text: '#E6ECF2',
  textSecondary: '#A8B4C1',
  textTertiary: '#7E8C9B',
  muted: '#627181',
  textInverse: '#111821',
  textOnPrimary: '#F4F7FB',
  border: '#324252',
  borderLight: '#243140',
  divider: '#2B3948',
  success: '#68AD89',
  successLight: 'rgba(104, 173, 137, 0.18)',
  successDark: '#4F876A',
  warning: '#CAA566',
  warningLight: 'rgba(202, 165, 102, 0.18)',
  warningDark: '#9E7E4B',
  error: '#CF837A',
  errorLight: 'rgba(207, 131, 122, 0.18)',
  errorDark: '#A9655D',
  info: '#78A4CA',
  infoLight: 'rgba(120, 164, 202, 0.18)',
  infoDark: '#5D84A8',
  icon: '#99A8B7',
  placeholder: '#748292',
  inputBackground: '#16202A',
  inputBorder: '#324252',
  inputText: '#E6ECF2',
  disabled: '#293644',
  disabledText: '#677587',
  shadow: 'rgba(5, 9, 15, 0.40)',
  shadowMedium: 'rgba(5, 9, 15, 0.50)',
  shadowStrong: 'rgba(5, 9, 15, 0.60)',
  shadowPrimary: 'rgba(126, 164, 200, 0.24)',
  notification: '#7EA4C8',
  overlay: 'rgba(6, 10, 16, 0.70)',
  overlayLight: 'rgba(6, 10, 16, 0.48)',
  tabBarBackground: '#1A2430',
  tabBarActiveTint: '#A6BDD4',
  tabBarInactiveTint: '#7E8C9B',
  tabBarBorder: '#324252',
  gradientStart: '#1B3149',
  gradientMid: '#27415B',
  gradientEnd: '#314A63',
  buttonGradientStart: '#355472',
  buttonGradientEnd: '#47627C',
  navbarBackground: 'linear-gradient(135deg, #1B3149 0%, #314A63 100%)',
  navbarText: '#F4F7FB',
  navbarTextHover: 'rgba(244, 247, 251, 0.78)',
  sidebarGradientTop: '#18222D',
  sidebarGradientBottom: '#121A24',
  headerBackground: '#1B3149',
  headerSurface: 'rgba(244, 247, 251, 0.10)',
  headerBorder: 'rgba(244, 247, 251, 0.14)',
  headerText: '#F4F7FB',
  headerMutedText: 'rgba(244, 247, 251, 0.76)',
  headerIcon: '#F4F7FB',
  sectionBackground: '#16202A',
  sectionElevated: '#22303D',
  primaryGlow: 'rgba(126, 164, 200, 0.20)',
  secondaryGlow: 'rgba(147, 164, 183, 0.16)',
  successGlow: 'rgba(104, 173, 137, 0.16)',
  errorGlow: 'rgba(207, 131, 122, 0.16)',
};

// Light Theme - Academic and premium neutral palette
const lightTheme = {
  mode: 'light',
  colors: createSemanticColors(lightPalette),

  // Glassmorphism config (Section 27.2 - Light Mode)
  glass: {
    background: 'rgba(255, 253, 250, 0.78)',
    backdropBlur: 12,  // 12-16px
    border: 'rgba(221, 216, 207, 0.7)',
    borderHover: 'rgba(77, 113, 147, 0.24)',
  },

  // Shadows (Section 7.2)
  shadows: {
    sm: {
      shadowColor: '#0F1722',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#0F1722',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    lg: {
      shadowColor: '#0F1722',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,   // Light: rgba(0,0,0,0.08)
      shadowRadius: 24,
      elevation: 6,
    },
    xl: {
      shadowColor: '#0F1722',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 30,
      elevation: 8,
    },
    glow: {
      shadowColor: '#1F4D78',
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
    background: 'rgba(31, 42, 54, 0.84)',
    backdropBlur: 16,  // 12-20px
    border: 'rgba(104, 122, 142, 0.26)',
    borderHover: 'rgba(126, 164, 200, 0.34)',
  },

  // Shadows with dark mode adjustments
  shadows: {
    sm: {
      shadowColor: '#05090F',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#05090F',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 3,
    },
    lg: {
      shadowColor: '#05090F',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,   // Dark: rgba(0,0,0,0.4)
      shadowRadius: 24,
      elevation: 6,
    },
    xl: {
      shadowColor: '#05090F',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 30,
      elevation: 8,
    },
    glow: {
      shadowColor: '#7EA4C8',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 8,
    },
    glowBlue: {
      shadowColor: '#6D978E',
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
