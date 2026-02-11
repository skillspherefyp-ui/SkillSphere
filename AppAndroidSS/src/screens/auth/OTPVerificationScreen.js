import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, Alert, useWindowDimensions, Modal } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown, FadeIn, FadeInUp, ZoomIn, BounceIn } from 'react-native-reanimated';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import BrandLogo from '../../components/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { resendOTP } from '../../services/emailOTPService';

const OTPVerificationScreen = ({ route, navigation }) => {
  const { email, isPasswordReset, isSignup } = route.params || {};
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('');
  const inputRefs = useRef([]);
  const { resetPassword, verifySignupOTP, isLoading } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    // Start resend cooldown timer
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key, index) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Alert.alert('Incomplete OTP', 'Please enter the complete 6-digit code');
      return;
    }

    if (isPasswordReset) {
      if (!newPassword || !confirmPassword) {
        Alert.alert('Missing Password', 'Please enter new password');
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match');
        return;
      }
      if (newPassword.length < 6) {
        Alert.alert('Weak Password', 'Password must be at least 6 characters');
        return;
      }
      const result = await resetPassword(email, otpString, newPassword);
      if (result.success) {
        setSuccessTitle('Password Changed!');
        setSuccessMessage('Your password has been reset successfully. You can now login with your new password.');
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', result.error || 'Invalid OTP');
      }
    } else if (isSignup) {
      // Verify signup OTP
      const result = await verifySignupOTP(email, otpString);
      if (result.success) {
        setSuccessTitle('Welcome to SkillSphere!');
        setSuccessMessage('Your email has been verified and your account is ready. Let\'s start learning!');
        setShowSuccessModal(true);
      } else {
        Alert.alert('Verification Failed', result.error || 'Invalid OTP. Please try again.');
      }
    } else {
      // Email verification (for other purposes)
      setSuccessTitle('Email Verified!');
      setSuccessMessage('Your email has been verified successfully.');
      setShowSuccessModal(true);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    if (isPasswordReset) {
      navigation.navigate('Login');
    } else if (isSignup) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } else {
      navigation.goBack();
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) {
      Alert.alert('Please Wait', `Please wait ${resendCooldown} seconds before requesting a new code.`);
      return;
    }

    const result = await resendOTP(email);
    if (result.success) {
      setResendCooldown(60); // 60 second cooldown
      if (result.otp) {
        Alert.alert('OTP Resent', `Development Mode: Your new OTP is ${result.otp}`);
      } else {
        Alert.alert('OTP Resent', 'A new verification code has been sent to your email.');
      }
    } else {
      Alert.alert('Error', result.error || 'Failed to resend OTP. Please try again.');
    }
  };

  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const maxWidth = isWeb ? 440 : '100%';

  const gradientColors = theme.mode === 'dark'
    ? [theme.colors.background, theme.colors.backgroundSecondary]
    : [theme.colors.background, theme.colors.backgroundSecondary];

  // Success Modal Component
  const SuccessModal = () => (
    <Modal
      visible={showSuccessModal}
      transparent
      animationType="fade"
      onRequestClose={handleSuccessClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={ZoomIn.duration(400)}
          style={[styles.modalContent, { backgroundColor: theme.colors.card }]}
        >
          {/* Success Icon */}
          <Animated.View
            entering={BounceIn.duration(600).delay(200)}
            style={[styles.successIconContainer, { backgroundColor: '#10B981' }]}
          >
            <Icon name="checkmark" size={50} color="#ffffff" />
          </Animated.View>

          {/* Success Title */}
          <Animated.Text
            entering={FadeInUp.duration(400).delay(300)}
            style={[styles.successTitle, { color: theme.colors.textPrimary }]}
          >
            {successTitle}
          </Animated.Text>

          {/* Success Message */}
          <Animated.Text
            entering={FadeInUp.duration(400).delay(400)}
            style={[styles.successMessage, { color: theme.colors.textSecondary }]}
          >
            {successMessage}
          </Animated.Text>

          {/* Decorative Elements */}
          <Animated.View
            entering={FadeIn.duration(600).delay(500)}
            style={styles.decorativeContainer}
          >
            <View style={[styles.decorativeDot, { backgroundColor: '#10B981' }]} />
            <View style={[styles.decorativeDot, { backgroundColor: '#3B82F6' }]} />
            <View style={[styles.decorativeDot, { backgroundColor: '#8B5CF6' }]} />
          </Animated.View>

          {/* Continue Button */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(600)}
            style={styles.successButtonContainer}
          >
            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSuccessClose}
              activeOpacity={0.8}
            >
              <Text style={styles.successButtonText}>
                {isPasswordReset ? 'Go to Login' : 'Continue'}
              </Text>
              <Icon name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );

  const content = (
    <>
      {/* Success Modal */}
      <SuccessModal />

      {/* Back Button - Fixed outside ScrollView */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.backButton, { backgroundColor: theme.colors.card + 'CC' }]}
        activeOpacity={0.7}
      >
        <Icon name="arrow-back" size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
          <Animated.View entering={FadeIn.duration(600)} style={styles.logoContainer}>
            <BrandLogo size={80} />
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Verify Email
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={[styles.emailText, { color: theme.colors.textPrimary }]}>{email}</Text>
            </Text>
          </Animated.View>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  {
                    borderColor: digit ? theme.colors.primary : theme.colors.border,
                    backgroundColor: digit ? theme.colors.surface : theme.colors.card,
                    color: theme.colors.textPrimary,
                  },
                  digit && styles.otpInputFilled
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(value.replace(/[^0-9]/g, ''), index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="numeric"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {isPasswordReset && (
            <>
              <AppInput
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Enter new password"
              />
              <AppInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Confirm new password"
              />
            </>
          )}

          <AppButton
            title="Verify"
            onPress={handleVerify}
            loading={isLoading}
            fullWidth
            style={styles.verifyButton}
          />

          <TouchableOpacity
            style={styles.resendContainer}
            onPress={handleResendOTP}
            disabled={resendCooldown > 0}
            activeOpacity={0.7}
          >
            <Text style={[styles.resendText, { color: theme.colors.textSecondary }]}>
              Didn't receive code?{' '}
            </Text>
            <Text style={[styles.resendLink, { color: resendCooldown > 0 ? theme.colors.textTertiary : theme.colors.primary }]}>
              {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changeEmailButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={16} color={theme.colors.primary} />
            <Text style={[styles.changeEmailText, { color: theme.colors.primary }]}>
              Change email address
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
    </>
  );

  if (isWeb) {
    return (
      <View style={[styles.container, { backgroundColor: gradientColors[0] }]}>
        {content}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {content}
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
    minHeight: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
    borderRadius: 12,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  emailText: {
    fontWeight: '600',
  },
  formContainer: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
  },
  otpInputFilled: {
    borderWidth: 3,
  },
  verifyButton: {
    marginTop: 16,
    height: 52,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeEmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  changeEmailText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  successMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  decorativeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  decorativeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  successButtonContainer: {
    width: '100%',
  },
  successButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 10,
  },
  successButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default OTPVerificationScreen;
