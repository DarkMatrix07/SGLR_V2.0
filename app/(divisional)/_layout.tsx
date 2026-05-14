import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Stack, router as globalRouter, useRouter } from 'expo-router';
import { getRouteForRole, getSession, signOut } from '../../lib/authRouting';

export default function DivisionalLayout() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    getSession().then((session) => {
      if (!active) return;
      if (!session) {
        router.replace('/login');
        return;
      }
      if (session.role !== 'divisional') {
        router.replace(getRouteForRole(session.role) as never);
        return;
      }
      setAllowed(true);
    });
    return () => { active = false; };
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
      <Stack.Screen
        name="index"
        options={{
          title: 'SGLR Rating',
          headerRight: () => (
            <Pressable
              onPress={async () => {
                await signOut();
                globalRouter.replace('/login');
              }}
              hitSlop={12}
              style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Logout</Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="inspect/[id]" options={{ title: 'Inspection', headerBackVisible: false }} />
      <Stack.Screen name="summary/[id]" options={{ title: 'Summary', headerBackVisible: false }} />
      <Stack.Screen name="confirm/[id]" options={{ title: 'Confirmation', headerBackVisible: false }} />
      <Stack.Screen name="view/[id]" options={{ title: 'View Inspection' }} />
    </Stack>
  );
}
