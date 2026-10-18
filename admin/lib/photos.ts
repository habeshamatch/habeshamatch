import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

const thumbPath = (p: string) => p.replace(/\.jpg$/, '.thumb.jpg');

// Signed URLs for private photos (one hour). 'thumb' falls back to the full photo for uploads
// that have no thumbnail. Keyed by the original storage path.
export async function signPhotos(paths: string[], size: 'thumb' | 'full'): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (paths.length === 0) return result;
  const bucket = createAdminClient().storage.from('photos');
  if (size === 'thumb') {
    const { data } = await bucket.createSignedUrls(paths.map(thumbPath), 3600);
    paths.forEach((p, i) => {
      const url = data?.[i]?.signedUrl;
      if (url) result.set(p, url);
    });
  }
  const missing = paths.filter((p) => !result.has(p));
  if (missing.length) {
    const { data } = await bucket.createSignedUrls(missing, 3600);
    missing.forEach((p, i) => {
      const url = data?.[i]?.signedUrl;
      if (url) result.set(p, url);
    });
  }
  return result;
}
