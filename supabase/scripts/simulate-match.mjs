// LOCAL DEVELOPMENT ONLY. The person your newest account most recently liked (in Swipe) likes you
// back, as if they swiped right on their own phone. That makes a match, and YOU get the
// "It's a match!" notification (the person who liked first is the one notified).
//
//   1. In the app, swipe right on someone in the Swipe tab.
//   2. Put the app in the background.
//   3. node supabase/scripts/simulate-match.mjs
//
// For the notification to arrive, run `supabase functions serve --env-file supabase/functions/.env`.
// Refuses to run against anything but the local Supabase.

import { execSync } from 'node:child_process';

const root = new URL('../../', import.meta.url).pathname;
const status = JSON.parse(execSync('supabase status -o json', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString());
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(status.API_URL)) {
  console.error(`Refusing to run: ${status.API_URL} is not the local Supabase.`);
  process.exit(1);
}
const psql = (sql) =>
  execSync(`docker exec -i supabase_db_habeshamatch psql -U postgres -d postgres -At`, { input: sql }).toString().trim();

const me = psql(`select id || '|' || display_name from profiles
                 where id::text not like 'a0000000-0000-4000-8000-%' order by created_at desc limit 1;`);
if (!me) {
  console.error('No account found. Sign up in the app first.');
  process.exit(1);
}
const [myId, myName] = me.split('|');

// Your most recent like that has not been answered and is not a chat yet.
const liked = psql(`select s.target_id || '|' || p.display_name
  from swipes s join profiles p on p.id = s.target_id
  where s.swiper_id = '${myId}' and s.direction = 'like'
    and not exists (select 1 from swipes b where b.swiper_id = s.target_id and b.target_id = s.swiper_id)
    and not exists (select 1 from conversations c
                    where c.user_a = least(s.swiper_id, s.target_id) and c.user_b = greatest(s.swiper_id, s.target_id))
  order by s.created_at desc limit 1;`);
if (!liked) {
  console.error(`${myName} has no like waiting for an answer. Swipe right on someone in the Swipe tab first.`);
  process.exit(1);
}
const [theirId, theirName] = liked.split('|');

// They swipe right on you, through the same rule the app uses (record_swipe), signed in as them.
const result = psql(`begin;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"role":"authenticated","sub":"${theirId}"}', true);
  select record_swipe('${myId}', 'like')::text;
  commit;`);
console.log(`${theirName} liked ${myName} back: ${result.split('\n').filter((l) => l.startsWith('{')).pop() ?? result}`);
console.log(`${myName} should get an "It's a match!" notification in a few seconds.`);
