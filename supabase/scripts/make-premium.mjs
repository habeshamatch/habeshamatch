// LOCAL DEVELOPMENT ONLY. Turns Premium on or off for an account on the local Supabase, so the
// Premium features can be tried before payments exist. On the live project only the RevenueCat
// webhook (Prompt 4.1) ever sets Premium.
//
//   node supabase/scripts/make-premium.mjs you@example.com          (Premium for 30 days)
//   node supabase/scripts/make-premium.mjs you@example.com --off    (back to free or local)
//
// Refuses to run against anything but the local Supabase.

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const require = createRequire(join(root, 'mobile/package.json'));
const { createClient } = require('@supabase/supabase-js');

const email = (process.argv[2] ?? '').trim().toLowerCase();
const off = process.argv.includes('--off');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: node supabase/scripts/make-premium.mjs you@example.com [--off]');
  process.exit(1);
}
const status = JSON.parse(execSync('supabase status -o json', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString());
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(status.API_URL)) {
  console.error(`Refusing to run: ${status.API_URL} is not the local Supabase.`);
  process.exit(1);
}
const sb = createClient(status.API_URL, status.SECRET_KEY ?? status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
const userId = list.users.find((u) => u.email === email)?.id;
if (!userId) {
  console.error(`No local account for ${email}.`);
  process.exit(1);
}
const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
const { data, error } = await sb
  .from('profiles')
  .update(off ? { is_premium: false, premium_expires_at: null } : { is_premium: true, premium_expires_at: expires })
  .eq('id', userId)
  .select('id');
if (error) throw error;
if (!data.length) {
  console.error(`${email} has no dating profile yet. Finish onboarding first.`);
  process.exit(1);
}
console.log(off ? `${email} is no longer Premium.` : `${email} is Premium until ${expires.slice(0, 10)}. Pull to refresh in the app.`);
