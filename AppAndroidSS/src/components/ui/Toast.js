import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';

// Section 20 - Toast Notifications
// Section 27 - Global Glassmorphism

const TOAST_WIDTH_WEB = 320;     // Section 20.1: Width 320px (web)
const TOAST_MIN_HEIGHT = 56;     // Section 20.1: Min height 56px
const TOAST_BORDER_RADIUS = 14;  // Section 20.1: Border radius 14px
const ANIMATION_DURATION = 300;  // Section 20.2: Slide-in 300ms
const AUTO_DISMISS_DELAY = 4000; // Section 20.2: Auto-dismiss 4 seconds

const Toast = ({
  visible,
  type = 'info', // success, error, warning, info
  title,
  message,
  onDismiss,
  autoDismiss = true,
  position = 'top-right', // top-right, top-center, bottom-right, bottom-center
}) => {
  const { theme, isDark } = useTheme();
  const isWeb = Platform.OS === 'web';
  const { width: screenWidth } = Dimensions.get('window');

  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  // Type configurations
  const typeConfig = {
    success: {
      icon: 'checkmark-circle',
      color: theme.colors.success,
      bgColor: theme.colors.successLight,
    },
    error: {
      icon: 'close-circle',
      color: theme.colors.error,
      bgColor: theme.colors.errorLight,
    },
    warning: {
      icon: 'warning',
      color: theme.colors.warning,
      bgColor: theme.colors.warningLight,
    },
    info: {
      icon: 'information-circle',
      color: theme.colors.info,
      bgColor: theme.colors.infoLight,
    },
  };

  const config = typeConfig[type] || typeConfig.info;

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      if (autoDismiss) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, AUTO_DISMISS_DELAY);
        return () => clearTimeout(timer);
      }
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
      onDismiss?.();
    });
  };

  if (!isVisible && !visible) return null;

  // Position styles
  const getPositionStyle = () => {
    const base = {
      position: 'absolute',
      zIndex: 9999,
    };

    switch (position) {
      case 'top-right':
        return { ...base, top: isWeb ? 24 : 60, right: isWeb ? 24 : 16 };
      case 'top-center':
        return { ...base, top: isWeb ? 24 : 60, alignSelf: 'center' };
      case 'bottom-right':
        return { ...base, bottom: isWeb ? 24 : 40, right: isWeb ? 24 : 16 };
      case 'bottom-center':
        return { ...base, bottom: isWeb ? 24 : 40, alignSelf: 'center' };
      default:
        return { ...base, top: isWeb ? 24 : 60, right: isWeb ? 24 : 16 };
    }
  };

  // Glassmorphism styles (Section 27.2)
  const getGlassStyle = () => {
    if (isWeb) {
      return {
        backgroundColor: isDark
          ? 'rgba(15, 23, 42, 0.65)'  // Section 27.2: Dark glass
          : 'rgba(255, 255, 255, 0.65)', // Section 27.2: Light glass
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderColor: isDark
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(0, 0, 0, 0.05)',
        borderWidth: 1,
      };
    }
    // Native fallback - solid background
    return {
      backgroundColor: isDark ? theme.colors.card : theme.colors.surface,
    };
  };

  const toastWidth = isWeb ? TOAST_WIDTH_WEB : screenWidth - 32;

  return (
    <Animated.View
      style={[
        styles.container,
        getPositionStyle(),
        getGlassStyle(),
        {
          width: toastWidth,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
        theme.shadows.lg,
      ]}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
        <Icon name={config.icon} size={24} color={config.color} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {title && (
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.fontFamily.semiBold,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
        {message && (
          <Text
            style={[
              styles.message,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.fontFamily.regular,
              },
            ]}
            numberOfLines={2}
          >
            {message}
          </Text>
        )}
      </View>

      {/* Dismiss button */}
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={handleDismiss}
        activeOpacity={0.7}
      >
        <Icon name="close" size={18} color={theme.colors.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Toast Container for managing multiple toasts
export const ToastContainer = ({ children }) => {
  return (
    <View style={styles.toastContainer} pointerEvents="box-none">
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  container: {
    minHeight: TOAST_MIN_HEIGHT,
    borderRadius: TOAST_BORDER_RADIUS,
    padding: 16, // Section 20.1: Padding 16px
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  dismissButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
});

export default Toast;
