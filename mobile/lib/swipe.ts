import type { ProfileCard } from '@/lib/discover';
import { signPhotoUrls } from '@/lib/photos';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

// The swipe section ignores preferences except gender and age range, which must fit both ways
// (the database decides). Same country first, then same region type, then the rest.

export const DECK_SIZE = 20;

type CardRow = Database['public']['CompositeTypes']['profile_card'];

export type SwipeCard = Pick<ProfileCard, 'id' | 'name' | 'age' | 'city' | 'countryCode' | 'verified' | 'photoPath'> & {
  photoUrl: string | null; // full size: the card fills the screen
};

export async function fetchSwipeDeck(): Promise<SwipeCard[]> {
  const { data, error } = await supabase.rpc('get_swipe_deck', { p_limit: DECK_SIZE });
  if (error) throw error;
  const urls = await signPhotoUrls(
    data.map((r: CardRow) => r.primary_photo_path).filter((p): p is string => !!p),
    'full',
  );
  return data
    .filter((r: CardRow) => !!r.id)
    .map((r: CardRow) => ({
      id: r.id as string,
      name: r.display_name ?? '',
      age: r.age,
      city: r.current_city,
      countryCode: r.residence_country_code,
      verified: !!r.is_photo_verified,
      photoPath: r.primary_photo_path,
      photoUrl: r.primary_photo_path ? (urls.get(r.primary_photo_path) ?? null) : null,
    }));
}

export type SwipeResult = { matched: boolean; conversationId: string | null };

// Records a like or pass. A mutual like opens a chat that does not count toward the daily limit.
export async function recordSwipe(targetId: string, direction: 'like' | 'pass'): Promise<SwipeResult> {
  const { data, error } = await supabase.rpc('record_swipe', { p_target: targetId, p_direction: direction });
  if (error) throw error;
  const d = data as { matched?: boolean; conversation_id?: string };
  return { matched: !!d.matched, conversationId: d.conversation_id ?? null };
}
