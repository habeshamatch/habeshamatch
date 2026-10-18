import Link from 'next/link';

import { requireAdmin } from '@/lib/auth';
import type { Database } from '@/lib/database.types';
import { dateTime, human } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';

// Per-admin, always live: never prerendered (see app/(panel)/layout.tsx).
export const instant = false;

type Status = Database['public']['Enums']['report_status_t'];
type Category = Database['public']['Enums']['report_category_t'];
const STATUSES: Status[] = ['open', 'actioned', 'dismissed'];
const CATEGORIES: Category[] = ['fake_profile', 'scam', 'harassment', 'spam', 'inappropriate_photos', 'underage', 'other'];

// Reports queue: open reports oldest first by default; filter by status and category.
export default async function ReportsPage({ searchParams }: PageProps<'/reports'>) {
  await requireAdmin();
  const sp = await searchParams;
  const status = (STATUSES.includes(sp.status as Status) ? sp.status : 'open') as Status;
  const category = CATEGORIES.includes(sp.category as Category) ? (sp.category as Category) : null;

  let query = createAdminClient()
    .from('reports')
    .select(
      'id, category, details, status, created_at, action_taken, reporter:profiles!reports_reporter_id_fkey(id, display_name), reported:profiles!reports_reported_id_fkey(id, display_name, account_status)',
    )
    .eq('status', status)
    .order('created_at', { ascending: status === 'open' })
    .limit(100);
  if (category) query = query.eq('category', category);
  const { data: reports, error } = await query;
  if (error) throw error;

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm ${active ? 'bg-accent text-background' : 'bg-surface hover:bg-raised'}`;
  const href = (s: Status, c: Category | null) => `/reports?status=${s}${c ? `&category=${c}` : ''}`;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">Reports</h1>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link key={s} href={href(s, category)} className={chip(s === status)}>
            {human(s)}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={href(status, null)} className={chip(!category)}>
          All categories
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c} href={href(status, c)} className={chip(c === category)}>
            {human(c)}
          </Link>
        ))}
      </div>

      {reports.length === 0 && <p className="text-muted">No {status} reports{category ? ` for ${human(category)}` : ''}.</p>}
      <div className="space-y-2">
        {reports.map((r) => (
          <Link key={r.id} href={`/reports/${r.id}`} className="block rounded-xl bg-surface p-4 hover:bg-raised">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p>
                <span className="font-semibold text-rose">{human(r.category)}</span>
                {' · '}
                {r.reported?.display_name ?? 'deleted member'}
                {r.reported && r.reported.account_status !== 'active' && (
                  <span className="text-muted"> ({r.reported.account_status})</span>
                )}
                <span className="text-muted"> reported by {r.reporter?.display_name ?? 'deleted member'}</span>
              </p>
              <p className="text-sm text-muted">{dateTime(r.created_at)}</p>
            </div>
            {r.details && <p className="mt-1 line-clamp-2 text-sm text-muted">{r.details}</p>}
            {r.action_taken && <p className="mt-1 text-sm text-accent">{r.action_taken}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
