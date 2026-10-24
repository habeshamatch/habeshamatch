import { DISCOVER_PAGE_SIZE, toCard, type ProfileCard } from '@/lib/discover';
import { signPhotoUrls } from '@/lib/photos';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

// Premium features. The database checks the tier and raises premium_required for everyone else,
// so these are only called for Premium members (others see the paywall instead).

type CardRow = Database['public']['CompositeTypes']['profile_card'];

async function toCards(rows: CardRow[]): Promise<ProfileCard[]> {
  const urls = await signPhotoUrls(
    rows.map((r) => r.primary_photo_path).filter((p): p is string => !!p),
    'thumb',
  );
  return rows.map((r) => toCard(r, urls)).filter((c): c is ProfileCard => c !== null);
}

// Suggested: people whose must-haves you meet, but who don't meet all of yours.
export async function fetchSuggested(offset: number): Promise<ProfileCard[]> {
  const { data, error } = await supabase.rpc('get_suggested', { p_limit: DISCOVER_PAGE_SIZE, p_offset: offset });
  if (error) throw error;
  return toCards(data);
}

// How many people are in Suggested. A number only, so everyone sees it (the list is Premium).
export async function fetchSuggestedCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_suggested_count');
  if (error) throw error;
  return data;
}

// Today's picks (made once a day, or the first time they are opened that day).
export async function fetchDailyPicks(): Promise<ProfileCard[]> {
  const { data, error } = await supabase.rpc('get_daily_picks');
  if (error) throw error;
  return toCards(data);
}

// Takes back the last swipe. Returns who it was, or null if there was nothing to undo.
// A swipe that became a match cannot be undone (cannot_undo_match).
export async function undoLastSwipe(): Promise<string | null> {
  const { data, error } = await supabase.rpc('undo_last_swipe');
  if (error) throw error;
  return data;
}
