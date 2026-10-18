import 'server-only';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';

// Service role client: bypasses Row Level Security. SERVER ONLY. 'server-only' makes the build fail
// if this file is ever imported into browser code. Use it only after requireAdmin() has passed.
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('SUPABASE_SECRET_KEY is not set (server environment variable).');
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
