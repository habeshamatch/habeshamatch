// Chooses which Supabase the app talks to during development, then you start Expo.
//   node scripts/use-supabase.mjs local   -> the Supabase on this Mac, at the Mac's CURRENT Wi-Fi address
//   node scripts/use-supabase.mjs live    -> the live project in .env (removes .env.local)
// The Mac's Wi-Fi address changes now and then; "local" always writes the current one.
import { execSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const mobile = new URL('..', import.meta.url).pathname;
const envLocal = join(mobile, '.env.local');
const mode = process.argv[2];

if (mode === 'live') {
  if (existsSync(envLocal)) rmSync(envLocal);
  console.log('Using the LIVE Supabase project (mobile/.env).');
  process.exit(0);
}
if (mode !== 'local') {
  console.error('Usage: node scripts/use-supabase.mjs local|live');
  process.exit(1);
}

const sh = (cmd) => execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
let ip = '';
for (const iface of ['en0', 'en1']) {
  try {
    ip = sh(`ipconfig getifaddr ${iface}`);
    if (ip) break;
  } catch {
    // try the next interface
  }
}
if (!ip) {
  console.error('Could not find this Mac\'s Wi-Fi address. Is Wi-Fi on?');
  process.exit(1);
}
let status;
try {
  status = JSON.parse(sh(`cd "${join(mobile, '..')}" && supabase status -o json`));
} catch {
  console.error('Local Supabase is not running. Open Docker Desktop, then run: supabase start');
  process.exit(1);
}
writeFileSync(
  envLocal,
  [
    '# Written by scripts/use-supabase.mjs: the app talks to the Supabase on this Mac.',
    '# Run "npm run start:live" to go back to the live project. Git ignores this file.',
    `EXPO_PUBLIC_SUPABASE_URL=http://${ip}:54321`,
    `EXPO_PUBLIC_SUPABASE_ANON_KEY=${status.PUBLISHABLE_KEY}`,
    '',
  ].join('\n'),
);
console.log(`Using the LOCAL Supabase at http://${ip}:54321 (phone and Mac must be on the same Wi-Fi).`);
