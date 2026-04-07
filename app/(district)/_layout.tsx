import { Stack } from 'expo-router';

export default function DistrictLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: '#0D7377' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="index" options={{ title: 'District Review' }} />
            <Stack.Screen name="detail/[id]" options={{ title: 'Inspection Details' }} />
        </Stack>
    );
}