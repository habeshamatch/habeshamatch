import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

// Every moderation decision is recorded with who made it and why (moderation_actions).
export async function logAction(adminId: string, userId: string | null, action: string, reason?: string | null) {
  const { error } = await createAdminClient()
    .from('moderation_actions')
    .insert({ admin_id: adminId, user_id: userId, action, reason: reason?.trim() || null });
  if (error) throw error;
}
