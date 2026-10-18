'use server';

import { revalidatePath } from 'next/cache';

import { logAction } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const OUTCOMES = {
  dismiss: { reportStatus: 'dismissed', accountStatus: null, log: 'dismiss_report' },
  warn: { reportStatus: 'actioned', accountStatus: null, log: 'warn' },
  suspend: { reportStatus: 'actioned', accountStatus: 'suspended', log: 'suspend' },
  ban: { reportStatus: 'actioned', accountStatus: 'banned', log: 'ban' },
} as const;

// Closes a report: dismiss it, or warn / suspend / ban the reported member. The outcome is stored
// on the report (who, when, what) and in the moderation log.
export async function resolveReport(formData: FormData) {
  const admin = await requireAdmin();
  const reportId = String(formData.get('reportId'));
  const outcome = OUTCOMES[String(formData.get('outcome')) as keyof typeof OUTCOMES];
  if (!outcome) throw new Error('Unknown outcome');
  const note = String(formData.get('note') ?? '').trim();
  const db = createAdminClient();

  const { data: report, error } = await db.from('reports').select('reported_id, category').eq('id', reportId).single();
  if (error) throw error;

  if (outcome.accountStatus) {
    const { error: e } = await db.from('profiles').update({ account_status: outcome.accountStatus }).eq('id', report.reported_id);
    if (e) throw e;
  }
  const { error: e2 } = await db
    .from('reports')
    .update({
      status: outcome.reportStatus,
      action_taken: [outcome.log, note].filter(Boolean).join(': '),
      resolved_by: admin.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', reportId);
  if (e2) throw e2;
  await logAction(admin.id, report.reported_id, outcome.log, note || `Report ${reportId} (${report.category})`);
  revalidatePath(`/reports/${reportId}`);
  revalidatePath('/reports');
}
