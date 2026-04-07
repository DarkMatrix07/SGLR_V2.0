import 'react-native-url-polyfill/auto';

if (typeof window === 'undefined') {
    (global as any).window = {};
}

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://yowfckroevkniesxnuan.supabase.co/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvd2Zja3JvZXZrbmllc3hudWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzE2ODYsImV4cCI6MjA5MDQ0NzY4Nn0.Lrs6hXleQYAMVZpDbdHv27o2Xz5P_B3Ipya2aHu6wv4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});