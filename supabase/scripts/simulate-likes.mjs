// LOCAL DEVELOPMENT ONLY. Makes a few seed profiles like your newest account, so swiping right
// on them in the Swipe tab produces a match.
//
//   node supabase/scripts/simulate-likes.mjs        (default 5 likes)
//   node supabase/scripts/simulate-likes.mjs 10
//
// Only seed profiles that fit you for swiping (gender and age range both ways) are used.
// Refuses to run against anything but the local Supabase.

import { execSync } from 'node:child_process';

const root = new URL('../../', import.meta.url).pathname;
const status = JSON.parse(execSync('supabase status -o json', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString());
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(status.API_URL)) {
  console.error(`Refusing to run: ${status.API_URL} is not the local Supabase.`);
  process.exit(1);
}
const count = Math.max(1, Math.min(20, Number(process.argv[2] ?? 5)));
const psql = (sql) =>
  execSync(`docker exec -i supabase_db_habeshamatch psql -U postgres -d postgres -At`, { input: sql }).toString().trim();

const me = psql(`select id || '|' || display_name from profiles
                 where id::text not like 'a0000000-0000-4000-8000-%' order by created_at desc limit 1;`);
if (!me) {
  console.error('No account found. Sign up in the app first.');
  process.exit(1);
}
const [myId, myName] = me.split('|');

// Likes dated yesterday so they do not use up the seed profiles' daily swipes.
const names = psql(`with picked as (
    select s.id, s.display_name from profiles s
    where s.id::text like 'a0000000-0000-4000-8000-%'
      and swipe_eligible(s.id, '${myId}') and swipe_eligible('${myId}', s.id)
      and not exists (select 1 from swipes w where w.swiper_id = s.id and w.target_id = '${myId}')
      and not exists (select 1 from swipes w where w.swiper_id = '${myId}' and w.target_id = s.id)
    order by random() limit ${count})
  , ins as (
    insert into swipes (swiper_id, target_id, direction, created_at)
    select id, '${myId}', 'like', now() - interval '1 day' from picked returning swiper_id)
  select string_agg(p.display_name, ', ') from picked p join ins on ins.swiper_id = p.id;`);

console.log(names ? `Liked ${myName}: ${names}. Swipe right on them to match.` : `No more eligible seed profiles to like ${myName}.`);
