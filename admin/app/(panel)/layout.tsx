import Link from 'next/link';

import { signOut } from '@/app/(panel)/actions';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/photos', label: 'Photos', count: 'photos' as const },
  { href: '/reports', label: 'Reports', count: 'reports' as const },
  { href: '/verifications', label: 'Verifications', count: 'verifications' as const },
  { href: '/users', label: 'Users' },
];

// The whole panel is per-admin and always live (every request checks the admins table), so it is
// never prerendered or cached. See node_modules/next/dist/docs: authentication-with-cache-components.
export const instant = false;

// Every page in the panel: admin check, then the side navigation with queue sizes.
export default async function PanelLayout({ children }: LayoutProps<'/'>) {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const [photos, reports, verifications] = await Promise.all([
    db.from('photos').select('id', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
    db.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    db.from('verification_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  const counts = { photos: photos.count ?? 0, reports: reports.count ?? 0, verifications: verifications.count ?? 0 };

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-raised bg-surface p-4">
        <p className="mb-4 font-serif text-2xl text-accent">HabeshaMatch</p>
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-raised">
            <span>{item.label}</span>
            {item.count && counts[item.count] > 0 && (
              <span className="rounded-full bg-accent px-2 text-xs font-semibold text-background">{counts[item.count]}</span>
            )}
          </Link>
        ))}
        <div className="mt-auto space-y-2 text-sm text-muted">
          <p className="truncate">{admin.email}</p>
          <form action={signOut}>
            <button className="text-accent">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-8">{children}</main>
    </div>
  );
}
