import { Stack } from 'expo-router';
import LogoutButton from '../../components/LogoutButton';
import RoleGate from '../../components/RoleGate';
import { colors } from '../../lib/theme';

export default function AdminLayout() {
    return (
        <RoleGate role="admin">
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: colors.primaryDark },
                    headerTintColor: '#fff',
                    headerTitleStyle: { fontWeight: '600' },
                    animation: 'slide_from_right',
                }}
            >
                <Stack.Screen name="index" options={{ title: 'Admin', headerRight: () => <LogoutButton /> }} />
                <Stack.Screen name="officers/index" options={{ title: 'Officers' }} />
                <Stack.Screen name="officers/[id]" options={{ title: 'Edit Officer' }} />
                <Stack.Screen name="officers/new" options={{ title: 'New Officer' }} />
                <Stack.Screen name="resorts/index" options={{ title: 'Resorts' }} />
                <Stack.Screen name="resorts/[id]" options={{ title: 'Edit Resort' }} />
                <Stack.Screen name="resorts/new" options={{ title: 'New Resort' }} />
                <Stack.Screen name="resorts/import" options={{ title: 'Bulk Import Resorts' }} />
                <Stack.Screen name="checklist/index" options={{ title: 'Checklist' }} />
                <Stack.Screen name="checklist/[id]" options={{ title: 'Edit Item' }} />
                <Stack.Screen name="checklist/new" options={{ title: 'New Item' }} />
                <Stack.Screen name="inspections/index" options={{ title: 'All Inspections' }} />
                <Stack.Screen name="audit/index" options={{ title: 'Audit Log' }} />
                <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
                <Stack.Screen name="reports/index" options={{ title: 'Reports' }} />
            </Stack>
        </RoleGate>
    );
}
