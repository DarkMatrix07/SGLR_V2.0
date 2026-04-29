import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { getRouteForRole, resolveAppRole } from '../../lib/authRouting';
import { supabase } from '../../lib/supabase';

export default function DivisionalLayout() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;

      if (!session) {
        router.replace('/');
        return;
      }

      const role = await resolveAppRole(session);
      if (!active) return;

      if (role !== 'divisional') {
        router.replace(role ? getRouteForRole(role) : '/');
        return;
      }

      setAllowed(true);
    });

    return () => {
      active = false;
    };
  }, [router]);

  if (!allowed) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF4F5' }}>
        <ActivityIndicator size="large" color="#0D9DA8" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0D7377' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'SGLR Rating' }} />
      <Stack.Screen name="inspect/[id]" options={{ title: 'Inspection', headerBackVisible: false }} />
      <Stack.Screen name="summary/[id]" options={{ title: 'Summary', headerBackVisible: false }} />
      <Stack.Screen name="confirm/[id]" options={{ title: 'Confirmation', headerBackVisible: false }} />
      <Stack.Screen name="view/[id]" options={{ title: 'View Inspection' }} />
    </Stack>
  );
}
