import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Spinner from '../components/Spinner';
import { useRouter } from 'expo-router';
import { getRouteForRole, getSession, signIn } from '../lib/authRouting';
import { colors } from '../lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [localPhone, setLocalPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getSession().then((session) => {
      if (!active) return;
      if (session) {
        router.replace(getRouteForRole(session.role) as never);
      } else {
        setCheckingSession(false);
      }
    });
    return () => { active = false; };
  }, [router]);

  function handleLocalPhoneChange(raw: string) {
    // Strip non-digits, drop a leading +91/91 if user pasted a full number, cap at 10
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length > 10) digits = digits.slice(2);
    setLocalPhone(digits.slice(0, 10));
  }

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      const session = await signIn(`+91${localPhone}`, pin);
      router.replace(getRouteForRole(session.role) as never);
    } catch (e: any) {
      setError(e?.message ?? 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) return <Spinner text="Checking access..." />;

  const phoneValid = /^\d{10}$/.test(localPhone);
  const pinValid = /^\d{4}$/.test(pin);
  const canSubmit = phoneValid && pinValid && !loading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>SGLR Rating</Text>
        <Text style={styles.subtitle}>Collector&apos;s Office Inspection Login</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.phonePrefix}>
              <Text style={styles.phonePrefixText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              value={localPhone}
              onChangeText={handleLocalPhoneChange}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="9876543210"
              placeholderTextColor="#8A9BAE"
              maxLength={10}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>PIN</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={(value) => setPin(value.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            secureTextEntry
            placeholder="4-digit PIN"
            placeholderTextColor="#8A9BAE"
            maxLength={4}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.loginButton, !canSubmit && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={!canSubmit}
        >
          <Text style={styles.loginButtonText}>{loading ? 'Signing In...' : 'Login'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24 },
card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 28, fontWeight: '700', color: colors.primaryDark, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 6, marginBottom: 28 },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: colors.textPrimary },
  phoneRow: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  phonePrefix: { paddingHorizontal: 14, paddingVertical: 14, backgroundColor: colors.border, justifyContent: 'center' },
  phonePrefixText: { fontSize: 16, fontWeight: '600', color: colors.primaryDark },
  phoneInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: colors.textPrimary, letterSpacing: 0.5 },
  errorText: { color: colors.danger, fontSize: 13, lineHeight: 18, marginBottom: 16 },
  loginButton: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  loginButtonDisabled: { opacity: 0.5 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
