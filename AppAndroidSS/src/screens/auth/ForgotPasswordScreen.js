import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import BrandLogo from '../../components/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const ForgotPasswordScreen = ({ navigation, route }) => {
  const [email, setEmail] = useState('');
  const { forgotPassword, isLoading, user } = useAuth();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  
  // Responsive max width for web
  const isWeb = Platform.OS === 'web';
  const maxWidth = isWeb ? 420 : '100%';
  const containerPadding = isWeb && width > 768 ? { paddingHorizontal: 24 } : {};

  // If accessed from within app (Admin/Expert), pre-fill email
  const isFromSettings = route?.params?.fromSettings || false;
  const userEmail = user?.email || route?.params?.email || '';

  useEffect(() => {
    if (isFromSettings && userEmail) {
      setEmail(userEmail);
    }
  }, [isFromSettings, userEmail]);

  const handleSendOTP = async () => {
    if (!email) {
      alert('Please enter your email');
      return;
    }

    const result = await forgotPassword(email);
    if (result.success) {
      navigation.navigate('OTPVerification', { email, isPasswordReset: true });
    } else {
      alert(result.error || 'Failed to send OTP');
    }
  };

  return (
    <LinearGradient
      colors={theme.mode === 'dark' 
        ? [theme.colors.background, theme.colors.backgroundSecondary || theme.colors.background]
        : [theme.colors.gradientStart, theme.colors.gradientEnd]
      }
      style={styles.container}
    >
      {/* Back Button - Fixed outside ScrollView */}
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Icon name="arrow-back" size={24} color={theme.colors.textInverse} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, containerPadding]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
            <BrandLogo size={90} />
            <Text style={[styles.title, { color: theme.colors.textInverse }]}>
              {isFromSettings ? 'Reset Password' : 'Forgot Password?'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textInverse }]}>
              {isFromSettings 
                ? 'Enter your email to receive a password reset code'
                : 'Enter your email to receive OTP (Students only)'}
            </Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.duration(600).delay(200)} 
            style={[
              styles.formContainer,
              {
                backgroundColor: theme.colors.card,
                maxWidth,
                alignSelf: 'center',
                width: '100%',
              }
            ]}
          >
            <AppInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Enter your email"
            />

            <AppButton
              title="Send OTP"
              onPress={handleSendOTP}
              loading={isLoading}
              fullWidth
              style={styles.sendButton}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
    borderRadius: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    opacity: 0.9,
    textAlign: 'center',
  },
  formContainer: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  sendButton: {
    marginTop: 10,
  },
});

export default ForgotPasswordScreen;

