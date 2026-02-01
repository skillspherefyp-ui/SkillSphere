import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import BrandLogo from '../../components/BrandLogo';
import ThemeToggle from '../../components/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { signInWithGoogle, configureGoogleSignIn } from '../../services/googleAuthService';

const SignupScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const { sendOTP, googleSignIn, isLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sendingOTP, setSendingOTP] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isWeb = Platform.OS === 'web';
  const maxWidth = isWeb ? 440 : '100%';

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const handleSendOTP = async () => {
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setSendingOTP(true);
    console.log('Sending OTP to:', email.trim().toLowerCase());

    try {
      const result = await sendOTP(email.trim().toLowerCase(), name.trim());
      console.log('SendOTP result:', result);
      setSendingOTP(false);

      if (result.success) {
        const params = {
          email: email.trim().toLowerCase(),
          name: name.trim()
        };
        console.log('OTP sent successfully, navigating to SignupOTP with params:', params);
        navigation.navigate('SignupOTP', params);
      } else {
        setError(result.error || 'Failed to send verification code');
      }
    } catch (err) {
      console.log('OTP error:', err);
      setSendingOTP(false);
      setError(err.message || 'Failed to send verification code');
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const googleResult = await signInWithGoogle();
      console.log('Google result:', googleResult);

      if (!googleResult.success) {
        setGoogleLoading(false);
        if (googleResult.error !== 'Sign in was cancelled') {
          setError(googleResult.error);
        }
        return;
      }

      const result = await googleSignIn(googleResult.idToken);
      console.log('Backend Google auth result:', result);
      setGoogleLoading(false);

      if (!result.success) {
        setError(result.error || 'Google sign in failed');
      }
      // Success - AuthContext will handle navigation
    } catch (err) {
      console.log('Google error:', err);
      setGoogleLoading(false);
      setError('Google sign in failed. Please try again.');
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
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemeToggle />
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
              Create Account
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Start your learning journey today
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

          <AppInput
            label="Full Name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError('');
            }}
            placeholder="Enter your full name"
            leftIcon={<Icon name="person-outline" size={20} color={theme.colors.textSecondary} />}
          />

          <AppInput
            label="Email Address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Enter your email"
            leftIcon={<Icon name="mail-outline" size={20} color={theme.colors.textSecondary} />}
          />

          <AppButton
            title={sendingOTP ? 'Sending Code...' : 'Continue'}
            onPress={handleSendOTP}
            loading={sendingOTP}
            fullWidth
            style={styles.actionButton}
          />

          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>
              or continue with
            </Text>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, { borderColor: theme.colors.border }]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || isLoading}
            activeOpacity={0.7}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={theme.colors.textPrimary} />
            ) : (
              <>
                <Icon name="logo-google" size={20} color="#DB4437" />
                <Text style={[styles.googleButtonText, { color: theme.colors.textPrimary }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: theme.colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginLink, { color: theme.colors.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.termsContainer}>
            <Text style={[styles.termsText, { color: theme.colors.textSecondary }]}>
              By creating an account, you agree to our{' '}
              <Text style={{ color: theme.colors.primary }}>Terms of Service</Text> and{' '}
              <Text style={{ color: theme.colors.primary }}>Privacy Policy</Text>
            </Text>
          </View>
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
  actionButton: {
    marginTop: 16,
    height: 52,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 15,
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '700',
  },
  termsContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default SignupScreen;
