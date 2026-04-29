import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AppRole = 'divisional' | 'district';

function normalizePhoneVariants(phone: string | null | undefined) {
    if (!phone) return [];

    const digits = phone.replace(/\D/g, '');
    const local = digits.startsWith('91') && digits.length > 10 ? digits.slice(2) : digits;

    return Array.from(new Set([phone, local].filter(Boolean)));
}

export async function resolveAppRole(session: Session): Promise<AppRole | null> {
    const metadataRole = session.user.user_metadata?.app_role;

    if (metadataRole === 'divisional' || metadataRole === 'district') {
        return metadataRole;
    }

    const phoneVariants = normalizePhoneVariants(session.user.phone);
    if (phoneVariants.length === 0) return null;

    const { data, error } = await supabase
        .from('officers')
        .select('role, is_active')
        .in('phone', phoneVariants)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;

    if (data.role === 'divisional' || data.role === 'district') {
        return data.role;
    }

    return null;
}

export function getRouteForRole(role: AppRole) {
    return role === 'district' ? '/(district)' : '/(divisional)';
}
