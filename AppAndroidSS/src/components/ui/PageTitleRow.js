import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import AppButton from './AppButton';

// Section 17.2 - Page Title Row
// [Page Title (H1)] [Optional: Primary Action Button, right-aligned]
// Breadcrumbs (where applicable): Home > Courses > Course Name

const PageTitleRow = ({
  title,
  subtitle,
  breadcrumbs = [], // Array of { label, route }
  primaryAction,    // { label, onPress, icon, variant }
  secondaryAction,  // { label, onPress, icon, variant }
  style,
}) => {
  const { theme, isDark } = useTheme();
  const isWeb = Platform.OS === 'web';

  return (
    <View style={[styles.container, style]}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <View style={styles.breadcrumbs}>
          {breadcrumbs.map((crumb, index) => (
            <View key={index} style={styles.breadcrumbItem}>
              <Text
                style={[
                  styles.breadcrumbText,
                  {
                    color: index === breadcrumbs.length - 1
                      ? theme.colors.textPrimary
                      : theme.colors.textTertiary,
                    fontFamily: index === breadcrumbs.length - 1
                      ? theme.typography.fontFamily.medium
                      : theme.typography.fontFamily.regular,
                  },
                ]}
              >
                {crumb.label}
              </Text>
              {index < breadcrumbs.length - 1 && (
                <Text style={[styles.breadcrumbSeparator, { color: theme.colors.textTertiary }]}>
                  {' > '}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Title Row */}
      <View style={styles.titleRow}>
        <View style={styles.titleSection}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.fontFamily.bold,
              },
            ]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.fontFamily.regular,
                },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {secondaryAction && (
            <AppButton
              title={secondaryAction.label}
              onPress={secondaryAction.onPress}
              variant={secondaryAction.variant || 'outline'}
              size="md"
              leftIcon={secondaryAction.icon}
              style={styles.actionButton}
            />
          )}
          {primaryAction && (
            <AppButton
              title={primaryAction.label}
              onPress={primaryAction.onPress}
              variant={primaryAction.variant || 'primary'}
              size="md"
              leftIcon={primaryAction.icon}
              style={styles.actionButton}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24, // Section 17.2: Consistent padding
    paddingVertical: 16,
  },
  breadcrumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbText: {
    fontSize: 13, // Section 5.2: Small Text 13px
  },
  breadcrumbSeparator: {
    fontSize: 13,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
  },
  titleSection: {
    flex: 1,
    minWidth: 200,
  },
  title: {
    fontSize: 28, // Section 5.2: H1 - Page Title 28px
    fontWeight: '700',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 21, // 1.5x line height
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  actionButton: {
    minWidth: 120,
  },
});

export default PageTitleRow;
