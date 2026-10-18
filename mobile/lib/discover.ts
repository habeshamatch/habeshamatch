import { signPhotoUrls } from '@/lib/photos';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

// A profile as other members see it (profile_card from the database: age, never date of birth).
type CardRow = Database['public']['CompositeTypes']['profile_card'];

export type ProfileCard = {
  id: string;
  name: string;
  age: number | null;
  city: string | null;
  countryCode: string | null;
  origin: CardRow['origin'];
  heightCm: number | null;
  religion: CardRow['religion'];
  languages: string[];
  intent: CardRow['relationship_intent'];
  bio: string | null;
  openToRelocating: boolean;
  openToLongDistance: boolean;
  verified: boolean;
  matchPercent: number | null; // share of your nice-to-haves they meet; null when not applicable
  maritalStatus: CardRow['marital_status'];
  hasChildren: CardRow['has_children'];
  wantsChildren: CardRow['wants_children'];
  smoking: CardRow['smoking'];
  drinking: CardRow['drinking'];
  exercise: CardRow['exercise'];
  occupation: string | null;
  interests: string[];
  photoPath: string | null;
  photoUrl: string | null; // signed URL (thumbnail in lists, full photo on the profile page)
};

export const DISCOVER_PAGE_SIZE = 20;

export function toCard(row: CardRow, urls: Map<string, string>): ProfileCard | null {
  if (!row.id) return null;
  return {
    id: row.id,
    name: row.display_name ?? '',
    age: row.age,
    city: row.current_city,
    countryCode: row.residence_country_code,
    origin: row.origin,
    heightCm: row.height_cm,
    religion: row.religion,
    languages: row.languages ?? [],
    intent: row.relationship_intent,
    bio: row.bio,
    openToRelocating: !!row.open_to_relocating,
    openToLongDistance: !!row.open_to_long_distance,
    verified: !!row.is_photo_verified,
    matchPercent: row.match_score,
    maritalStatus: row.marital_status,
    hasChildren: row.has_children,
    wantsChildren: row.wants_children,
    smoking: row.smoking,
    drinking: row.drinking,
    exercise: row.exercise,
    occupation: row.occupation,
    interests: row.interests ?? [],
    photoPath: row.primary_photo_path,
    photoUrl: row.primary_photo_path ? (urls.get(row.primary_photo_path) ?? null) : null,
  };
}

// One page of Meets My Criteria. The database applies every rule (both sides' must-haves,
// blocks, approved photos) and ranks by nice-to-haves; the app only displays it.
export async function fetchMeetsMyCriteria(offset: number): Promise<ProfileCard[]> {
  const { data, error } = await supabase.rpc('get_meets_my_criteria', {
    p_limit: DISCOVER_PAGE_SIZE,
    p_offset: offset,
  });
  if (error) throw error;
  const urls = await signPhotoUrls(
    data.map((r) => r.primary_photo_path).filter((p): p is string => !!p),
    'thumb',
  );
  return data.map((r) => toCard(r, urls)).filter((c): c is ProfileCard => c !== null);
}

export type FullProfile = ProfileCard & { photoUrls: string[] };

// Someone's public profile (get_profile) with all their approved photos, full size.
export async function fetchProfile(userId: string): Promise<FullProfile> {
  const [card, photos] = await Promise.all([
    supabase.rpc('get_profile', { p_user: userId }),
    // Row level security only returns approved photos of people you can see.
    supabase
      .from('photos')
      .select('storage_path')
      .eq('user_id', userId)
      .eq('moderation_status', 'approved')
      .order('position'),
  ]);
  if (card.error) throw card.error;
  if (photos.error) throw photos.error;
  const paths = photos.data.map((p) => p.storage_path);
  const urls = await signPhotoUrls(paths, 'full');
  const base = toCard(card.data, urls);
  if (!base) throw new Error('not_found');
  return { ...base, photoUrls: paths.map((p) => urls.get(p)).filter((u): u is string => !!u) };
}

// Whether the user has any must-haves, to tailor the empty state.
export async function countMyMustHaves(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('preference_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', 'hard');
  if (error) throw error;
  return count ?? 0;
}
