import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';
import type { Enums } from '@/types/database';

export const MAX_PHOTOS = 6; // also enforced by photos.position (1..6) in the database
const MAX_DIMENSION = 1080;
const JPEG_QUALITY = 0.7;
// Small copy for lists (Discover, inbox) to save mobile data.
const THUMB_DIMENSION = 400;
const THUMB_QUALITY = 0.6;
const SIGNED_URL_SECONDS = 60 * 60;
const BUCKET = 'photos';

export type MyPhoto = {
  id: string;
  storagePath: string;
  position: number;
  status: Enums<'moderation_status_t'>;
  url: string | null; // short-lived signed URL (the bucket is private)
};

// {user}/abc.jpg -> {user}/abc.thumb.jpg. Mirrors photo_thumb_path() in the database.
export function thumbPath(storagePath: string): string {
  return storagePath.replace(/\.jpg$/, '.thumb.jpg');
}

// Signed URLs for photos (the bucket is private), keyed by the storage path passed in.
// With 'thumb', loads the small copy and falls back to the full photo for older uploads without one.
export async function signPhotoUrls(paths: string[], size: 'thumb' | 'full'): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  const result = new Map<string, string>();
  if (unique.length === 0) return result;
  const bucket = supabase.storage.from(BUCKET);

  if (size === 'thumb') {
    const thumbs = await bucket.createSignedUrls(unique.map(thumbPath), SIGNED_URL_SECONDS);
    unique.forEach((p, i) => {
      const url = thumbs.data?.[i]?.signedUrl;
      if (url) result.set(p, url);
    });
  }
  const missing = unique.filter((p) => !result.has(p));
  if (missing.length > 0) {
    const full = await bucket.createSignedUrls(missing, SIGNED_URL_SECONDS);
    missing.forEach((p, i) => {
      const url = full.data?.[i]?.signedUrl;
      if (url) result.set(p, url);
    });
  }
  return result;
}

// The signed-in user's photos in display order, with signed URLs for viewing.
export async function fetchMyPhotos(userId: string): Promise<MyPhoto[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('id, storage_path, position, moderation_status')
    .eq('user_id', userId)
    .order('position');
  if (error) throw error;
  if (data.length === 0) return [];

  const urls = await signPhotoUrls(
    data.map((p) => p.storage_path),
    'thumb',
  );
  return data.map((p) => ({
    id: p.id,
    storagePath: p.storage_path,
    position: p.position,
    status: p.moderation_status,
    url: urls.get(p.storage_path) ?? null,
  }));
}

// Resize so the longest side is at most maxDimension and re-encode as JPEG. Re-encoding also drops
// EXIF metadata such as GPS location. Returns the local URI of the compressed file.
export async function compressPhoto(
  asset: { uri: string; width: number; height: number },
  maxDimension: number,
  quality: number,
): Promise<string> {
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > maxDimension) {
    context.resize(asset.width >= asset.height ? { width: maxDimension, height: null } : { width: null, height: maxDimension });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: quality, format: SaveFormat.JPEG });
  return result.uri;
}

// Compress, upload to {user_id}/..., then record it. New photos are always 'pending' until an
// admin approves them; until then only the owner can see them.
export async function addPhoto(
  userId: string,
  asset: { uri: string; width: number; height: number },
  position: number,
): Promise<void> {
  const [fullUri, thumbUri] = await Promise.all([
    compressPhoto(asset, MAX_DIMENSION, JPEG_QUALITY),
    compressPhoto(asset, THUMB_DIMENSION, THUMB_QUALITY),
  ]);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const bucket = supabase.storage.from(BUCKET);
  const removeFiles = () => bucket.remove([path, thumbPath(path)]); // don't leave orphaned files

  const upload = await bucket.upload(path, await new File(fullUri).arrayBuffer(), { contentType: 'image/jpeg' });
  if (upload.error) throw upload.error;
  const thumb = await bucket.upload(thumbPath(path), await new File(thumbUri).arrayBuffer(), {
    contentType: 'image/jpeg',
  });
  if (thumb.error) {
    await removeFiles();
    throw thumb.error;
  }

  const { error } = await supabase.from('photos').insert({ user_id: userId, storage_path: path, position });
  if (error) {
    await removeFiles();
    throw error;
  }
}

// Saves a new order. Pass every photo id; the first becomes the main photo.
export async function reorderPhotos(orderedIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_my_photos', { p_photo_ids: orderedIds });
  if (error) throw error;
}

// Deletes the record, then the photo and its thumbnail, then closes the gap in positions.
export async function deletePhoto(photo: MyPhoto, remainingIdsInOrder: string[]): Promise<void> {
  const { error } = await supabase.from('photos').delete().eq('id', photo.id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([photo.storagePath, thumbPath(photo.storagePath)]);
  if (remainingIdsInOrder.length > 0) await reorderPhotos(remainingIdsInOrder);
}
