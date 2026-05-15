import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Don't throw at module-load — that crashes the entire app on launch with no recoverable error.
// Use harmless placeholders so the client constructs; any actual query will fail informatively.
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Check eas.json env block for production builds.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.invalid',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    }
);
