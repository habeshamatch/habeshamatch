'use server';

import { revalidatePath } from 'next/cache';

import { logAction } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

// Approve or reject a selfie verification. Approving gives the member the blue tick (free for
// everyone, never linked to paying).
export async function reviewVerification(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = String(formData.get('requestId'));
  const approve = formData.get('decision') === 'approve';
  const reason = String(formData.get('reason') ?? '').trim();
  if (!approve && !reason) throw new Error('Give a reason to reject a verification.');
  const db = createAdminClient();

  const { data: request, error } = await db
    .from('verification_requests')
    .update({ status: approve ? 'approved' : 'rejected', reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('user_id')
    .maybeSingle();
  if (error) throw error;
  if (!request) return; // already reviewed by another admin

  if (approve) {
    const { error: e } = await db.from('profiles').update({ is_photo_verified: true }).eq('id', request.user_id);
    if (e) throw e;
  }
  await logAction(admin.id, request.user_id, approve ? 'verify' : 'reject_verification', reason);
  revalidatePath('/verifications');
}
