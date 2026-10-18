// LOCAL DEVELOPMENT ONLY. Sends a reply from the other person in the most recently active
// conversation, so you can watch messages arrive live in the app.
//
//   node supabase/scripts/simulate-reply.mjs "Selam! How are you?"
//
// Refuses to run against anything but the local Supabase.

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const require = createRequire(join(root, 'mobile/package.json'));
const { createClient } = require('@supabase/supabase-js');

const status = JSON.parse(execSync('supabase status -o json', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString());
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(status.API_URL)) {
  console.error(`Refusing to run: ${status.API_URL} is not the local Supabase.`);
  process.exit(1);
}
const sb = createClient(status.API_URL, status.SECRET_KEY ?? status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const body = process.argv[2] ?? 'Selam! Nice to hear from you.';

// Latest conversation started by a real (non-seed) user; reply as the seed person in it.
const { data: convos, error } = await sb
  .from('conversations')
  .select('id, user_a, user_b, initiated_by, created_at, last_message_at')
  .order('created_at', { ascending: false })
  .limit(20);
if (error) throw error;
const isSeed = (id) => id.startsWith('a0000000-0000-4000-8000-');
const convo = convos.find((c) => !isSeed(c.initiated_by ?? '') && (isSeed(c.user_a) || isSeed(c.user_b)));
if (!convo) {
  console.error('No conversation between you and a seed profile yet. Message someone from Discover first.');
  process.exit(1);
}
const sender = isSeed(convo.user_a) ? convo.user_a : convo.user_b;
const { data: who } = await sb.from('profiles').select('display_name').eq('id', sender).single();
const sent = await sb.from('messages').insert({ conversation_id: convo.id, sender_id: sender, body });
if (sent.error) throw sent.error;
console.log(`${who.display_name} replied: "${body}"`);
