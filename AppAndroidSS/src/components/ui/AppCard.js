import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const AppCard = ({
  children,
  style,
  onPress,
  elevated = false,
  glass = false,
  glow = false,
  padding = 16,  // Default padding: 16-20px as per Section 7.2
  noBorder = false,
  size = 'medium', // small, medium, large as per Section 7.1
  allowOverflow = false, // Set to true to allow content to overflow (for dropdowns)
}) => {
  const { theme, isDark } = useTheme();
  const isWeb = Platform.OS === 'web';

  // Card size configurations (Section 7.1)
  const sizeConfig = {
    small: { minWidth: 240, minHeight: 140 },
    medium: { minWidth: 320, minHeight: 200 },
    large: { minWidth: 420, minHeight: 260 },
  };

  const getCardStyle = () => {
    const baseStyle = {
      backgroundColor: glass
        ? theme.colors.cardGlass
        : elevated
          ? theme.colors.cardElevated
          : theme.colors.card,
      padding,
      borderRadius: theme.borderRadius['2xl'], // 16px as per guide
      borderWidth: noBorder ? 0 : 1,
      borderColor: theme.colors.cardBorder,
    };

    // Add glassmorphism for web (Section 27.2)
    if (glass && isWeb) {
      baseStyle.backdropFilter = `blur(${theme.glass.backdropBlur}px)`;
      baseStyle.WebkitBackdropFilter = `blur(${theme.glass.backdropBlur}px)`;
      baseStyle.borderColor = theme.glass.border;
    }

    return baseStyle;
  };

  const getShadowStyle = () => {
    if (glow && isDark) {
      return theme.shadows.glow;
    }
    if (elevated) {
      return theme.shadows.lg;
    }
    return theme.shadows.md;
  };

  // Web hover effects (Section 7.3)
  const getWebHoverStyles = () => {
    if (!isWeb) return {};
    return {
      cursor: onPress ? 'pointer' : 'default',
      transition: 'all 0.2s ease', // Transition: 200ms ease
    };
  };

  const cardStyles = [
    styles.card,
    getCardStyle(),
    getShadowStyle(),
    getWebHoverStyles(),
    allowOverflow && { overflow: 'visible' },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={cardStyles}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});

export default AppCard;
