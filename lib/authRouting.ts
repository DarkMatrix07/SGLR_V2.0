import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type AppRole = 'divisional' | 'district' | 'admin';

export type AppSession = {
    officerId: string;
    phone: string;
    name: string | null;
    role: AppRole;
};

const SESSION_KEY = 'sglr_session_v1';

function normalizePhone(raw: string) {
    const digits = raw.replace(/\D/g, '');
    const local = digits.startsWith('91') && digits.length > 10 ? digits.slice(2) : digits;
    return `+91${local.slice(0, 10)}`;
}

export async function signIn(rawPhone: string, pin: string): Promise<AppSession> {
    const phone = normalizePhone(rawPhone);

    if (!/^\+91\d{10}$/.test(phone)) {
        throw new Error('Enter a valid Indian mobile number.');
    }
    if (!/^\d{4}$/.test(pin)) {
        throw new Error('PIN must be exactly 4 digits.');
    }

    const { data, error } = await supabase
        .from('officers')
        .select('id, phone, name, role, pin, is_active')
        .eq('phone', phone)
        .eq('is_active', true)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('This phone number is not approved for app access.');
    if (data.pin !== pin) throw new Error('Incorrect PIN.');
    if (!['divisional', 'district', 'admin'].includes(data.role)) {
        throw new Error('Your account has no role assigned.');
    }

    const session: AppSession = {
        officerId: data.id,
        phone: data.phone,
        name: data.name,
        role: data.role,
    };

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
}

export async function getSession(): Promise<AppSession | null> {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as AppSession;
    } catch {
        await AsyncStorage.removeItem(SESSION_KEY);
        return null;
    }
}

export async function signOut(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
}

export function getRouteForRole(role: AppRole): string {
    if (role === 'admin') return '/(admin)';
    if (role === 'district') return '/(district)';
    return '/(divisional)';
}
