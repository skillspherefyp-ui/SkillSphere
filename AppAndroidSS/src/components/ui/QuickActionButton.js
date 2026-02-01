import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';

const QuickActionButton = ({ title, icon, onPress, badge }) => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 768;

  // Responsive sizing
  const buttonWidth = isLargeScreen ? 200 : 150;
  const buttonHeight = isLargeScreen ? 140 : 120;
  const iconSize = isLargeScreen ? 36 : 28;
  const fontSize = isLargeScreen ? 18 : 16;

  const styles = getStyles(theme, isWeb, isLargeScreen, buttonWidth, buttonHeight, iconSize, fontSize);

  // Button content component
  const ButtonContent = () => (
    <>
      {icon && <Icon name={icon} size={iconSize} color={theme.colors.textInverse} style={styles.icon} />}
      <Text style={[styles.title, { color: theme.colors.textInverse }]} numberOfLines={2}>
        {title}
      </Text>
      {badge > 0 && (
        <View style={[styles.badgeContainer, { backgroundColor: theme.colors.error }]}>
          <Text style={[styles.badgeText, { color: theme.colors.textInverse }]}>{badge}</Text>
        </View>
      )}
    </>
  );

  return (
    <TouchableOpacity onPress={onPress} style={styles.container} activeOpacity={0.8}>
      {isWeb ? (
        <View style={[styles.gradient, styles.webGradient]}>
          <ButtonContent />
        </View>
      ) : (
        <LinearGradient
          colors={[theme.colors.secondary, theme.colors.secondaryDark, theme.colors.secondaryLight]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ButtonContent />
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
};

const getStyles = (theme, isWeb, isLargeScreen, buttonWidth, buttonHeight, iconSize, fontSize) =>
  StyleSheet.create({
    container: {
      width: buttonWidth,
      height: buttonHeight,
      borderRadius: isLargeScreen ? 24 : 20,
      shadowColor: 'transparent',
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
      ...(isWeb && {
        cursor: 'pointer',
        transition: 'transform 0.2s',
      }),
    },
    gradient: {
      flex: 1,
      borderRadius: isLargeScreen ? 24 : 20,
      padding: isLargeScreen ? 20 : 16,
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    webGradient: {
      backgroundColor: theme.colors.secondary,
      ...(isWeb && {
        background: `linear-gradient(135deg, ${theme.colors.secondary} 0%, ${theme.colors.secondaryDark} 50%, ${theme.colors.secondaryLight} 100%)`,
      }),
    },
    icon: {
      marginBottom: isLargeScreen ? 12 : 8,
    },
    title: {
      fontSize,
      fontWeight: '600',
      flexShrink: 1,
      lineHeight: fontSize * 1.3,
    },
    badgeContainer: {
      position: 'absolute',
      top: isLargeScreen ? 12 : 10,
      right: isLargeScreen ? 12 : 10,
      borderRadius: 14,
      minWidth: isLargeScreen ? 28 : 24,
      height: isLargeScreen ? 28 : 24,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: isLargeScreen ? 8 : 6,
    },
    badgeText: {
      fontSize: isLargeScreen ? 14 : 12,
      fontWeight: 'bold',
    },
  });

export default QuickActionButton;
