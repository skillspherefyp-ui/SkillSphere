import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import AppButton from './AppButton';

// Section 21.2 - Empty States
// Centered illustration or icon, Clear message, Single primary action

const EmptyState = ({
  icon = 'document-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={[
        styles.iconContainer,
        {
          backgroundColor: isDark
            ? theme.colors.backgroundTertiary
            : theme.colors.backgroundSecondary,
        }
      ]}>
        <Icon
          name={icon}
          size={48}
          color={theme.colors.textTertiary}
        />
      </View>
      {title && (
        <Text style={[
          styles.title,
          {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.fontFamily.bold,
          }
        ]}>
          {title}
        </Text>
      )}
      {subtitle && (
        <Text style={[
          styles.subtitle,
          {
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamily.regular,
          }
        ]}>
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <AppButton
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          size="md"
          style={styles.actionButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48, // 48px - Major section breaks
    paddingHorizontal: 24, // 24px - Section spacing
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18, // Section Title: 18px
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 21, // 1.5x line height
    maxWidth: 280,
  },
  actionButton: {
    minWidth: 180,
  },
});

export default EmptyState;
