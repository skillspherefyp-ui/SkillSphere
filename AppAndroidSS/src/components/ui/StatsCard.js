import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';

// Section 14 - Stats & Metrics
// Stats Cards: Icon + Value + Label, Consistent padding (20px)

const StatsCard = ({
  icon,
  iconColor,
  value,
  label,
  change,       // { value: '+12%', type: 'increase' | 'decrease' }
  style,
  variant = 'default', // default, gradient, outlined
}) => {
  const { theme, isDark } = useTheme();
  const isWeb = Platform.OS === 'web';

  const getBackgroundStyle = () => {
    if (variant === 'outlined') {
      return {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
      };
    }
    if (variant === 'gradient') {
      return {
        backgroundColor: isDark
          ? 'rgba(79, 70, 229, 0.15)'
          : 'rgba(79, 70, 229, 0.08)',
      };
    }
    return {
      backgroundColor: isDark ? theme.colors.card : theme.colors.surface,
    };
  };

  const iconBgColor = iconColor
    ? `${iconColor}20`
    : isDark
      ? theme.colors.backgroundTertiary
      : theme.colors.backgroundSecondary;

  const iconDisplayColor = iconColor || theme.colors.primary;

  return (
    <View
      style={[
        styles.container,
        getBackgroundStyle(),
        theme.shadows.sm,
        style,
      ]}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Icon name={icon} size={24} color={iconDisplayColor} />
      </View>

      {/* Value */}
      <Text
        style={[
          styles.value,
          {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.fontFamily.bold,
          },
        ]}
      >
        {value}
      </Text>

      {/* Label */}
      <Text
        style={[
          styles.label,
          {
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamily.regular,
          },
        ]}
      >
        {label}
      </Text>

      {/* Change indicator */}
      {change && (
        <View style={styles.changeContainer}>
          <Icon
            name={change.type === 'increase' ? 'trending-up' : 'trending-down'}
            size={14}
            color={change.type === 'increase' ? theme.colors.success : theme.colors.error}
          />
          <Text
            style={[
              styles.changeText,
              {
                color: change.type === 'increase' ? theme.colors.success : theme.colors.error,
                fontFamily: theme.typography.fontFamily.medium,
              },
            ]}
          >
            {change.value}
          </Text>
        </View>
      )}
    </View>
  );
};

// Stats Grid - Container for multiple stats cards
export const StatsGrid = ({ children, columns = 4, style }) => {
  return (
    <View style={[styles.grid, { gap: 16 }, style]}>
      {React.Children.map(children, (child) => (
        <View style={[styles.gridItem, { flexBasis: `${100 / columns}%` }]}>
          {child}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20, // Section 14: Consistent padding 20px
    borderRadius: 16, // Section 3.1: Cards 16px
    alignItems: 'center',
    minWidth: 140,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 28, // Section 5.2: H1 size for emphasis
    fontWeight: '700',
    marginBottom: 4,
  },
  label: {
    fontSize: 13, // Section 5.2: Small Text 13px
    textAlign: 'center',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    paddingHorizontal: 8,
    marginBottom: 16,
  },
});

export default StatsCard;
