// Delivers one notification to all of a member's phones through Expo's push service.
// Called only by the database (notify_member() in migration 20261102000000), which has already
// decided who gets what (blocks, account status, the member's settings).
//
// Security: the database sends the Authorization header stored in Vault ('push_function_secret');
// anything else is rejected. verify_jwt is off for this function (config.toml) because the
// database calls it without a user login.
//
// Secret (Supabase > Edge Functions > Secrets, or supabase/functions/.env locally):
//   PUSH_FUNCTION_SECRET  the same value as the Vault secret 'push_function_secret'
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type Payload = { user_id?: string; title?: string; body?: string; data?: Record<string, unknown> };
type Ticket = { status: 'ok' | 'error'; details?: { error?: string } };

function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const expected = Deno.env.get('PUSH_FUNCTION_SECRET');
  if (!expected) return Response.json({ error: 'not_configured' }, { status: 500 });
  if (!sameSecret(req.headers.get('Authorization') ?? '', expected)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  let p: Payload;
  try {
    p = await req.json();
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!p.user_id || !p.title) return Response.json({ error: 'bad_request' }, { status: 400 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { data: tokens, error } = await admin.from('push_tokens').select('token').eq('user_id', p.user_id);
  if (error) return Response.json({ error: 'lookup_failed' }, { status: 500 });
  if (!tokens?.length) return Response.json({ ok: true, sent: 0 });

  const messages = tokens.map((t) => ({
    to: t.token,
    title: p.title,
    body: p.body ?? '',
    data: p.data ?? {},
    sound: 'default',
  }));
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    console.error('send-push expo', res.status, await res.text());
    return Response.json({ error: 'expo_failed' }, { status: 502 });
  }

  // Phones that uninstalled the app or turned notifications off for good: forget them.
  const tickets: Ticket[] = (await res.json())?.data ?? [];
  const dead = tickets
    .map((t, i) => (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? messages[i].to : null))
    .filter((t): t is string => !!t);
  if (dead.length) await admin.from('push_tokens').delete().in('token', dead);

  return Response.json({ ok: true, sent: messages.length - dead.length });
});
