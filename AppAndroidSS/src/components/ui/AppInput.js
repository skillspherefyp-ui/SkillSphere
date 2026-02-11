import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const AppInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
  labelStyle,
  leftIcon,
  rightIcon,
  disabled = false,
  size = 'md',
  ...props
}) => {
  const { theme, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const isWeb = Platform.OS === 'web';

  // Size configurations (Section 12)
  // Height: 44px, Radius: 12px
  const sizeConfig = {
    sm: { height: 40, fontSize: 12, labelSize: 10, padding: 12 },
    md: { height: 44, fontSize: 14, labelSize: 12, padding: 14 }, // Default 44px
    lg: { height: 52, fontSize: 16, labelSize: 14, padding: 16 },
  };

  const currentSize = sizeConfig[size] || sizeConfig.md;

  const getContainerStyle = () => {
    const baseStyle = {
      backgroundColor: theme.colors.inputBackground,
      borderColor: error
        ? theme.colors.error
        : isFocused
          ? theme.colors.inputBorderFocus
          : theme.colors.inputBorder,
      borderWidth: isFocused ? 2 : 1,
      borderRadius: theme.borderRadius.lg, // 12px as per Section 12
      minHeight: multiline ? currentSize.height * numberOfLines : currentSize.height,
    };

    // Glassmorphism for dark mode on web
    if (isDark && isWeb) {
      baseStyle.backdropFilter = `blur(${theme.glass.backdropBlur}px)`;
      baseStyle.WebkitBackdropFilter = `blur(${theme.glass.backdropBlur}px)`;
    }

    return baseStyle;
  };

  const getFocusGlow = () => {
    if (!isFocused) return {};

    if (error) {
      return {
        shadowColor: theme.colors.error,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
      };
    }

    // Focus State: Gradient border effect (Section 12)
    return {
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: isDark ? 0.4 : 0.2,
      shadowRadius: 8,
      elevation: 4,
    };
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[
          styles.label,
          {
            color: error ? theme.colors.error : theme.colors.textPrimary,
            fontSize: currentSize.labelSize,
            fontFamily: theme.typography.fontFamily.semiBold,
          },
          labelStyle
        ]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          getContainerStyle(),
          getFocusGlow(),
          disabled && styles.inputDisabled,
        ]}
      >
        {leftIcon && (
          <View style={[styles.leftIcon, { left: currentSize.padding - 2 }]}>
            {leftIcon}
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.inputText,
              fontSize: currentSize.fontSize,
              fontFamily: theme.typography.fontFamily.regular,
              paddingLeft: leftIcon ? currentSize.padding + 24 : currentSize.padding,
              paddingRight: rightIcon ? currentSize.padding + 24 : currentSize.padding,
              paddingVertical: currentSize.padding - 4,
            },
            multiline && styles.multilineInput,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.inputPlaceholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {rightIcon && (
          <View style={[styles.rightIcon, { right: currentSize.padding - 2 }]}>
            {rightIcon}
          </View>
        )}
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={[
            styles.errorText,
            {
              color: theme.colors.error,
              fontFamily: theme.typography.fontFamily.medium,
            }
          ]}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
    fontWeight: '400',
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  leftIcon: {
    position: 'absolute',
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    position: 'absolute',
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default AppInput;
