import { changeAccountStatus, deleteUserAccount, warnUser } from '@/app/(panel)/users/actions';
import type { Database } from '@/lib/database.types';

type Status = Database['public']['Enums']['account_status_t'];

const field = 'w-full rounded-lg bg-raised px-3 py-2 text-sm';

// Warn, suspend, ban, reactivate or delete a member. Every action needs a reason and is logged.
export function ModerationActions({ userId, status }: { userId: string; status: Status }) {
  return (
    <div className="space-y-4 rounded-2xl bg-surface p-5">
      <h2 className="text-lg font-semibold">Actions</h2>
      <p className="text-sm text-muted">
        Status: <span className={status === 'active' ? 'text-accent' : 'text-rose'}>{status}</span>
      </p>

      <form action={warnUser} className="space-y-2">
        <input type="hidden" name="userId" value={userId} />
        <input name="reason" required placeholder="Warning reason" className={field} />
        <button className="w-full rounded-full border border-accent py-2 text-accent">Warn</button>
      </form>

      <form action={changeAccountStatus} className="space-y-2">
        <input type="hidden" name="userId" value={userId} />
        <input name="reason" required placeholder="Reason" className={field} />
        <div className="flex gap-2">
          {status !== 'suspended' && (
            <button name="status" value="suspended" className="flex-1 rounded-full border border-rose py-2 text-rose">
              Suspend
            </button>
          )}
          {status !== 'banned' && (
            <button name="status" value="banned" className="flex-1 rounded-full bg-rose py-2 font-semibold text-text">
              Ban
            </button>
          )}
          {status !== 'active' && (
            <button name="status" value="active" className="flex-1 rounded-full bg-accent py-2 font-semibold text-background">
              Reactivate
            </button>
          )}
        </div>
      </form>

      <form action={deleteUserAccount} className="space-y-2 border-t border-raised pt-4">
        <input type="hidden" name="userId" value={userId} />
        <input name="reason" required placeholder="Reason for deleting" className={field} />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="confirm" value="yes" required /> Permanently delete this account. This cannot be
          undone.
        </label>
        <button className="w-full rounded-full bg-rose py-2 font-semibold text-text">Delete account</button>
      </form>
    </div>
  );
}
