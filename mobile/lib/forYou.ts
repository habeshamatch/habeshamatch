import { secureStorage } from '@/lib/secureStorage';
import { supabase } from '@/lib/supabase';

// The For you tab badge counts only what is NEW since the member last opened the tab (new likes,
// people new to Suggested, and today's picks until opened that day), then clears, like unread
// messages. When they last looked is remembered on this phone only.

// at: when the tab was last opened; picksDate: the day today's picks were seen (YYYY-MM-DD);
// suggestedAt: when the Suggested section was last opened (its own "new" badge).
export type ForYouSeen = { at: string | null; picksDate: string | null; suggestedAt: string | null };

const key = (userId: string) => `for_you_seen_${userId}`;
const today = () => new Date().toISOString().slice(0, 10); // UTC, the day picks are made for

export async function loadForYouSeen(userId: string): Promise<ForYouSeen> {
  try {
    const raw = await secureStorage.getItem(key(userId));
    if (raw) return { at: null, picksDate: null, suggestedAt: null, ...(JSON.parse(raw) as Partial<ForYouSeen>) };
  } catch {
    // unreadable: treat as never opened
  }
  return { at: null, picksDate: null, suggestedAt: null };
}

// Records that the tab was opened (and, with `suggested`, the Suggested section too).
export async function saveForYouSeen(userId: string, suggested = false): Promise<ForYouSeen> {
  const now = new Date().toISOString();
  const previous = await loadForYouSeen(userId);
  const seen = { at: now, picksDate: today(), suggestedAt: suggested ? now : previous.suggestedAt };
  try {
    await secureStorage.setItem(key(userId), JSON.stringify(seen));
  } catch {
    // The badge is a convenience; never fail because of it.
  }
  return seen;
}

// Total for the tab badge.
export async function fetchForYouBadge(seen: ForYouSeen): Promise<number> {
  const { data, error } = await supabase.rpc('get_for_you_new_counts', { p_since: seen.at ?? undefined });
  if (error) throw error;
  const d = data as { likes?: number; suggested?: number; picks?: number };
  const picks = seen.picksDate === today() ? 0 : (d.picks ?? 0);
  return (d.likes ?? 0) + (d.suggested ?? 0) + picks;
}
