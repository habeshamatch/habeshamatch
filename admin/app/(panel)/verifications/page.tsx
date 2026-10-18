import Link from 'next/link';

import { reviewVerification } from '@/app/(panel)/verifications/actions';
import { requireAdmin } from '@/lib/auth';
import { ageFrom, dateTime } from '@/lib/format';
import { signPhotos } from '@/lib/photos';
import { createAdminClient } from '@/lib/supabase/admin';

// Per-admin, always live: never prerendered (see app/(panel)/layout.tsx).
export const instant = false;

// Blue tick queue: compare each live selfie with the member's profile photos. The selfie flow in the
// app is Prompt 5.1; until then this queue stays empty.
export default async function VerificationsPage() {
  await requireAdmin();
  const db = createAdminClient();
  const { data: requests, error } = await db
    .from('verification_requests')
    .select('id, user_id, selfie_path, created_at, profiles(display_name, date_of_birth)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(30);
  if (error) throw error;

  const userIds = requests.map((r) => r.user_id);
  const { data: photos } = userIds.length
    ? await db.from('photos').select('user_id, storage_path').in('user_id', userIds).eq('moderation_status', 'approved').order('position')
    : { data: [] as { user_id: string; storage_path: string }[] };
  const photoUrls = await signPhotos((photos ?? []).map((p) => p.storage_path), 'thumb');
  const selfies = requests.length
    ? ((await db.storage.from('verifications').createSignedUrls(requests.map((r) => r.selfie_path), 3600)).data ?? [])
    : [];
  const selfieUrls = new Map(selfies.map((s) => [s.path, s.signedUrl]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Verifications</h1>
        <p className="text-muted">
          {requests.length === 0 ? 'Nothing to review. The selfie step in the app comes with Prompt 5.1.' : `${requests.length} waiting, oldest first.`}
        </p>
      </div>
      {requests.map((r) => (
        <div key={r.id} className="grid gap-4 rounded-2xl bg-surface p-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            <Link href={`/users/${r.user_id}`} className="text-lg text-accent">
              {r.profiles?.display_name ?? 'Member'}
              {r.profiles?.date_of_birth ? `, ${ageFrom(r.profiles.date_of_birth)}` : ''}
            </Link>
            <p className="text-sm text-muted">Sent {dateTime(r.created_at)}</p>
            <div className="flex flex-wrap gap-3">
              <figure className="w-40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selfieUrls.get(r.selfie_path) ?? ''} alt="" className="aspect-[3/4] w-full rounded-lg bg-raised object-cover ring-2 ring-accent" />
                <figcaption className="text-xs text-accent">Selfie</figcaption>
              </figure>
              {(photos ?? [])
                .filter((p) => p.user_id === r.user_id)
                .map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.storage_path} src={photoUrls.get(p.storage_path) ?? ''} alt="" className="aspect-[3/4] w-32 rounded-lg bg-raised object-cover" />
                ))}
            </div>
          </div>
          <form action={reviewVerification} className="space-y-2 self-end">
            <input type="hidden" name="requestId" value={r.id} />
            <input name="reason" placeholder="Reason (needed to reject)" className="w-full rounded-lg bg-raised px-3 py-2 text-sm" />
            <button name="decision" value="approve" className="w-full rounded-full bg-accent py-2 font-semibold text-background">
              Same person: verify
            </button>
            <button name="decision" value="reject" className="w-full rounded-full border border-rose py-2 text-rose">
              Reject
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
