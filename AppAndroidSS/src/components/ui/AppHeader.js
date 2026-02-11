import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../ThemeToggle';

// Helper functions to format date and time separately
const formatDate = (date) => {
  const options = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
};

const formatTime = (date) => {
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  return date.toLocaleTimeString('en-US', options);
};

const AppHeader = ({
  showBack = true,
  rightActions,
  forceShowBack = false,
  leftComponent,
  style,
  showDateTime = true,
}) => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();

  // Live date/time state
  const [currentTime, setCurrentTime] = useState(new Date());
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Pulse animation for live dot
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Only hide back button on main dashboard screens
  const isMainScreen = route.name === 'Login' ||
                       route.name === 'Signup' ||
                       route.name === 'Dashboard';

  const canGoBack = navigation.canGoBack() && !isMainScreen;
  const shouldShowBack = (showBack && canGoBack) || forceShowBack;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 768;

  // Header heights (Section 3.1)
  const headerHeight = isWeb
    ? theme.layout.headerHeight      // Web: 64px
    : theme.layout.headerHeightMobile; // Mobile: 56px

  const styles = getStyles(theme, isDark, isWeb, isLargeScreen, headerHeight);

  // Gradient colors (Section 6.1)
  const gradientColors = [theme.colors.gradientStart, theme.colors.gradientEnd];

  // Header content component
  const HeaderContent = () => (
    <View style={styles.contentWrapper}>
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {/* Custom left component (menu button) */}
          {leftComponent}

          {/* Back Button - show on all pages except main */}
          {shouldShowBack && (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Icon
                name="arrow-back"
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          )}

          {/* Date/Time Display - Enhanced Design */}
          {showDateTime && (
            <View style={styles.dateTimeWrapper}>
              {/* Date Section */}
              <View style={styles.dateContainer}>
                <Icon name="calendar" size={16} color="#FFFFFF" />
                <Text style={styles.dateText}>
                  {formatDate(currentTime)}
                </Text>
              </View>

              {/* Divider */}
              <View style={styles.dateTimeDivider} />

              {/* Time Section */}
              <View style={styles.timeContainer}>
                <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
                <Icon name="time" size={16} color="#FFFFFF" />
                <Text style={styles.timeText}>
                  {formatTime(currentTime)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.rightSection}>
          {/* Theme Toggle */}
          <ThemeToggle style={styles.themeToggle} iconColor="#FFFFFF" />
          {/* Additional right actions */}
          {rightActions}
        </View>
      </View>
    </View>
  );

  // Web: Use CSS gradient
  if (isWeb) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: gradientColors[0],
            background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
          },
          style,
        ]}
      >
        <HeaderContent />
      </View>
    );
  }

  // Native: Use LinearGradient
  return (
    <LinearGradient
      colors={gradientColors}
      style={[styles.container, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <HeaderContent />
    </LinearGradient>
  );
};

const getStyles = (theme, isDark, isWeb, isLargeScreen, headerHeight) => StyleSheet.create({
  container: {
    height: headerHeight + (Platform.OS === 'ios' ? 44 : isWeb ? 0 : 24),
    paddingTop: Platform.OS === 'ios' ? 44 : isWeb ? 0 : 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: isWeb ? 0 : 20,
    borderBottomRightRadius: isWeb ? 0 : 20,
    // Soft shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  contentWrapper: {
    maxWidth: isLargeScreen ? theme.layout.maxContentWidth : '100%',
    width: '100%',
    alignSelf: 'center',
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateTimeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...(isWeb && {
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dateTimeDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 14,
    borderRadius: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  themeToggle: {
    marginLeft: 0,
  },
});

export default AppHeader;
