import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function ResortSelectionScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;

      if (!session) {
        router.replace('/');
        return;
      }

      setPhone(session.user.phone ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#0D9DA8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Resort Selection</Text>
        <Text style={styles.subtitle}>Login is working. This is the next screen placeholder.</Text>
        <Text style={styles.metaLabel}>Signed in as</Text>
        <Text style={styles.phone}>{phone ?? 'Unknown number'}</Text>

        <Pressable style={styles.secondaryButton} onPress={handleSignOut} disabled={signingOut}>
          <Text style={styles.secondaryButtonText}>{signingOut ? 'Signing Out...' : 'Sign Out'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF4F5', justifyContent: 'center', padding: 24 },
  loadingScreen: { flex: 1, backgroundColor: '#EEF4F5', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#E0E8EA' },
  title: { fontSize: 24, fontWeight: '700', color: '#0D7377', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#8A9BAE', lineHeight: 20, marginBottom: 20 },
  metaLabel: { fontSize: 12, fontWeight: '600', color: '#8A9BAE', textTransform: 'uppercase', letterSpacing: 0.5 },
  phone: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginTop: 6, marginBottom: 24 },
  secondaryButton: { borderWidth: 1.5, borderColor: '#0D9DA8', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  secondaryButtonText: { color: '#0D9DA8', fontSize: 15, fontWeight: '700' },
});
