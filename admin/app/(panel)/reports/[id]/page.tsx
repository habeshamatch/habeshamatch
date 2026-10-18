import Link from 'next/link';
import { notFound } from 'next/navigation';

import { resolveReport } from '@/app/(panel)/reports/actions';
import { requireAdmin } from '@/lib/auth';
import { ageFrom, dateTime, human } from '@/lib/format';
import { signPhotos } from '@/lib/photos';
import { createAdminClient } from '@/lib/supabase/admin';

// Per-admin, always live: never prerendered (see app/(panel)/layout.tsx).
export const instant = false;

const MESSAGE_LIMIT = 30;

// One report: both members, the reported member's photos and history, and their recent messages
// with each other, so harassment and scam reports can be judged in context.
export default async function ReportPage({ params }: PageProps<'/reports/[id]'>) {
  await requireAdmin();
  const { id } = await params;
  const db = createAdminClient();

  const { data: r, error } = await db.from('reports').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!r) notFound();

  const [a, b] = r.reporter_id < r.reported_id ? [r.reporter_id, r.reported_id] : [r.reported_id, r.reporter_id];
  const [reporter, reported, photos, otherReports, convo] = await Promise.all([
    db.from('profiles').select('id, display_name, date_of_birth, account_status').eq('id', r.reporter_id).maybeSingle(),
    db.from('profiles').select('id, display_name, date_of_birth, account_status, bio').eq('id', r.reported_id).maybeSingle(),
    db.from('photos').select('storage_path, moderation_status').eq('user_id', r.reported_id).order('position'),
    db.from('reports').select('id', { count: 'exact', head: true }).eq('reported_id', r.reported_id),
    db.from('conversations').select('id').eq('user_a', a).eq('user_b', b).maybeSingle(),
  ]);
  const messages = convo.data
    ? (
        await db
          .from('messages')
          .select('id, sender_id, body, created_at')
          .eq('conversation_id', convo.data.id)
          .order('created_at', { ascending: false })
          .limit(MESSAGE_LIMIT)
      ).data ?? []
    : [];
  const urls = await signPhotos((photos.data ?? []).map((p) => p.storage_path), 'thumb');
  const nameOf = (uid: string) => (uid === r.reporter_id ? reporter.data?.display_name : reported.data?.display_name) ?? 'deleted';

  const person = (label: string, p: typeof reporter.data) => (
    <div className="rounded-2xl bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      {p ? (
        <Link href={`/users/${p.id}`} className="text-lg text-accent">
          {p.display_name}, {ageFrom(p.date_of_birth)}
        </Link>
      ) : (
        <p>Deleted member</p>
      )}
      {p && p.account_status !== 'active' && <p className="text-sm text-rose">{p.account_status}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/reports" className="text-sm text-accent">
          ← Reports
        </Link>
        <h1 className="font-serif text-3xl">{human(r.category)}</h1>
        <p className="text-muted">
          {human(r.status)} · reported {dateTime(r.created_at)}
          {r.resolved_at && ` · resolved ${dateTime(r.resolved_at)}`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {person('Reported', reported.data)}
            {person('Reported by', reporter.data)}
          </div>
          {r.details && <p className="whitespace-pre-wrap rounded-2xl bg-surface p-4">{r.details}</p>}
          {r.action_taken && <p className="text-accent">Outcome: {r.action_taken}</p>}
          <p className="text-sm text-muted">
            {(otherReports.count ?? 1) - 1} other report{(otherReports.count ?? 1) - 1 === 1 ? '' : 's'} about this member.
          </p>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Photos of the reported member</h2>
            <div className="flex flex-wrap gap-3">
              {(photos.data ?? []).map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.storage_path} src={urls.get(p.storage_path) ?? ''} alt="" className="aspect-[3/4] w-28 rounded-lg bg-raised object-cover" />
              ))}
            </div>
            {reported.data?.bio && <p className="text-sm text-muted">Bio: {reported.data.bio}</p>}
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Their messages (latest {MESSAGE_LIMIT})</h2>
            {messages.length === 0 && <p className="text-sm text-muted">They have not messaged each other.</p>}
            <div className="space-y-1">
              {[...messages].reverse().map((m) => (
                <p key={m.id} className={`rounded-lg p-2 text-sm ${m.sender_id === r.reported_id ? 'bg-raised' : 'bg-surface'}`}>
                  <span className={m.sender_id === r.reported_id ? 'text-rose' : 'text-accent'}>{nameOf(m.sender_id)}</span>{' '}
                  <span className="text-muted">{dateTime(m.created_at)}</span>
                  <br />
                  {m.body}
                </p>
              ))}
            </div>
          </section>
        </div>

        {r.status === 'open' ? (
          <form action={resolveReport} className="h-fit space-y-3 rounded-2xl bg-surface p-5">
            <h2 className="text-lg font-semibold">Decision</h2>
            <input type="hidden" name="reportId" value={r.id} />
            <textarea name="note" placeholder="Note (optional, saved with the decision)" className="w-full rounded-lg bg-raised p-2 text-sm" rows={3} />
            <button name="outcome" value="dismiss" className="w-full rounded-full border border-muted py-2 text-muted">
              Dismiss: no action needed
            </button>
            <button name="outcome" value="warn" className="w-full rounded-full border border-accent py-2 text-accent">
              Warn {reported.data?.display_name ?? ''}
            </button>
            <button name="outcome" value="suspend" className="w-full rounded-full border border-rose py-2 text-rose">
              Suspend {reported.data?.display_name ?? ''}
            </button>
            <button name="outcome" value="ban" className="w-full rounded-full bg-rose py-2 font-semibold text-text">
              Ban {reported.data?.display_name ?? ''}
            </button>
            <p className="text-xs text-muted">Suspended and banned members cannot use the app and are hidden from everyone.</p>
          </form>
        ) : (
          <p className="h-fit rounded-2xl bg-surface p-5 text-sm text-muted">This report is closed.</p>
        )}
      </div>
    </div>
  );
}
