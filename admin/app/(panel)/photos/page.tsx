import { moderatePhoto } from '@/app/(panel)/photos/actions';
import { requireAdmin } from '@/lib/auth';
import { ageFrom } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';

// Per-admin, always live: never prerendered (see app/(panel)/layout.tsx).
export const instant = false;

const REJECT_REASONS = [
  'Face not clearly visible',
  'Not a real photo of a person',
  'Nudity or sexual content',
  'Contains contact details or ads',
  'Appears to be someone else',
  'Appears under 18',
  'Low quality',
];

// Photo queue for photos that APPROVED members add later: oldest first. New members' photos are
// reviewed together with their selfie on the New members page. Pending photos are invisible.
export default async function PhotosPage() {
  await requireAdmin();
  const db = createAdminClient();
  const { data: photos, error } = await db
    .from('photos')
    .select('id, storage_path, position, created_at, user_id, profiles!inner(display_name, date_of_birth, gender, residence_country_code, is_photo_verified)')
    .eq('moderation_status', 'pending')
    .eq('profiles.is_photo_verified', true) // new members' photos are reviewed with their selfie under New members
    .order('created_at', { ascending: true })
    .limit(60);
  if (error) throw error;

  const signed = photos.length
    ? (await db.storage.from('photos').createSignedUrls(photos.map((p) => p.storage_path), 60 * 60)).data ?? []
    : [];
  const urls = new Map(signed.map((s) => [s.path, s.signedUrl]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Photo queue</h1>
        <p className="text-muted">
          {photos.length === 0
            ? 'Nothing to review. New members are reviewed under New members.'
            : `${photos.length} new photos from existing members, oldest first.`}
        </p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {photos.map((p) => {
          const owner = p.profiles;
          return (
            <div key={p.id} className="overflow-hidden rounded-2xl bg-surface">
              {/* Signed URLs are short-lived and private, so a plain img is used rather than next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls.get(p.storage_path) ?? ''} alt="" className="aspect-[3/4] w-full bg-raised object-cover" />
              <div className="space-y-3 p-4">
                <div>
                  <p className="font-semibold">
                    {owner?.display_name ?? 'Unknown'}
                    {owner?.date_of_birth ? `, ${ageFrom(owner.date_of_birth)}` : ''}
                  </p>
                  <p className="text-sm text-muted">
                    Photo {p.position} · {owner?.gender ?? ''} · {owner?.residence_country_code ?? ''} ·{' '}
                    {new Date(p.created_at).toLocaleString()}
                  </p>
                </div>
                <form action={moderatePhoto} className="flex gap-2">
                  <input type="hidden" name="photoId" value={p.id} />
                  <button name="decision" value="approve" className="flex-1 rounded-full bg-accent py-2 font-semibold text-background">
                    Approve
                  </button>
                </form>
                <form action={moderatePhoto} className="space-y-2">
                  <input type="hidden" name="photoId" value={p.id} />
                  <select name="reason" required defaultValue="" className="w-full rounded-lg bg-raised px-2 py-2 text-sm">
                    <option value="" disabled>
                      Reason to reject...
                    </option>
                    {REJECT_REASONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                  <button name="decision" value="reject" className="w-full rounded-full border border-rose py-2 text-rose">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
