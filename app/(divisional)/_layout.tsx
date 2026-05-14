import { Stack } from 'expo-router';
import LogoutButton from '../../components/LogoutButton';
import RoleGate from '../../components/RoleGate';
import { colors } from '../../lib/theme';

export default function DivisionalLayout() {
  return (
    <RoleGate role="divisional">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primaryDark },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'SGLR Rating', headerRight: () => <LogoutButton /> }} />
        <Stack.Screen name="inspect/[id]" options={{ title: 'Inspection', headerBackVisible: false }} />
        <Stack.Screen name="summary/[id]" options={{ title: 'Summary', headerBackVisible: false }} />
        <Stack.Screen name="confirm/[id]" options={{ title: 'Confirmation', headerBackVisible: false }} />
        <Stack.Screen name="view/[id]" options={{ title: 'View Inspection' }} />
      </Stack>
    </RoleGate>
  );
}
