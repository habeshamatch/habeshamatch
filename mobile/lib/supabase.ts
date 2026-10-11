import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { secureStorage } from '@/lib/secureStorage';
import type { Database } from '@/types/database';

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name}. Copy mobile/.env.example to mobile/.env and restart Expo.`);
  }
  return value;
}

// Expo only inlines EXPO_PUBLIC_ variables when they are referenced directly like this.
const supabaseUrl = requireEnv('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

// Sessions are kept in encrypted device storage (see lib/secureStorage.ts).
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // no URLs to read a session from in a native app
  },
});

// Only refresh the auth token while the app is in the foreground, as Supabase recommends for React Native.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
