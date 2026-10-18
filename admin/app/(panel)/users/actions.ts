'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { logAction } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/database.types';

type Status = Database['public']['Enums']['account_status_t'];

const reasonOf = (formData: FormData) => {
  const reason = String(formData.get('reason') ?? '').trim();
  if (!reason) throw new Error('A reason is required.');
  return reason;
};

// Suspend, ban or reactivate. Suspended and banned members cannot use the app (the database
// rejects them with account_not_active) and are hidden from everyone.
export async function changeAccountStatus(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get('userId'));
  const status = String(formData.get('status')) as Status;
  if (!['active', 'suspended', 'banned'].includes(status)) throw new Error('Unknown status');
  const reason = reasonOf(formData);
  const { error } = await createAdminClient().from('profiles').update({ account_status: status }).eq('id', userId);
  if (error) throw error;
  await logAction(admin.id, userId, status === 'active' ? 'reactivate' : status === 'suspended' ? 'suspend' : 'ban', reason);
  revalidatePath(`/users/${userId}`);
}

// A recorded warning (shown in the member's moderation history). The app does not notify the
// member yet; that needs push notifications (Prompt 5.2).
export async function warnUser(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get('userId'));
  await logAction(admin.id, userId, 'warn', reasonOf(formData));
  revalidatePath(`/users/${userId}`);
}

// Permanently deletes the member: their Storage files, then their auth user (which cascades to every
// row). The log entry is written first and keeps the reason; its user_id becomes empty afterwards.
export async function deleteUserAccount(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get('userId'));
  if (formData.get('confirm') !== 'yes') throw new Error('Tick the box to confirm.');
  const reason = reasonOf(formData);
  const db = createAdminClient();

  const { data: profile } = await db.from('profiles').select('display_name').eq('id', userId).maybeSingle();
  await logAction(admin.id, userId, 'delete', `${reason} (was ${profile?.display_name ?? 'unknown'}, ${userId})`);

  for (const bucket of ['photos', 'verifications']) {
    for (;;) {
      const { data, error } = await db.storage.from(bucket).list(userId, { limit: 1000 });
      if (error || !data || data.length === 0) break;
      await db.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
      if (data.length < 1000) break;
    }
  }
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) throw error;
  redirect('/users');
}
