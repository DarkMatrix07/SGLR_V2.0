import { Stack } from 'expo-router';
import LogoutButton from '../../components/LogoutButton';
import RoleGate from '../../components/RoleGate';
import { colors } from '../../lib/theme';

export default function DistrictLayout() {
    return (
        <RoleGate role="district">
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: colors.primaryDark },
                    headerTintColor: '#fff',
                    headerTitleStyle: { fontWeight: '600' },
                    animation: 'slide_from_right',
                }}
            >
                <Stack.Screen name="index" options={{ title: 'District Review', headerRight: () => <LogoutButton /> }} />
                <Stack.Screen name="detail/[id]" options={{ title: 'Inspection Details' }} />
            </Stack>
        </RoleGate>
    );
}
