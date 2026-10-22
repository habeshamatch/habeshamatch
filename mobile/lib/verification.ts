import { File } from 'expo-file-system';

import { compressPhoto } from '@/lib/photos';
import { supabase } from '@/lib/supabase';

// Every member is reviewed before they can take part: at least 2 photos plus a live selfie taken
// with the camera (never the gallery). An admin checks the selfie matches the photos.

export const MIN_PHOTOS = 2; // mirrors enforce_verification_submit() in the database

// Uploads the selfie to the private verifications bucket and submits it for review.
export async function submitVerification(
  userId: string,
  selfie: { uri: string; width: number; height: number },
): Promise<void> {
  const uri = await compressPhoto(selfie, 1080, 0.7);
  const path = `${userId}/${Date.now()}.jpg`;
  const bucket = supabase.storage.from('verifications');
  const upload = await bucket.upload(path, await new File(uri).arrayBuffer(), { contentType: 'image/jpeg' });
  if (upload.error) throw upload.error;
  const { error } = await supabase.from('verification_requests').insert({ user_id: userId, selfie_path: path });
  if (error) {
    await bucket.remove([path]);
    throw error;
  }
}
