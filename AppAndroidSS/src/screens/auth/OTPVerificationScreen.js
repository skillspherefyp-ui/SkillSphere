import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
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
      const result = await resetPassword(email, otpString, newPassword);
      if (result.success) {
        Alert.alert('Success', 'Password reset successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Invalid OTP');
      }
    } else if (isSignup) {
      // Verify signup OTP
      const result = await verifySignupOTP(email, otpString);
      if (result.success) {
        Alert.alert('Success', 'Email verified successfully! Your account has been created.', [
          { text: 'OK', onPress: () => {
            // Navigation will be handled by auth context based on user role
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          }}
        ]);
      } else {
        Alert.alert('Verification Failed', result.error || 'Invalid OTP. Please try again.');
      }
    } else {
      // Email verification (for other purposes)
      Alert.alert('Success', 'Email verified successfully!');
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

  const content = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

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
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
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
});

export default OTPVerificationScreen;
