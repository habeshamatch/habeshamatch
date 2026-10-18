import Link from 'next/link';

import { DailyBars } from '@/components/DailyBars';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

// Per-admin, always live: never prerendered (see app/(panel)/layout.tsx).
export const instant = false;

type Stats = {
  total_users: number;
  active_7d: number;
  active_30d: number;
  suspended: number;
  banned: number;
  verified: number;
  tiers: Record<string, number> | null;
  signups_1d: number;
  signups_7d: number;
  signups_30d: number;
  signups_daily: { day: string; n: number }[];
  messages_daily: { day: string; n: number }[];
  matches_7d: number;
  chats_7d: number;
  pending_photos: number;
  open_reports: number;
  pending_verifications: number;
};

function Tile({ label, value, hint, href }: { label: string; value: number; hint?: string; href?: '/photos' | '/reports' | '/verifications' }) {
  const body = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className="font-serif text-3xl">{value.toLocaleString()}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="rounded-2xl bg-surface p-5 hover:bg-raised">
      {body}
    </Link>
  ) : (
    <div className="rounded-2xl bg-surface p-5">{body}</div>
  );
}

export default async function Dashboard() {
  await requireAdmin();
  const { data, error } = await createAdminClient().rpc('admin_stats');
  if (error) throw error;
  const s = data as unknown as Stats;
  const tiers = s.tiers ?? {};

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl">Dashboard</h1>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-muted">Needs attention</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Tile label="New members to review" value={s.pending_verifications} href="/verifications" />
          <Tile label="Open reports" value={s.open_reports} href="/reports" />
          <Tile label="Photos waiting (all)" value={s.pending_photos} href="/photos" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-muted">Members</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Total members" value={s.total_users} hint={`${s.verified} verified`} />
          <Tile label="Active, last 7 days" value={s.active_7d} hint={`${s.active_30d} in the last 30 days`} />
          <Tile label="New, last 7 days" value={s.signups_7d} hint={`${s.signups_1d} today · ${s.signups_30d} in 30 days`} />
          <Tile label="Suspended or banned" value={s.suspended + s.banned} hint={`${s.suspended} suspended · ${s.banned} banned`} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Tile label="Free (abroad)" value={tiers.free ?? 0} hint="Active members" />
          <Tile label="Local" value={tiers.local ?? 0} hint="Active members" />
          <Tile label="Premium" value={tiers.premium ?? 0} hint="Active members" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-muted">Activity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Tile label="New chats, last 7 days" value={s.chats_7d} />
          <Tile label="Swipe matches, last 7 days" value={s.matches_7d} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <DailyBars title="New members per day" data={s.signups_daily} />
          <DailyBars title="Messages per day" data={s.messages_daily} />
        </div>
      </section>
    </div>
  );
}
