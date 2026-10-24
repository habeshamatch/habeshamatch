import type { Option } from '@/lib/profileOptions';
import { supabase } from '@/lib/supabase';
import type { Enums } from '@/types/database';

// Block and report. Required for the App Store. Blocking hides both people from each other
// everywhere (discovery, profiles, photos, chats, messages); the database enforces it.

export const REPORT_CATEGORIES: Option<Enums<'report_category_t'>>[] = [
  { value: 'fake_profile', label: 'Fake profile' },
  { value: 'scam', label: 'Scam or asking for money' },
  { value: 'harassment', label: 'Harassment or threats' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate_photos', label: 'Inappropriate photos' },
  { value: 'underage', label: 'Appears to be under 18' },
  { value: 'other', label: 'Something else' },
];

export const REPORT_DETAILS_MAX = 1000; // mirrors the reports.details check constraint

export async function blockUser(myId: string, otherId: string): Promise<void> {
  const { error } = await supabase.from('blocks').upsert(
    { blocker_id: myId, blocked_id: otherId },
    { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function unblockUser(myId: string, otherId: string): Promise<void> {
  const { error } = await supabase.from('blocks').delete().eq('blocker_id', myId).eq('blocked_id', otherId);
  if (error) throw error;
}

export async function reportUser(
  myId: string,
  otherId: string,
  category: Enums<'report_category_t'>,
  details: string,
): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: myId,
    reported_id: otherId,
    category,
    details: details.trim() || null,
  });
  if (error) throw error;
}

export type BlockedUser = { userId: string; name: string; blockedAt: string };

export async function fetchBlocked(): Promise<BlockedUser[]> {
  const { data, error } = await supabase.rpc('get_my_blocked_users');
  if (error) throw error;
  return data.map((b) => ({ userId: b.user_id, name: b.display_name, blockedAt: b.blocked_at }));
}

// Query keys that show other people; refreshed after a block or unblock.
export const PEOPLE_QUERY_KEYS = [['inbox'], ['meets-my-criteria'], ['blocked'], ['my-limits'], ['likes-count'], ['likes-received'],
  ['suggested'], ['suggested-count'], ['suggested-new'], ['daily-picks'], ['for-you-badge']];
