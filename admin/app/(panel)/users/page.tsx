import Link from 'next/link';

import { requireAdmin } from '@/lib/auth';
import { dateTime } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';

// Per-admin, always live: never prerendered (see app/(panel)/layout.tsx).
export const instant = false;

// Members, newest first. Search by name, email, phone or id.
export default async function UsersPage({ searchParams }: PageProps<'/users'>) {
  await requireAdmin();
  const q = String((await searchParams).q ?? '').trim();
  const { data: users, error } = await createAdminClient().rpc('admin_search_users', { p_query: q, p_limit: 100 });
  if (error) throw error;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">Users</h1>
      <form className="flex max-w-xl gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Name, email, phone or id"
          className="flex-1 rounded-lg bg-surface px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
        />
        <button className="rounded-full bg-accent px-5 font-semibold text-background">Search</button>
      </form>
      <p className="text-sm text-muted">
        {users.length} shown{users.length === 100 ? ' (first 100)' : ''}
      </p>
      <table className="w-full text-left text-sm">
        <thead className="text-muted">
          <tr>
            {['Name', 'Email / phone', 'Gender, age', 'Lives', 'Tier', 'Status', 'Open reports', 'Joined', 'Last active'].map(
              (h) => (
                <th key={h} className="px-3 py-2 font-normal">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.user_id} className="border-t border-raised hover:bg-surface">
              <td className="px-3 py-2">
                <Link href={`/users/${u.user_id}`} className="text-accent">
                  {u.display_name}
                </Link>
                {u.is_photo_verified && <span className="ml-1 text-verified">✓</span>}
              </td>
              <td className="px-3 py-2 text-muted">{u.email || (u.phone ? `+${u.phone}` : '')}</td>
              <td className="px-3 py-2">
                {u.gender}, {u.age}
              </td>
              <td className="px-3 py-2">{u.residence}</td>
              <td className="px-3 py-2">{u.tier}</td>
              <td className={`px-3 py-2 ${u.account_status === 'active' ? '' : 'text-rose'}`}>{u.account_status}</td>
              <td className={`px-3 py-2 ${u.open_reports > 0 ? 'text-rose' : 'text-muted'}`}>{u.open_reports}</td>
              <td className="px-3 py-2 text-muted">{dateTime(u.created_at)}</td>
              <td className="px-3 py-2 text-muted">{dateTime(u.last_active_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
