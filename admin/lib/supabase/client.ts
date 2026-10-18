import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/lib/database.types';

// Browser client: only used by the sign-in page.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
