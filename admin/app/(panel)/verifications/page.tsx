import Link from 'next/link';

import { reviewSubmission } from '@/app/(panel)/verifications/actions';
import { requireAdmin } from '@/lib/auth';
import { ageFrom, dateTime, human } from '@/lib/format';
import { signPhotos } from '@/lib/photos';
import { createAdminClient } from '@/lib/supabase/admin';

// Per-admin, always live: never prerendered (see app/(panel)/layout.tsx).
export const instant = false;

const REJECT_REASONS = [
  'The selfie does not match your photos.',
  'Your face is not clearly visible in the selfie.',
  'Please add clear photos of yourself (no group photos, filters or pictures of things).',
  'One or more photos break our guidelines. Please replace them.',
];

// New members wait here: check the live selfie matches their photos, then approve the
// member or reject with a reason they will see. Nobody can see or meet them until approved.
export default async function VerificationsPage() {
  await requireAdmin();
  const db = createAdminClient();
  const { data: requests, error } = await db
    .from('verification_requests')
    .select('id, user_id, selfie_path, created_at, profiles(display_name, date_of_birth, gender, residence_country_code, bio)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(30);
  if (error) throw error;

  const userIds = requests.map((r) => r.user_id);
  const { data: photos } = userIds.length
    ? await db.from('photos').select('id, user_id, storage_path, position, moderation_status').in('user_id', userIds).order('position')
    : { data: [] as { id: string; user_id: string; storage_path: string; position: number; moderation_status: string }[] };
  const photoUrls = await signPhotos((photos ?? []).map((p) => p.storage_path), 'full');
  const selfies = requests.length
    ? ((await db.storage.from('verifications').createSignedUrls(requests.map((r) => r.selfie_path), 3600)).data ?? [])
    : [];
  const selfieUrls = new Map(selfies.map((s) => [s.path, s.signedUrl]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">New members</h1>
        <p className="text-muted">
          {requests.length === 0
            ? 'Nothing to review. All caught up.'
            : `${requests.length} waiting, oldest first. Members are invisible and cannot meet anyone until approved.`}
        </p>
      </div>

      {requests.map((r) => {
        const own = (photos ?? []).filter((p) => p.user_id === r.user_id && p.moderation_status !== 'rejected');
        const p = r.profiles;
        return (
          <form key={r.id} action={reviewSubmission} className="space-y-4 rounded-2xl bg-surface p-5">
            <input type="hidden" name="requestId" value={r.id} />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/users/${r.user_id}`} className="text-xl text-accent">
                {p?.display_name ?? 'Member'}
                {p?.date_of_birth ? `, ${ageFrom(p.date_of_birth)}` : ''}
              </Link>
              <span className="text-sm text-muted">
                {human(p?.gender)} · {p?.residence_country_code} · sent {dateTime(r.created_at)}
              </span>
            </div>

            <div className="flex flex-wrap gap-4">
              <figure className="w-52 space-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selfieUrls.get(r.selfie_path) ?? ''} alt="Selfie" className="aspect-[3/4] w-full rounded-lg bg-raised object-cover ring-2 ring-accent" />
                <figcaption className="text-sm">
                  <span className="text-accent">Live selfie</span> <span className="text-muted">(taken in the app)</span>
                </figcaption>
              </figure>
              {own.map((ph) => (
                <figure key={ph.id} className="w-40 space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrls.get(ph.storage_path) ?? ''} alt="" className="aspect-[3/4] w-full rounded-lg bg-raised object-cover" />
                  <figcaption className="flex items-center justify-between text-xs text-muted">
                    <span>
                      Photo {ph.position} · {ph.moderation_status}
                    </span>
                    <label className="flex items-center gap-1 text-rose">
                      <input type="checkbox" name="rejectPhoto" value={ph.id} /> Problem
                    </label>
                  </figcaption>
                </figure>
              ))}
            </div>
            {p?.bio && <p className="text-sm text-muted">Bio: {p.bio}</p>}

            <div className="grid gap-3 border-t border-raised pt-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
              <label className="space-y-1 text-sm">
                <span className="text-muted">Reason (shown to the member if you reject)</span>
                <input name="reason" list={`reasons-${r.id}`} className="w-full rounded-lg bg-raised px-3 py-2" />
                <datalist id={`reasons-${r.id}`}>
                  {REJECT_REASONS.map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
              </label>
              <button name="decision" value="reject" className="rounded-full border border-rose px-6 py-2 text-rose">
                Reject
              </button>
              <button name="decision" value="approve" className="rounded-full bg-accent px-6 py-2 font-semibold text-background">
                Approve member
              </button>
            </div>
            <p className="text-xs text-muted">
              Approve verifies them (blue tick) and approves every photo not ticked as a problem. Ticked photos are rejected
              either way.
            </p>
          </form>
        );
      })}
    </div>
  );
}
