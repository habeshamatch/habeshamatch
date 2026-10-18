// LOCAL DEVELOPMENT ONLY. Makes an email an admin of the admin panel on the local Supabase:
// creates the account if it does not exist (email confirmed, no dating profile) and adds it to
// the admins table.
//
//   node supabase/scripts/make-admin.mjs you@example.com
//
// For the LIVE project this is done differently (see docs/ADMIN.md): never with this script.

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const require = createRequire(join(root, 'mobile/package.json'));
const { createClient } = require('@supabase/supabase-js');

const email = (process.argv[2] ?? '').trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: node supabase/scripts/make-admin.mjs you@example.com');
  process.exit(1);
}
const status = JSON.parse(execSync('supabase status -o json', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString());
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(status.API_URL)) {
  console.error(`Refusing to run: ${status.API_URL} is not the local Supabase.`);
  process.exit(1);
}
const sb = createClient(status.API_URL, status.SECRET_KEY ?? status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let userId;
const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
userId = list.users.find((u) => u.email === email)?.id;
if (!userId) {
  const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
  console.log(`Created account ${email}`);
}
const { error } = await sb.from('admins').upsert({ user_id: userId });
if (error) throw error;
console.log(`${email} is an admin on the local Supabase. Sign in at http://localhost:3000`);
