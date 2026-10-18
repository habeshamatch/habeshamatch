import { File } from 'expo-file-system';

import { compressPhoto } from '@/lib/photos';
import { supabase } from '@/lib/supabase';

// Every member is reviewed before they can take part: at least 2 photos plus a live selfie copying
// a random pose (so it can't be a downloaded picture). An admin compares them in the admin panel.

export const MIN_PHOTOS = 2; // mirrors enforce_verification_submit() in the database

export const POSES = [
  'Give a thumbs up',
  'Touch your ear',
  'Hold up two fingers',
  'Put your hand on your head',
  'Point at the camera',
  'Hold up three fingers',
  'Touch your chin',
  'Wave at the camera',
];

export const randomPose = () => POSES[Math.floor(Math.random() * POSES.length)];

// Uploads the selfie to the private verifications bucket and submits it for review.
export async function submitVerification(
  userId: string,
  selfie: { uri: string; width: number; height: number },
  pose: string,
): Promise<void> {
  const uri = await compressPhoto(selfie, 1080, 0.7);
  const path = `${userId}/${Date.now()}.jpg`;
  const bucket = supabase.storage.from('verifications');
  const upload = await bucket.upload(path, await new File(uri).arrayBuffer(), { contentType: 'image/jpeg' });
  if (upload.error) throw upload.error;
  const { error } = await supabase.from('verification_requests').insert({ user_id: userId, selfie_path: path, pose });
  if (error) {
    await bucket.remove([path]);
    throw error;
  }
}
