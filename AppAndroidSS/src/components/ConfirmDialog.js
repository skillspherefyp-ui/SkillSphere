import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AppButton from './ui/AppButton';
import { useTheme } from '../context/ThemeContext';

// Section 19 - Modals & Overlays
// Section 27 - Global Glassmorphism

const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  size = 'small', // small: 400px, medium: 560px, large: 720px
}) => {
  const { theme, isDark } = useTheme();
  const isWeb = Platform.OS === 'web';

  // Modal sizes (Section 19.1)
  const sizeConfig = {
    small: 400,
    medium: 560,
    large: 720,
  };

  const maxWidth = sizeConfig[size] || sizeConfig.small;

  // Glassmorphism styles (Section 27.2)
  const getDialogStyle = () => {
    const baseStyle = {
      backgroundColor: isDark ? theme.colors.card : theme.colors.surface,
      maxWidth,
    };

    // Add glassmorphism for web (Section 27.2)
    if (isWeb && isDark) {
      return {
        ...baseStyle,
        backgroundColor: theme.glass.background,
        backdropFilter: `blur(${theme.glass.backdropBlur}px)`,
        WebkitBackdropFilter: `blur(${theme.glass.backdropBlur}px)`,
        borderColor: theme.glass.border,
        borderWidth: 1,
      };
    }

    return baseStyle;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={[
          styles.overlay,
          { backgroundColor: theme.colors.overlay }
        ]}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity
          style={[
            styles.dialog,
            getDialogStyle(),
            theme.shadows.xl,
          ]}
          activeOpacity={1}
        >
          {/* Close icon top-right (Section 19.2) */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Icon
              name="close"
              size={24}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[
              styles.iconContainer,
              {
                backgroundColor: confirmVariant === 'danger'
                  ? theme.colors.errorLight
                  : theme.colors.warningLight,
              }
            ]}>
              <Icon
                name="alert-circle"
                size={32}
                color={confirmVariant === 'danger' ? theme.colors.error : theme.colors.warning}
              />
            </View>
            <Text style={[
              styles.title,
              {
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.fontFamily.bold,
              }
            ]}>
              {title}
            </Text>
          </View>

          <Text style={[
            styles.message,
            {
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.fontFamily.regular,
            }
          ]}>
            {message}
          </Text>

          <View style={styles.buttons}>
            <AppButton
              title={cancelText}
              onPress={onCancel}
              variant="outline"
              size="md"
              style={styles.button}
            />
            <AppButton
              title={confirmText}
              onPress={onConfirm}
              variant={confirmVariant}
              size="md"
              style={styles.button}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24, // Section spacing
  },
  dialog: {
    width: '100%',
    borderRadius: 16, // Section 19.2: Radius 16px
    padding: 24,      // Section 19.2: Padding 24px
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18, // Section Title: 18px
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 21, // 1.5x line height
    textAlign: 'center',
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
});

export default ConfirmDialog;
