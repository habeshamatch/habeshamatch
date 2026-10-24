import { toCard, type ProfileCard } from '@/lib/discover';
import { signPhotoUrls } from '@/lib/photos';
import { supabase } from '@/lib/supabase';

// People who liked you and you have not swiped on yet. Everyone sees the count; only Premium
// can see who they are (the database raises premium_required for everyone else).

export async function fetchLikesCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_likes_received_count');
  if (error) throw error;
  return data;
}

// Full size for the Like back card stack, thumbnails for the grid on the For you tab.
export async function fetchLikesReceived(size: 'full' | 'thumb' = 'full'): Promise<ProfileCard[]> {
  const { data, error } = await supabase.rpc('get_likes_received', { p_limit: 50 });
  if (error) throw error;
  const urls = await signPhotoUrls(
    data.map((r) => r.primary_photo_path).filter((p): p is string => !!p),
    size,
  );
  return data.map((r) => toCard(r, urls)).filter((c): c is ProfileCard => c !== null);
}
