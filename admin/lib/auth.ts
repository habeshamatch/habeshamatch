import 'server-only';

import { redirect } from 'next/navigation';
import { connection } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type Admin = { id: string; email: string };

// Every admin page and action starts here. Signed-in users who are not in the admins table are
// turned away. Returns the admin's id for the audit log (moderation_actions).
export async function requireAdmin(): Promise<Admin> {
  // Admin pages are always rendered per request (they show the current time, ages, queues).
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: row, error } = await createAdminClient().from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!row) redirect('/login?denied=1');
  return { id: userId, email: (data.claims.email as string | undefined) ?? '' };
}
