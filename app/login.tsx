import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getRouteForRole, getSession, signIn } from '../lib/authRouting';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('+91');
  const [pin, setPin] = useState('');

  function handlePhoneChange(raw: string) {
    const digits = raw.replace(/\D/g, '');
    const local = digits.startsWith('91') && digits.length > 10 ? digits.slice(2) : digits;
    setPhone(`+91${local.slice(0, 10)}`);
  }
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

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      const session = await signIn(phone, pin);
      router.replace(getRouteForRole(session.role) as never);
    } catch (e: any) {
      setError(e?.message ?? 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#0D9DA8" />
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

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
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="+919876543210"
            placeholderTextColor="#8A9BAE"
          />
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
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={[styles.loginButton, loading && styles.loginButtonDisabled]} onPress={handleLogin} disabled={loading}>
          <Text style={styles.loginButtonText}>{loading ? 'Signing In...' : 'Login'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF4F5', justifyContent: 'center', padding: 24 },
  loadingScreen: { flex: 1, backgroundColor: '#EEF4F5', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#8A9BAE', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#E0E8EA' },
  title: { fontSize: 28, fontWeight: '700', color: '#0D7377', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#8A9BAE', textAlign: 'center', marginTop: 6, marginBottom: 28 },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#1A1A2E', marginBottom: 8 },
  input: { backgroundColor: '#EEF4F5', borderRadius: 12, borderWidth: 1, borderColor: '#E0E8EA', paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: '#1A1A2E' },
  errorText: { color: '#E63946', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  loginButton: { backgroundColor: '#0D9DA8', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
