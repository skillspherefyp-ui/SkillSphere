import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import AppButton from '../../components/ui/AppButton';
import BrandLogo from '../../components/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const SignupOTPScreen = ({ route, navigation }) => {
  const params = route?.params || {};
  const email = params.email || '';
  const name = params.name || '';
  const { theme } = useTheme();
  const { verifyOTP, resendOTP, isLoading } = useAuth();

  // Debug log
  console.log('SignupOTPScreen mounted with params:', { email, name });
  const { width } = useWindowDimensions();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const otpInputRefs = useRef([]);

  const isWeb = Platform.OS === 'web';
  const maxWidth = isWeb ? 440 : '100%';

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(prev => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key, index) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    setError('');
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setVerifying(true);
    console.log('Verifying OTP for signup:', email);

    try {
      const result = await verifyOTP(email, otpString);
      console.log('Verify result:', result);
      setVerifying(false);

      if (result.success) {
        // Navigate to details screen to set password
        navigation.replace('SignupDetails', { email, name });
      } else {
        setError(result.error || 'Invalid verification code');
      }
    } catch (err) {
      console.log('Verify error:', err);
      setVerifying(false);
      setError(err.message || 'Verification failed');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setError('');
    setSending(true);

    try {
      const result = await resendOTP(email);
      setSending(false);

      if (result.success) {
        setResendCooldown(60);
        Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
      } else {
        setError(result.error || 'Failed to resend code');
      }
    } catch (err) {
      setSending(false);
      setError(err.message || 'Failed to resend code');
    }
  };

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
            },
          ]}
        >
          <Animated.View entering={FadeIn.duration(600)} style={styles.logoContainer}>
            <BrandLogo size={80} />
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Verify Your Email
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={{ fontWeight: '600', color: theme.colors.textPrimary }}>{email}</Text>
            </Text>
          </Animated.View>
          {error ? (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={[styles.errorBox, { backgroundColor: theme.colors.errorLight || '#fee2e2' }]}
            >
              <Icon name="alert-circle" size={20} color={theme.colors.error || '#ef4444'} />
              <Text style={[styles.errorText, { color: theme.colors.error || '#ef4444' }]}>
                {error}
              </Text>
            </Animated.View>
          ) : null}

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (otpInputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  {
                    borderColor: digit ? theme.colors.primary : theme.colors.border,
                    backgroundColor: digit ? theme.colors.surface : theme.colors.card,
                    color: theme.colors.textPrimary,
                  },
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(value.replace(/[^0-9]/g, ''), index)}
                onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                keyboardType="numeric"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <AppButton
            title={verifying ? 'Verifying...' : 'Verify Code'}
            onPress={handleVerify}
            loading={verifying || isLoading}
            fullWidth
            style={styles.verifyButton}
          />

          <TouchableOpacity
            style={styles.resendContainer}
            onPress={handleResend}
            disabled={resendCooldown > 0 || sending}
          >
            <Text style={[styles.resendText, { color: theme.colors.textSecondary }]}>
              Didn't receive the code?{' '}
            </Text>
            <Text
              style={[
                styles.resendLink,
                { color: resendCooldown > 0 ? theme.colors.textTertiary : theme.colors.primary },
              ]}
            >
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
  formContainer: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
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
  verifyButton: {
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

export default SignupOTPScreen;
