// LOCAL DEVELOPMENT ONLY. Adds a few test members who would show up in YOUR Suggested section:
// they are looking for someone like you (you meet their must-haves), but they are just outside
// your age range, so they don't meet yours. Uses your most recently created account, or an email.
//
//   node supabase/scripts/simulate-suggested.mjs                    (adds 6, your newest account)
//   node supabase/scripts/simulate-suggested.mjs you@example.com
//   node supabase/scripts/simulate-suggested.mjs --remove           (deletes the ones it added)
//
// They are approved, have photos (via seed-photos.mjs), and use @example.com emails so they are
// easy to tell apart and remove. Refuses to run against anything but the local Supabase.

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const require = createRequire(join(root, 'mobile/package.json'));
const { createClient } = require('@supabase/supabase-js');

const args = process.argv.slice(2);
const remove = args.includes('--remove');
const email = args.find((a) => a.includes('@'))?.toLowerCase();

const status = JSON.parse(execSync('supabase status -o json', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString());
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(status.API_URL)) {
  console.error(`Refusing to run: ${status.API_URL} is not the local Supabase.`);
  process.exit(1);
}
const sb = createClient(status.API_URL, status.SECRET_KEY ?? status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Fixed ids in the seed range, so seed-photos.mjs gives them pictures.
const id = (n) => `a0000000-0000-4000-8000-${String(100 + n).padStart(12, '0')}`;
const testEmail = (n) => `suggested${n}@example.com`;
const PEOPLE = [
  { name: 'Selam', origin: 'eritrea', religion: 'orthodox', city: 'Toronto', country: 'CA' },
  { name: 'Mahlet', origin: 'ethiopia', religion: 'orthodox', city: 'Washington', country: 'US' },
  { name: 'Ruth', origin: 'eritrea', religion: 'protestant', city: 'London', country: 'GB' },
  { name: 'Hanna', origin: 'ethiopia', religion: 'catholic', city: 'Calgary', country: 'CA' },
  { name: 'Feven', origin: 'eritrea', religion: 'orthodox', city: 'Stockholm', country: 'SE' },
  { name: 'Tsion', origin: 'ethiopia', religion: 'muslim', city: 'Seattle', country: 'US' },
];

const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
const users = list.users;

// Remove the ones added before (only these @example.com test accounts, never anyone else).
for (const [i] of PEOPLE.entries()) {
  const existing = users.find((u) => u.email === testEmail(i + 1));
  if (existing) {
    await sb.storage.from('photos').remove([`${existing.id}/1.jpg`, `${existing.id}/1.thumb.jpg`]);
    await sb.auth.admin.deleteUser(existing.id);
  }
}
if (remove) {
  console.log('Removed the Suggested test members.');
  process.exit(0);
}

// You: the given email, or the newest real (non-test) account with a profile.
const mine = users
  .filter((u) => (email ? u.email === email : u.email && !u.email.endsWith('@example.com')))
  .sort((a, b) => b.created_at.localeCompare(a.created_at));
let me = null;
for (const u of mine) {
  const { data } = await sb.from('profiles').select('id, display_name, gender, date_of_birth').eq('id', u.id).maybeSingle();
  if (data) {
    me = data;
    break;
  }
}
if (!me) {
  console.error(email ? `No local profile for ${email}.` : 'No local account with a profile found.');
  process.exit(1);
}
const { data: prefs } = await sb.from('preference_core').select('*').eq('user_id', me.id).maybeSingle();
if (!prefs) {
  console.error(`${me.display_name} has no preferences yet. Finish onboarding first.`);
  process.exit(1);
}
const myAge = Math.floor((Date.now() - new Date(me.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000));

// Ages just outside your range: older if there is room, otherwise younger.
let ages;
if (prefs.age_max <= 70) ages = PEOPLE.map((_, i) => prefs.age_max + 1 + (i % 5));
else if (prefs.age_min >= 20) ages = PEOPLE.map((_, i) => Math.max(18, prefs.age_min - 1 - (i % 3)));
else {
  console.error('Your age range covers everyone (18 to 70+). Set a must-have in Preferences instead.');
  process.exit(1);
}

for (const [i, p] of PEOPLE.entries()) {
  const n = i + 1;
  const userId = id(n);
  const { error: e1 } = await sb.auth.admin.createUser({
    id: userId,
    email: testEmail(n),
    email_confirm: true,
    phone: `1555010${String(n).padStart(4, '0')}`, // profiles need a verified phone
    phone_confirm: true,
  });
  if (e1) throw e1;
  const dob = new Date(Date.now() - (ages[i] * 365.25 + 40) * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { error: e2 } = await sb.from('profiles').insert({
    id: userId,
    display_name: p.name,
    date_of_birth: dob,
    gender: prefs.seeking_gender,
    origin: p.origin,
    religion: p.religion,
    relationship_intent: 'marriage',
    current_city: p.city,
    current_country_code: p.country,
    residence_country_code: p.country,
    languages: ['en', p.origin === 'eritrea' ? 'ti' : 'am'],
    height_cm: 160 + i * 2,
    bio: `Test member for Suggested. Looking for someone like you, but outside your age range.`,
    is_photo_verified: true,
  });
  if (e2) throw e2;
  // They want your gender and an age range that includes you.
  const { error: e3 } = await sb.from('preference_core').insert({
    user_id: userId,
    seeking_gender: me.gender,
    age_min: Math.max(18, myAge - 5),
    age_max: myAge + 10,
  });
  if (e3) throw e3;
  const { error: e4 } = await sb
    .from('photos')
    .insert({ user_id: userId, storage_path: `${userId}/1.jpg`, position: 1, moderation_status: 'approved' });
  if (e4) throw e4;
}

execSync('node supabase/scripts/seed-photos.mjs', { cwd: root, stdio: 'ignore' });
console.log(
  `Added ${PEOPLE.length} members (ages ${Math.min(...ages)} to ${Math.max(...ages)}) to ${me.display_name}'s Suggested. ` +
    'Open Discover > Suggested and pull to refresh. Remove them with --remove.',
);
