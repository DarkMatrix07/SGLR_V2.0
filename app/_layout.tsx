import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(divisional)" />
      <Stack.Screen name="(district)" />
    </Stack>
  );
}