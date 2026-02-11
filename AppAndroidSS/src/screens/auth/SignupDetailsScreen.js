import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import BrandLogo from '../../components/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const SignupDetailsScreen = ({ route, navigation }) => {
  const params = route?.params || {};
  const email = params.email || '';
  const name = params.name || '';
  const { theme } = useTheme();
  const { completeRegistration, isLoading } = useAuth();

  // Debug log
  console.log('SignupDetailsScreen mounted with params:', { email, name });
  const { width } = useWindowDimensions();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const isWeb = Platform.OS === 'web';
  const maxWidth = isWeb ? 440 : '100%';

  const handleComplete = async () => {
    setError('');

    if (!password) {
      setError('Please enter a password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    console.log('Completing registration for:', email);

    try {
      const result = await completeRegistration(email, password, name, phone || null);
      console.log('Complete registration result:', result);

      if (!result.success) {
        setError(result.error || 'Registration failed');
      }
      // If successful, AuthContext will set the user and navigation will happen automatically
    } catch (err) {
      console.log('Complete registration error:', err);
      setError(err.message || 'Registration failed');
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <BrandLogo size={80} />
          <Text style={[styles.title, { color: '#fff' }]}>
            Complete Setup
          </Text>
          <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.8)' }]}>
            Create a password for your account
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
            },
          ]}
        >
          {/* Success Banner */}
          <View style={styles.successBanner}>
            <Icon name="checkmark-circle" size={24} color={theme.colors.success || '#10B981'} />
            <Text style={[styles.successText, { color: theme.colors.success || '#10B981' }]}>
              Email verified successfully!
            </Text>
          </View>

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
            label="Phone (Optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="Enter your phone number"
            leftIcon={<Icon name="call-outline" size={20} color={theme.colors.textSecondary} />}
          />

          <AppInput
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError('');
            }}
            secureTextEntry={!showPassword}
            placeholder="Create a password (min 6 characters)"
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

          <AppInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setError('');
            }}
            secureTextEntry={!showPassword}
            placeholder="Confirm your password"
            leftIcon={<Icon name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />}
          />

          <AppButton
            title="Create Account"
            onPress={handleComplete}
            loading={isLoading}
            fullWidth
            style={styles.createButton}
          />

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
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 16,
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#d1fae5',
    borderRadius: 12,
  },
  successText: {
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
  createButton: {
    marginTop: 16,
    height: 52,
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

export default SignupDetailsScreen;
