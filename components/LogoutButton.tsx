import { Pressable, Text } from 'react-native';
import { router as globalRouter } from 'expo-router';
import { signOut } from '../lib/authRouting';

export default function LogoutButton() {
    return (
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
    );
}
