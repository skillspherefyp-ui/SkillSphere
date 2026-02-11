import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const StatusBadge = ({ status, style, textStyle, size = 'md' }) => {
  const { theme, isDark } = useTheme();

  // Size configurations
  const sizeConfig = {
    sm: { paddingH: 8, paddingV: 2, fontSize: 10, borderRadius: 8 },
    md: { paddingH: 10, paddingV: 4, fontSize: 12, borderRadius: 12 },
    lg: { paddingH: 12, paddingV: 6, fontSize: 14, borderRadius: 14 },
  };

  const currentSize = sizeConfig[size] || sizeConfig.md;

  const getStatusConfig = () => {
    const statusLower = status?.toLowerCase() || '';

    switch (statusLower) {
      case 'published':
      case 'active':
      case 'unlocked':
      case 'completed':
      case 'success':
        return {
          backgroundColor: isDark
            ? theme.colors.successLight
            : theme.colors.successLight,
          color: isDark ? theme.colors.success : theme.colors.successDark,
        };
      case 'draft':
      case 'pending':
      case 'in progress':
      case 'running':
        return {
          backgroundColor: isDark
            ? theme.colors.warningLight
            : theme.colors.warningLight,
          color: isDark ? theme.colors.warning : theme.colors.warningDark,
        };
      case 'hidden':
      case 'locked':
      case 'blocked':
      case 'failed':
      case 'error':
        return {
          backgroundColor: isDark
            ? theme.colors.errorLight
            : theme.colors.errorLight,
          color: isDark ? theme.colors.error : theme.colors.errorDark,
        };
      case 'queued':
      case 'info':
      default:
        return {
          backgroundColor: isDark
            ? theme.colors.infoLight
            : theme.colors.infoLight,
          color: isDark ? theme.colors.info : theme.colors.infoDark,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.backgroundColor,
          paddingHorizontal: currentSize.paddingH,
          paddingVertical: currentSize.paddingV,
          borderRadius: currentSize.borderRadius,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: config.color,
            fontSize: currentSize.fontSize,
            fontFamily: theme.typography.fontFamily.semiBold,
          },
          textStyle,
        ]}
      >
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
});

export default StatusBadge;
