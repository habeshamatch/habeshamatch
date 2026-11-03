// RevenueCat webhook: keeps profiles.is_premium / premium_expires_at in step with subscriptions.
// This is the ONLY thing that ever sets Premium on the live project.
//
// Security: RevenueCat sends the Authorization header we configured in its dashboard; anything
// else is rejected. The platform's JWT check is off for this function (verify_jwt = false in
// config.toml, --no-verify-jwt when deploying) because RevenueCat has no Supabase login.
//
// Reliability: we do not trust the event's details on their own (events can arrive late, twice
// or out of order). For every member an event mentions, we ask RevenueCat for their CURRENT
// subscriber state and write that. Members are known by their Supabase user id (the app logs in
// to RevenueCat with it); anonymous RevenueCat ids are ignored.
//
// Secrets (Supabase > Edge Functions > Secrets, or supabase/functions/.env locally):
//   REVENUECAT_WEBHOOK_AUTH  the exact Authorization header value set in RevenueCat
//   REVENUECAT_SECRET_KEY    a RevenueCat secret API key (V1), to read subscriber state
import { createClient } from 'npm:@supabase/supabase-js@2';

const ENTITLEMENT = 'premium';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RcEvent = {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
};

type Entitlement = { expires_date: string | null; grace_period_expires_date?: string | null };

// Constant-time comparison, so the secret cannot be guessed from response times.
function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

// Premium state right now, from RevenueCat. expiresAt null with active = true means no end date.
async function currentPremium(userId: string, secretKey: string): Promise<{ active: boolean; expiresAt: string | null }> {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`revenuecat_${res.status}`);
  const body = await res.json();
  const ent: Entitlement | undefined = body?.subscriber?.entitlements?.[ENTITLEMENT];
  if (!ent) return { active: false, expiresAt: null };
  // A billing problem keeps Premium during Apple's grace period.
  const ends = [ent.expires_date, ent.grace_period_expires_date].filter((d): d is string => !!d);
  if (ent.expires_date === null) return { active: true, expiresAt: null };
  const latest = ends.map((d) => new Date(d).getTime()).reduce((a, b) => Math.max(a, b), 0);
  return { active: latest > Date.now(), expiresAt: new Date(latest).toISOString() };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  const secretKey = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!expected || !secretKey) return Response.json({ error: 'not_configured' }, { status: 500 });
  if (!sameSecret(req.headers.get('Authorization') ?? '', expected)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  let event: RcEvent;
  try {
    event = (await req.json())?.event ?? {};
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  if (event.type === 'TEST') return Response.json({ ok: true, test: true });

  const ids = new Set(
    [
      event.app_user_id,
      event.original_app_user_id,
      ...(event.aliases ?? []),
      ...(event.transferred_from ?? []),
      ...(event.transferred_to ?? []),
    ].filter((id): id is string => !!id && UUID.test(id)),
  );

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  try {
    for (const id of ids) {
      const { active, expiresAt } = await currentPremium(id, secretKey);
      const { error } = await admin
        .from('profiles')
        .update({ is_premium: active, premium_expires_at: active ? expiresAt : null })
        .eq('id', id);
      if (error) throw error;
    }
  } catch (e) {
    // A non-2xx makes RevenueCat retry later.
    console.error('revenuecat-webhook', event.type, e instanceof Error ? e.message : e);
    return Response.json({ error: 'update_failed' }, { status: 500 });
  }
  return Response.json({ ok: true, members: ids.size });
});
