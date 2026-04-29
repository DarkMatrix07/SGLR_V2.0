import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getRouteForRole, resolveAppRole } from '../lib/authRouting';
import { supabase } from '../lib/supabase';

function normalizeIndianPhone(raw: string) {
  const trimmed = raw.replace(/[^\d+]/g, '');

  if (trimmed.startsWith('+91')) {
    return `+91${trimmed.slice(3).replace(/\D/g, '').slice(0, 10)}`;
  }

  const digits = trimmed.replace(/\D/g, '');
  const localNumber = digits.startsWith('91') && digits.length > 10 ? digits.slice(2) : digits;
  return `+91${localNumber.slice(0, 10)}`;
}

function getFriendlyError(message: string) {
  const lowered = message.toLowerCase();

  if (lowered.includes('invalid login credentials')) {
    return 'Incorrect PIN or this phone number is not approved yet.';
  }

  if (lowered.includes('email not confirmed')) {
    return 'This phone number is not approved for app access yet.';
  }

  return message;
}

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('+91');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;

      if (session) {
        const role = await resolveAppRole(session);
        if (!active) return;

        if (role) {
          router.replace(getRouteForRole(role) as never);
        } else {
          await supabase.auth.signOut();
          setError('This phone number has not been assigned to a divisional or district section yet.');
          setCheckingSession(false);
        }
      } else {
        setCheckingSession(false);
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogin() {
    const normalizedPhone = normalizeIndianPhone(phone);

    if (!/^\+91\d{10}$/.test(normalizedPhone)) {
      setError('Enter a valid Indian mobile number in +91 format.');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      phone: normalizedPhone,
      password: pin,
    });

    if (signInError) {
      setLoading(false);
      setError(getFriendlyError(signInError.message));
      return;
    }

    if (!data.session) {
      setLoading(false);
      setError('Login succeeded, but no session was returned.');
      return;
    }

    const role = await resolveAppRole(data.session);

    setLoading(false);

    if (!role) {
      await supabase.auth.signOut();
      setError('This phone number has not been assigned to a divisional or district section yet.');
      return;
    }

    router.replace(getRouteForRole(role) as never);
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
            onChangeText={(value) => setPhone(normalizeIndianPhone(value))}
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
