import { Stack } from 'expo-router';

export default function DivisionalLayout() {
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