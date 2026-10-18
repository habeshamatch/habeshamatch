import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ModerationActions } from '@/components/ModerationActions';
import { requireAdmin } from '@/lib/auth';
import { ageFrom, dateTime, human } from '@/lib/format';
import { signPhotos } from '@/lib/photos';
import { createAdminClient } from '@/lib/supabase/admin';

// Per-admin, always live: never prerendered (see app/(panel)/layout.tsx).
export const instant = false;

// Everything about one member: profile, sign-in details, photos, reports and moderation history.
export default async function UserPage({ params }: PageProps<'/users/[id]'>) {
  await requireAdmin();
  const { id } = await params;
  const db = createAdminClient();

  const [profile, auth, photos, reportsAgainst, reportsBy, history, summary] = await Promise.all([
    db.from('profiles').select('*').eq('id', id).maybeSingle(),
    db.auth.admin.getUserById(id),
    db.from('photos').select('id, storage_path, position, moderation_status').eq('user_id', id).order('position'),
    db
      .from('reports')
      .select('id, category, details, status, created_at, reporter:profiles!reports_reporter_id_fkey(id, display_name)')
      .eq('reported_id', id)
      .order('created_at', { ascending: false }),
    db.from('reports').select('id', { count: 'exact', head: true }).eq('reporter_id', id),
    db.from('moderation_actions').select('id, action, reason, created_at, admin_id').eq('user_id', id).order('created_at', { ascending: false }),
    db.rpc('admin_search_users', { p_query: id, p_limit: 1 }),
  ]);
  if (profile.error) throw profile.error;
  if (!profile.data) notFound();
  const p = profile.data;
  const urls = await signPhotos((photos.data ?? []).map((ph) => ph.storage_path), 'thumb');
  const tier = summary.data?.[0]?.tier;

  const rows: [string, string | null | undefined][] = [
    ['Email', auth.data.user?.email],
    ['Phone', auth.data.user?.phone ? `+${auth.data.user.phone}` : null],
    ['Gender, age', `${p.gender}, ${ageFrom(p.date_of_birth)} (born ${p.date_of_birth})`],
    ['Origin', human(p.origin)],
    ['Lives in', [p.current_city, p.residence_country_code].filter(Boolean).join(', ')],
    ['Residence changed', dateTime(p.residence_changed_at)],
    ['Tier', tier],
    ['Premium until', p.premium_expires_at ? dateTime(p.premium_expires_at) : null],
    ['Verified (blue tick)', p.is_photo_verified ? 'Yes' : 'No'],
    ['Religion', human(p.religion)],
    ['Languages', p.languages.join(', ')],
    ['Looking for', human(p.relationship_intent)],
    ['Education', human(p.education_level)],
    ['Income', human(p.income_range)],
    ['Occupation', p.occupation],
    ['Marital status', human(p.marital_status)],
    ['Children', human(p.has_children)],
    ['Wants children', human(p.wants_children)],
    ['Smoking / drinking', [human(p.smoking), human(p.drinking)].filter(Boolean).join(' / ')],
    ['Height', p.height_cm ? `${p.height_cm} cm` : null],
    ['Joined', dateTime(p.created_at)],
    ['Last active', dateTime(p.last_active_at)],
    ['Last sign in', auth.data.user?.last_sign_in_at ? dateTime(auth.data.user.last_sign_in_at) : null],
    ['Reports they made', String(reportsBy.count ?? 0)],
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/users" className="text-sm text-accent">
          ← Users
        </Link>
        <h1 className="font-serif text-3xl">
          {p.display_name}
          {p.is_photo_verified && <span className="ml-2 text-verified">✓</span>}
        </h1>
        <p className="text-muted">{id}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            {(photos.data ?? []).map((ph) => (
              <div key={ph.id} className="w-32">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urls.get(ph.storage_path) ?? ''} alt="" className="aspect-[3/4] w-full rounded-lg bg-raised object-cover" />
                <p className={`text-xs ${ph.moderation_status === 'approved' ? 'text-muted' : 'text-rose'}`}>
                  {ph.position}. {ph.moderation_status}
                </p>
              </div>
            ))}
          </div>

          {p.bio && <p className="max-w-2xl whitespace-pre-wrap rounded-2xl bg-surface p-4">{p.bio}</p>}

          <dl className="grid max-w-2xl grid-cols-[180px_1fr] gap-x-4 gap-y-2 rounded-2xl bg-surface p-4 text-sm">
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Reports about {p.display_name}</h2>
            {(reportsAgainst.data ?? []).length === 0 && <p className="text-sm text-muted">None.</p>}
            {(reportsAgainst.data ?? []).map((r) => (
              <Link key={r.id} href={`/reports/${r.id}`} className="block rounded-xl bg-surface p-3 text-sm hover:bg-raised">
                <span className={r.status === 'open' ? 'text-rose' : 'text-muted'}>{r.status}</span> · {human(r.category)} by{' '}
                {r.reporter?.display_name ?? 'deleted member'} · {dateTime(r.created_at)}
                {r.details && <p className="text-muted">{r.details}</p>}
              </Link>
            ))}
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Moderation history</h2>
            {(history.data ?? []).length === 0 && <p className="text-sm text-muted">None.</p>}
            {(history.data ?? []).map((h) => (
              <p key={h.id} className="text-sm">
                <span className="text-accent">{human(h.action)}</span> · {dateTime(h.created_at)}
                {h.reason && <span className="text-muted"> · {h.reason}</span>}
              </p>
            ))}
          </section>
        </div>

        <ModerationActions userId={id} status={p.account_status} />
      </div>
    </div>
  );
}
