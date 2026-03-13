import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, TouchableOpacity, Image, ActivityIndicator,
  useWindowDimensions, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import { signInWithGoogle, configureGoogleSignIn } from '../../services/googleAuthService';

const LOGO   = require('../../assets/images/skillsphere-logo.png');
const ORANGE = '#F68B3C';

const getColors = (isDark) => ({
  bg:               isDark ? '#0F0F1E'                                                          : '#EEF0FF',
  webBg:            isDark ? 'linear-gradient(135deg,#0F0F1E 0%,#1A1A2E 50%,#0F1628 100%)'    : 'linear-gradient(135deg,#EEF0FF 0%,#F0F2FF 50%,#E8EEFF 100%)',
  cardBg:           isDark ? 'rgba(255,255,255,0.06)'   : '#FFFFFF',
  cardBorder:       isDark ? 'rgba(255,255,255,0.1)'    : 'rgba(26,26,46,0.08)',
  textPrimary:      isDark ? '#FFFFFF'                  : '#1A1A2E',
  textSecondary:    isDark ? 'rgba(255,255,255,0.55)'   : 'rgba(26,26,46,0.55)',
  inputBg:          isDark ? 'rgba(255,255,255,0.06)'   : 'rgba(26,26,46,0.04)',
  inputBorder:      isDark ? 'rgba(255,255,255,0.12)'   : 'rgba(26,26,46,0.1)',
  inputText:        isDark ? '#FFFFFF'                  : '#1A1A2E',
  inputPlaceholder: isDark ? 'rgba(255,255,255,0.3)'    : 'rgba(26,26,46,0.3)',
  inputIcon:        isDark ? 'rgba(255,255,255,0.4)'    : 'rgba(26,26,46,0.4)',
  divider:          isDark ? 'rgba(255,255,255,0.1)'    : 'rgba(26,26,46,0.1)',
  dividerText:      isDark ? 'rgba(255,255,255,0.4)'    : 'rgba(26,26,46,0.4)',
  googleBg:         isDark ? 'rgba(255,255,255,0.07)'   : 'rgba(26,26,46,0.04)',
  googleBorder:     isDark ? 'rgba(255,255,255,0.12)'   : 'rgba(26,26,46,0.1)',
  googleText:       isDark ? 'rgba(255,255,255,0.85)'   : 'rgba(26,26,46,0.85)',
  footerText:       isDark ? 'rgba(255,255,255,0.5)'    : 'rgba(26,26,46,0.5)',
  terms:            isDark ? 'rgba(255,255,255,0.35)'   : 'rgba(26,26,46,0.35)',
  errorBg:          isDark ? 'rgba(255,107,107,0.12)'   : 'rgba(239,68,68,0.08)',
  errorBorder:      isDark ? 'rgba(255,107,107,0.25)'   : 'rgba(239,68,68,0.2)',
  backBtn:          isDark ? 'rgba(255,255,255,0.1)'    : 'rgba(26,26,46,0.1)',
  logoText:         isDark ? '#FFFFFF'                  : '#1A1A2E',
});

const AuthInput = ({ icon, placeholder, value, onChangeText, keyboardType = 'default', autoCapitalize = 'none', right, C }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[inp.wrap, {
      backgroundColor: C.inputBg,
      borderColor: focused ? ORANGE : C.inputBorder,
    }]}>
      <Icon name={icon} size={18} color={focused ? ORANGE : C.inputIcon} />
      <TextInput
        style={[inp.field, { color: C.inputText }]}
        placeholder={placeholder}
        placeholderTextColor={C.inputPlaceholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {right}
    </View>
  );
};
const inp = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14 },
  field: { flex: 1, fontSize: 14, outlineStyle: 'none' },
});

const SignupScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const { sendOTP, googleSignIn, isLoading } = useAuth();
  const { isDark } = useTheme();
  const C = getColors(isDark);

  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [error, setError]           = useState('');
  const [sendingOTP, setSendingOTP] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isWeb = Platform.OS === 'web';

  useEffect(() => { configureGoogleSignIn(); }, []);

  const handleSendOTP = async () => {
    setError('');
    if (!name.trim())  return setError('Please enter your full name');
    if (!email.trim()) return setError('Please enter your email address');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Please enter a valid email address');
    setSendingOTP(true);
    try {
      const result = await sendOTP(email.trim().toLowerCase(), name.trim());
      setSendingOTP(false);
      if (result.success) {
        navigation.navigate('SignupOTP', { email: email.trim().toLowerCase(), name: name.trim() });
      } else {
        setError(result.error || 'Failed to send verification code');
      }
    } catch (err) {
      setSendingOTP(false);
      setError(err.message || 'Failed to send verification code');
    }
  };

  const handleGoogle = async () => {
    setError(''); setGoogleLoading(true);
    try {
      const gr = await signInWithGoogle();
      if (!gr.success) { setGoogleLoading(false); if (gr.error !== 'Sign in was cancelled') setError(gr.error); return; }
      const result = await googleSignIn(gr.idToken);
      setGoogleLoading(false);
      if (!result.success) setError(result.error || 'Google sign in failed');
    } catch (err) { setGoogleLoading(false); setError('Google sign in failed. Please try again.'); }
  };

  const bg = isWeb ? { background: C.webBg } : { backgroundColor: C.bg };

  return (
    <View style={[s.container, bg]}>
      <View style={[s.glow1, { backgroundColor: ORANGE + '0C' }]} />
      <View style={[s.glow2, { backgroundColor: '#6366F1' + (isDark ? '0A' : '08') }]} />

      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, { backgroundColor: C.backBtn }]}>
          <Icon name="arrow-back" size={18} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={LOGO} style={s.logoImg} resizeMode="cover" />
          <Text style={[s.logoText, { color: C.logoText }]}>SKILL<Text style={{ color: ORANGE }}>SPHERE</Text></Text>
        </View>
        <ThemeToggle iconColor={C.textPrimary} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={s.brandHeader}>
            <View style={[s.iconCircle, { backgroundColor: ORANGE + '20', borderColor: ORANGE + '40' }]}>
              <Icon name="person-add" size={30} color={ORANGE} />
            </View>
            <Text style={[s.title, { color: C.textPrimary }]}>Create Account</Text>
            <Text style={[s.subtitle, { color: C.textSecondary }]}>Start your learning journey today</Text>
          </View>

          <View style={[s.card, { backgroundColor: C.cardBg, borderColor: C.cardBorder, maxWidth: 440, alignSelf: 'center', width: '100%' }]}>

            {!!error && (
              <View style={[s.errorBox, { backgroundColor: C.errorBg, borderColor: C.errorBorder }]}>
                <Icon name="alert-circle" size={16} color="#EF4444" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <AuthInput C={C} icon="person-outline" placeholder="Full name" value={name}
              onChangeText={t => { setName(t); setError(''); }} autoCapitalize="words" />
            <AuthInput C={C} icon="mail-outline" placeholder="Email address" value={email}
              onChangeText={t => { setEmail(t); setError(''); }} keyboardType="email-address" />

            <TouchableOpacity style={s.primaryBtn} onPress={handleSendOTP} disabled={sendingOTP} activeOpacity={0.85}>
              {sendingOTP ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryBtnText}>Continue</Text>}
            </TouchableOpacity>

            <View style={s.divider}>
              <View style={[s.divLine, { backgroundColor: C.divider }]} />
              <Text style={[s.divText, { color: C.dividerText }]}>or continue with</Text>
              <View style={[s.divLine, { backgroundColor: C.divider }]} />
            </View>

            <TouchableOpacity style={[s.googleBtn, { backgroundColor: C.googleBg, borderColor: C.googleBorder }]} onPress={handleGoogle} disabled={googleLoading || isLoading} activeOpacity={0.8}>
              {googleLoading ? <ActivityIndicator color={C.googleText} /> : (
                <>
                  <Icon name="logo-google" size={18} color="#DB4437" />
                  <Text style={[s.googleText, { color: C.googleText }]}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={s.footer}>
              <Text style={[s.footerText, { color: C.footerText }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={s.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

            <Text style={[s.terms, { color: C.terms }]}>
              By creating an account, you agree to our{' '}
              <Text style={{ color: ORANGE }}>Terms of Service</Text> and{' '}
              <Text style={{ color: ORANGE }}>Privacy Policy</Text>
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  glow1: { position: 'absolute', width: 320, height: 320, borderRadius: 160, top: -80, right: -60, zIndex: 0 },
  glow2: { position: 'absolute', width: 250, height: 250, borderRadius: 125, bottom: 40, left: -80, zIndex: 0 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 16, paddingBottom: 12, zIndex: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  logoImg: { width: 42, height: 42, borderRadius: 12 },
  logoText: { fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  brandHeader: { alignItems: 'center', paddingVertical: 32 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 8 },
  subtitle: { fontSize: 14 },
  card: { borderRadius: 24, borderWidth: 1, padding: 24 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 14 },
  errorText: { flex: 1, color: '#EF4444', fontSize: 13 },
  primaryBtn: { height: 52, borderRadius: 12, backgroundColor: ORANGE, borderWidth: 1, borderColor: '#E77828', justifyContent: 'center', alignItems: 'center', shadowColor: '#C96A24', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 6, elevation: 3 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.15 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 },
  divLine: { flex: 1, height: 1 },
  divText: { fontSize: 12 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 50, borderRadius: 12, borderWidth: 1 },
  googleText: { fontSize: 14, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 14 },
  footerLink: { color: ORANGE, fontSize: 14, fontWeight: '700', letterSpacing: 0.1 },
  terms: { fontSize: 11, textAlign: 'center', lineHeight: 18, marginTop: 16 },
});

export default SignupScreen;
