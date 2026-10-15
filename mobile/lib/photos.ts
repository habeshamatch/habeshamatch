import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';
import type { Enums } from '@/types/database';

export const MAX_PHOTOS = 6; // also enforced by photos.position (1..6) in the database
const MAX_DIMENSION = 1080;
const JPEG_QUALITY = 0.7;
const SIGNED_URL_SECONDS = 60 * 60;
const BUCKET = 'photos';

export type MyPhoto = {
  id: string;
  storagePath: string;
  position: number;
  status: Enums<'moderation_status_t'>;
  url: string | null; // short-lived signed URL (the bucket is private)
};

// The signed-in user's photos in display order, with signed URLs for viewing.
export async function fetchMyPhotos(userId: string): Promise<MyPhoto[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('id, storage_path, position, moderation_status')
    .eq('user_id', userId)
    .order('position');
  if (error) throw error;
  if (data.length === 0) return [];

  const signed = await supabase.storage.from(BUCKET).createSignedUrls(
    data.map((p) => p.storage_path),
    SIGNED_URL_SECONDS,
  );
  const urls = new Map((signed.data ?? []).map((s) => [s.path, s.signedUrl]));
  return data.map((p) => ({
    id: p.id,
    storagePath: p.storage_path,
    position: p.position,
    status: p.moderation_status,
    url: urls.get(p.storage_path) ?? null,
  }));
}

// Resize so the longest side is at most 1080px and re-encode as ~70% JPEG. Re-encoding also drops
// EXIF metadata such as GPS location. Returns the local URI of the compressed file.
async function compressPhoto(asset: { uri: string; width: number; height: number }): Promise<string> {
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_DIMENSION) {
    context.resize(asset.width >= asset.height ? { width: MAX_DIMENSION, height: null } : { width: null, height: MAX_DIMENSION });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return result.uri;
}

// Compress, upload to {user_id}/..., then record it. New photos are always 'pending' until an
// admin approves them; until then only the owner can see them.
export async function addPhoto(
  userId: string,
  asset: { uri: string; width: number; height: number },
  position: number,
): Promise<void> {
  const uri = await compressPhoto(asset);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const bytes = await new File(uri).arrayBuffer();

  const upload = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg' });
  if (upload.error) throw upload.error;

  const { error } = await supabase.from('photos').insert({ user_id: userId, storage_path: path, position });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]); // don't leave an orphaned file
    throw error;
  }
}

// Saves a new order. Pass every photo id; the first becomes the main photo.
export async function reorderPhotos(orderedIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_my_photos', { p_photo_ids: orderedIds });
  if (error) throw error;
}

// Deletes the record, then the file, then closes the gap in positions.
export async function deletePhoto(photo: MyPhoto, remainingIdsInOrder: string[]): Promise<void> {
  const { error } = await supabase.from('photos').delete().eq('id', photo.id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([photo.storagePath]);
  if (remainingIdsInOrder.length > 0) await reorderPhotos(remainingIdsInOrder);
}
