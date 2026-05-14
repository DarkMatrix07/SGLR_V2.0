import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getRouteForRole, getSession } from '../lib/authRouting';

export default function EntryRouter() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    getSession().then((session) => {
      if (!active) return;
      if (session) {
        router.replace(getRouteForRole(session.role) as never);
      } else {
        router.replace('/login');
      }
    });
    return () => { active = false; };
  }, [router]);

  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color="#0D9DA8" />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, backgroundColor: '#EEF4F5', justifyContent: 'center', alignItems: 'center' },
});
