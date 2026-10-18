'use server';

import { revalidatePath } from 'next/cache';

import { logAction } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

// Approve or reject a pending photo. Approved photos become visible to other members (and make the
// owner discoverable); rejected ones stay hidden and are marked Not approved in the app.
export async function moderatePhoto(formData: FormData) {
  const admin = await requireAdmin();
  const photoId = String(formData.get('photoId'));
  const decision = formData.get('decision') === 'approve' ? 'approved' : 'rejected';
  const reason = String(formData.get('reason') ?? '');

  const db = createAdminClient();
  const { data: photo, error } = await db
    .from('photos')
    .update({ moderation_status: decision })
    .eq('id', photoId)
    .eq('moderation_status', 'pending') // another admin may have decided already
    .select('user_id')
    .maybeSingle();
  if (error) throw error;
  if (photo) await logAction(admin.id, photo.user_id, decision === 'approved' ? 'approve_photo' : 'reject_photo', reason);
  revalidatePath('/photos');
}
