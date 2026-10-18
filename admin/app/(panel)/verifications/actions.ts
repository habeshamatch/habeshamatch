'use server';

import { revalidatePath } from 'next/cache';

import { logAction } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const MIN_PHOTOS = 2; // a member needs at least 2 approved photos

// Approve or reject a new member's submission (selfie + photos). Approving verifies the member
// (blue tick) and approves their pending photos, which makes them visible and lets them take part.
// Photos ticked as a problem are rejected either way. A rejection reason is shown to the member.
export async function reviewSubmission(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = String(formData.get('requestId'));
  const approve = formData.get('decision') === 'approve';
  const reason = String(formData.get('reason') ?? '').trim();
  const badPhotos = formData.getAll('rejectPhoto').map(String);
  if (!approve && !reason) throw new Error('Give a reason to reject. The member will see it.');
  const db = createAdminClient();

  const { data: request, error } = await db
    .from('verification_requests')
    .select('user_id, status')
    .eq('id', requestId)
    .single();
  if (error) throw error;
  if (request.status !== 'pending') return; // already reviewed by another admin
  const userId = request.user_id;

  if (badPhotos.length) {
    const { error: e } = await db.from('photos').update({ moderation_status: 'rejected' }).eq('user_id', userId).in('id', badPhotos);
    if (e) throw e;
  }

  if (approve) {
    const { data: remaining, error: e } = await db
      .from('photos')
      .update({ moderation_status: 'approved' })
      .eq('user_id', userId)
      .neq('moderation_status', 'rejected')
      .select('id');
    if (e) throw e;
    if ((remaining?.length ?? 0) < MIN_PHOTOS) {
      throw new Error(`At least ${MIN_PHOTOS} good photos are needed to approve. Reject instead and ask for new photos.`);
    }
    const { error: e2 } = await db.from('profiles').update({ is_photo_verified: true }).eq('id', userId);
    if (e2) throw e2;
  }

  const { error: e3 } = await db
    .from('verification_requests')
    .update({
      status: approve ? 'approved' : 'rejected',
      rejection_reason: approve ? null : reason,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);
  if (e3) throw e3;

  await logAction(
    admin.id,
    userId,
    approve ? 'approve_member' : 'reject_member',
    [reason, badPhotos.length ? `${badPhotos.length} photo(s) rejected` : ''].filter(Boolean).join(' · '),
  );
  revalidatePath('/verifications');
}
