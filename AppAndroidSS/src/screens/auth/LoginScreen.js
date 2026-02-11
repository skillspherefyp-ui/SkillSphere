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

const LOGIN_MODES = {
  PASSWORD: 'password',
  OTP: 'otp',
};

const LoginScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const { login, sendLoginOTP, googleSignIn, isLoading } = useAuth();

  const [loginMode, setLoginMode] = useState(LOGIN_MODES.PASSWORD);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [sendingOTP, setSendingOTP] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isWeb = Platform.OS === 'web';
  const maxWidth = isWeb ? 440 : '100%';

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const handlePasswordLogin = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    const result = await login(email.trim().toLowerCase(), password);

    if (!result.success) {
      setError(result.error || 'Login failed. Please check your credentials.');
    }
    // Success - AuthContext will handle navigation
  };

  const handleSendLoginOTP = async () => {
    setError('');

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
    console.log('Sending Login OTP to:', email.trim().toLowerCase());

    try {
      const result = await sendLoginOTP(email.trim().toLowerCase());
      console.log('SendLoginOTP result:', result);
      setSendingOTP(false);

      if (result.success) {
        const params = { email: email.trim().toLowerCase() };
        console.log('Login OTP sent successfully, navigating to LoginOTP with params:', params);
        navigation.navigate('LoginOTP', params);
      } else {
        if (result.error?.includes('not found') || result.error?.includes('sign up')) {
          setError('No account found with this email. Please sign up first.');
        } else {
          setError(result.error || 'Failed to send verification code');
        }
      }
    } catch (err) {
      console.log('Login OTP error:', err);
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

  const switchLoginMode = (mode) => {
    setLoginMode(mode);
    setError('');
  };

  const gradientColors = theme.mode === 'dark'
    ? [theme.colors.background, theme.colors.backgroundSecondary]
    : [theme.colors.background, theme.colors.backgroundSecondary];

  const renderLoginModeTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tab,
          loginMode === LOGIN_MODES.PASSWORD && { backgroundColor: theme.colors.primary },
        ]}
        onPress={() => switchLoginMode(LOGIN_MODES.PASSWORD)}
        activeOpacity={0.7}
      >
        <Icon
          name="lock-closed-outline"
          size={18}
          color={loginMode === LOGIN_MODES.PASSWORD ? '#fff' : theme.colors.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            { color: loginMode === LOGIN_MODES.PASSWORD ? '#fff' : theme.colors.textSecondary },
          ]}
        >
          Password
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          loginMode === LOGIN_MODES.OTP && { backgroundColor: theme.colors.primary },
        ]}
        onPress={() => switchLoginMode(LOGIN_MODES.OTP)}
        activeOpacity={0.7}
      >
        <Icon
          name="mail-outline"
          size={18}
          color={loginMode === LOGIN_MODES.OTP ? '#fff' : theme.colors.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            { color: loginMode === LOGIN_MODES.OTP ? '#fff' : theme.colors.textSecondary },
          ]}
        >
          Email Code
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPasswordLogin = () => (
    <>
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

      <AppInput
        label="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError('');
        }}
        secureTextEntry={!showPassword}
        placeholder="Enter your password"
        leftIcon={<Icon name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />}
        rightIcon={
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
            <Icon
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        }
      />

      <TouchableOpacity
        onPress={() => navigation.navigate('ForgotPassword')}
        style={styles.forgotPassword}
      >
        <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>
          Forgot Password?
        </Text>
      </TouchableOpacity>

      <AppButton
        title="Sign In"
        onPress={handlePasswordLogin}
        loading={isLoading}
        fullWidth
        style={styles.loginButton}
      />
    </>
  );

  const renderOTPLogin = () => (
    <>
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

      <Text style={[styles.otpInfoText, { color: theme.colors.textSecondary }]}>
        We'll send a 6-digit verification code to your email
      </Text>

      <AppButton
        title={sendingOTP ? 'Sending Code...' : 'Send Verification Code'}
        onPress={handleSendLoginOTP}
        loading={sendingOTP}
        fullWidth
        style={styles.loginButton}
      />
    </>
  );

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
              Welcome Back
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Sign in to continue learning
            </Text>
          </Animated.View>

          {renderLoginModeTabs()}

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

          {loginMode === LOGIN_MODES.PASSWORD && renderPasswordLogin()}
          {loginMode === LOGIN_MODES.OTP && renderOTPLogin()}

          {loginMode === LOGIN_MODES.PASSWORD && (
            <>
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
            </>
          )}

          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: theme.colors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={[styles.signupLink, { color: theme.colors.primary }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.termsContainer}>
            <Text style={[styles.termsText, { color: theme.colors.textSecondary }]}>
              By signing in, you agree to our{' '}
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
    marginBottom: 20,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: 16,
    height: 52,
  },
  otpInfoText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
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
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signupText: {
    fontSize: 15,
  },
  signupLink: {
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

export default LoginScreen;
