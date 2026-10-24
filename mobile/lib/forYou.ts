import { secureStorage } from '@/lib/secureStorage';
import { supabase } from '@/lib/supabase';

// The For you tab badge counts only what is NEW since the member last opened the tab (new likes,
// people new to Suggested, and today's picks until opened that day), then clears, like unread
// messages. When they last looked is remembered on this phone only.

export type ForYouSeen = { at: string | null; picksDate: string | null }; // ISO time, YYYY-MM-DD

const key = (userId: string) => `for_you_seen_${userId}`;
const today = () => new Date().toISOString().slice(0, 10); // UTC, the day picks are made for

export async function loadForYouSeen(userId: string): Promise<ForYouSeen> {
  try {
    const raw = await secureStorage.getItem(key(userId));
    if (raw) return JSON.parse(raw) as ForYouSeen;
  } catch {
    // unreadable: treat as never opened
  }
  return { at: null, picksDate: null };
}

export async function saveForYouSeen(userId: string): Promise<ForYouSeen> {
  const seen = { at: new Date().toISOString(), picksDate: today() };
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
