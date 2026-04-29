import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { getRouteForRole, resolveAppRole } from '../../lib/authRouting';
import { supabase } from '../../lib/supabase';

export default function DistrictLayout() {
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

            if (role !== 'district') {
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
            <Stack.Screen name="index" options={{ title: 'District Review' }} />
            <Stack.Screen name="detail/[id]" options={{ title: 'Inspection Details' }} />
        </Stack>
    );
}
