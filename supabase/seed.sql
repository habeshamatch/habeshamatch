-- =====================================================================
-- HabeshaMatch: local development seed. LOCAL ONLY, never run on production.
--
-- Loaded automatically by `supabase db reset` (and the first `supabase start`).
-- `supabase db push` does not run it.
--
-- 40 fake profiles: 20 women, 20 men, ages 22-45, Eritrean and Ethiopian origin.
--   Diaspora (24): CA 5, US 6, GB 4, DE 3, SE 3, AU 3
--   Local tier (16): ET 6, ER 4, UG 3, KE 3
-- Each profile has core and item preferences, 1 to 3 approved placeholder photos,
-- and swipes dated yesterday (so they do not use up today's swipe limit).
-- Mutual likes get the swipe_match conversation record_swipe() would have created.
--
-- Phone numbers: diaspora numbers come from ranges reserved for fiction
-- (NANP 555-01xx, UK 07700 900xxx, Berlin 030 23125xxx, SE 070-17406xx,
-- AU 0491 570xxx). Local-tier residents use their country's prefix from
-- local_tier_countries (251, 291, 256, 254), as enforce_residence_rules requires.
-- No SMS is sent locally.
--
-- Profile ids are fixed: a0000000-0000-4000-8000-0000000000NN, NN = 01..40.
-- Photo files do not exist in Storage yet; storage_path follows <user_id>/<position>.jpg.
-- =====================================================================

-- Safety: refuse to run against a database that already has real users.
do $$
begin
  if exists (select 1 from auth.users where id::text not like 'a0000000-0000-4000-8000-%') then
    raise exception 'seed.sql is for an empty local database only';
  end if;
end $$;

create temporary table seed_people (
  n          int primary key,
  name       text,
  gender     gender_t,
  age        int,
  origin     origin_t,
  country    char(2),
  city       text,
  phone      text,
  religion   religion_t,
  languages  text[],
  intent     intent_t,
  height_cm  int,
  relocate   boolean,
  long_dist  boolean,
  bio        text
);

insert into seed_people values
-- Canada
( 1,'Selam',    'female',29,'eritrea', 'CA','Toronto',      '14165550101', 'orthodox',  '{tigrinya,english}',         'marriage',             165,true, false,'Nurse, coffee ceremony host for my whole building, and a big believer in Sunday family lunches.'),
( 2,'Yonas',    'male',  33,'eritrea', 'CA','Toronto',      '14165550102', 'orthodox',  '{tigrinya,english}',         'marriage',             180,false,true, 'Civil engineer. I play football on weekends and make a serious zigni. Looking for my partner in life.'),
( 3,'Hiwot',    'female',27,'ethiopia','CA','Calgary',      '14035550103', 'orthodox',  '{amharic,english}',          'serious_relationship', 162,true, true, 'Accountant by day, Teddy Afro karaoke by night. Family means everything to me.'),
( 4,'Dawit',    'male',  36,'ethiopia','CA','Edmonton',     '17805550104', 'protestant','{amharic,english}',          'marriage',             176,true, false,'Pharmacist and church choir member. Calm, honest, and ready to build a home.'),
( 5,'Ruth',     'female',31,'eritrea', 'CA','Calgary',      '14035550105', 'catholic',  '{tigrinya,english}',         'marriage',             168,false,false,'Teacher. I love hiking in the Rockies and cooking for people I care about.'),
-- United States
( 6,'Henok',    'male',  30,'eritrea', 'US','Washington',   '12025550106', 'orthodox',  '{tigrinya,amharic,english}', 'marriage',             183,true, true, 'Software developer in DC. Proud of where I come from, curious about where we can go together.'),
( 7,'Meron',    'female',26,'ethiopia','US','Washington',   '12025550107', 'orthodox',  '{amharic,english}',          'getting_to_know',      160,false,true, 'Grad student in public health. Kind people and good injera are my weakness.'),
( 8,'Abel',     'male',  41,'ethiopia','US','Dallas',       '12145550108', 'orthodox',  '{amharic,english}',          'marriage',             178,false,false,'Small business owner. Settled, family oriented, and looking for a wife who values faith.'),
( 9,'Feven',    'female',34,'eritrea', 'US','Seattle',      '12065550109', 'orthodox',  '{tigrinya,english}',         'marriage',             170,true, false,'Product manager. I run, I read, and I call my mother every day.'),
(10,'Abdi',     'male',  28,'ethiopia','US','Minneapolis',  '16125550110', 'muslim',    '{oromo,amharic,english}',    'serious_relationship', 181,true, true, 'Mechanical engineer. Family first, then soccer, then everything else.'),
(11,'Hayat',    'female',29,'ethiopia','US','Atlanta',      '14045550111', 'muslim',    '{oromo,amharic,english}',    'marriage',             163,true, true, 'Dentist. Warm, organized, and looking for a practicing man who is serious about marriage.'),
-- Australia
(12,'Kidane',   'male',  44,'eritrea', 'AU','Sydney',       '61491570112', 'orthodox',  '{tigrinya,english}',         'marriage',             172,true, true, 'Electrician. Quiet, dependable, and ready to settle down with the right person.'),
-- United Kingdom
(13,'Saba',     'female',25,'eritrea', 'GB','London',       '447700900113','orthodox',  '{tigrinya,english}',         'serious_relationship', 163,true, true, 'Law student. I love art galleries, long walks, and debating everything.'),
(14,'Bereket',  'male',  32,'eritrea', 'GB','London',       '447700900114','catholic',  '{tigrinya,english}',         'marriage',             177,false,true, 'Doctor in the NHS. Long shifts, big heart, looking for a real partnership.'),
(15,'Tigist',   'female',30,'ethiopia','GB','Manchester',   '447700900115','orthodox',  '{amharic,english}',          'marriage',             166,true, false,'Architect. Fasting season cook and lover of old Ethiopian jazz.'),
(16,'Amanuel',  'male',  27,'eritrea', 'GB','Birmingham',   '447700900116','protestant','{tigrinya,english}',         'getting_to_know',      185,true, true, 'Data analyst and amateur photographer. Let us see where this goes.'),
-- Germany
(17,'Lidya',    'female',33,'ethiopia','DE','Frankfurt',    '493023125117','orthodox',  '{amharic,german,english}',   'marriage',             167,false,true, 'Banker in Frankfurt. Grounded, ambitious, and close to my family.'),
(18,'Samuel',   'male',  35,'eritrea', 'DE','Munich',       '493023125118','orthodox',  '{tigrinya,german}',          'marriage',             179,true, false,'Automotive engineer. I value honesty and a peaceful home.'),
(19,'Nardos',   'female',28,'ethiopia','DE','Berlin',       '493023125119','protestant','{amharic,english}',          'serious_relationship', 158,true, true, 'UX designer. Coffee snob, gospel music fan, and always planning the next trip home.'),
-- Sweden
(20,'Filmon',   'male',  31,'eritrea', 'SE','Stockholm',    '46701740620', 'orthodox',  '{tigrinya,swedish,english}', 'marriage',             182,true, true, 'IT consultant. Good listener, better cook. Looking for my wife.'),
(21,'Helen',    'female',36,'eritrea', 'SE','Gothenburg',   '46701740621', 'orthodox',  '{tigrinya,swedish}',         'marriage',             169,false,false,'Midwife. Calm, caring, and ready for the next chapter.'),
(22,'Mikias',   'male',  29,'ethiopia','SE','Stockholm',    '46701740622', 'orthodox',  '{amharic,english}',          'serious_relationship', 174,true, true, 'Chef. I show love through food. Looking for someone to share a table with.'),
-- Australia
(23,'Eden',     'female',24,'ethiopia','AU','Melbourne',    '61491570123', 'orthodox',  '{amharic,english}',          'serious_relationship', 161,true, true, 'Physiotherapy student. Beach walks and family dinners.'),
(24,'Robel',    'male',  39,'eritrea', 'AU','Melbourne',    '61491570124', 'orthodox',  '{tigrinya,english}',         'marriage',             175,false,true, 'Logistics manager. Faith, family, and a good laugh.'),
-- Ethiopia (local tier)
(25,'Bethlehem','female',26,'ethiopia','ET','Addis Ababa',  '251911000125','orthodox',  '{amharic,english}',          'marriage',             163,true, true, 'Marketing officer in Addis. Looking for a respectful man who loves God and family.'),
(26,'Yared',    'male',  31,'ethiopia','ET','Addis Ababa',  '251911000126','orthodox',  '{amharic,english}',          'marriage',             178,false,true, 'Bank officer. Honest and hardworking, ready to start a family.'),
(27,'Hanna',    'female',23,'ethiopia','ET','Bahir Dar',    '251911000127','orthodox',  '{amharic}',                  'serious_relationship', 159,true, true, 'University graduate in economics. Simple, kind, and family minded.'),
(28,'Ibrahim',  'male',  34,'ethiopia','ET','Dire Dawa',    '251911000128','muslim',    '{amharic,oromo,arabic}',     'marriage',             176,false,false,'Trader. Respectful, generous, and looking for a righteous wife.'),
(29,'Mahlet',   'female',29,'ethiopia','ET','Addis Ababa',  '251911000129','protestant','{amharic,english}',          'marriage',             165,true, true, 'Software tester. Church worship team. Looking for a God fearing partner.'),
(30,'Tesfaye',  'male',  42,'ethiopia','ET','Mekelle',      '251911000130','orthodox',  '{tigrinya,amharic}',         'marriage',             173,false,true, 'Lecturer. Patient, thoughtful, and serious about marriage.'),
-- Eritrea (local tier)
(31,'Senait',   'female',27,'eritrea', 'ER','Asmara',       '2917100131',  'orthodox',  '{tigrinya}',                 'marriage',             162,true, true, 'Pharmacy assistant in Asmara. I love my city and my family.'),
(32,'Mussie',   'male',  30,'eritrea', 'ER','Asmara',       '2917100132',  'orthodox',  '{tigrinya,english}',         'marriage',             181,false,true, 'Mechanic with my own garage. Simple life, big dreams.'),
(33,'Aisha',    'female',25,'eritrea', 'ER','Keren',        '2917100133',  'muslim',    '{tigre,tigrinya,arabic}',    'marriage',             160,true, false,'Tailor. Gentle, faithful, and close to my family.'),
(34,'Habtom',   'male',  37,'eritrea', 'ER','Massawa',      '2917100134',  'catholic',  '{tigrinya,english}',         'marriage',             174,false,false,'Fisherman and boat owner. I value loyalty above everything.'),
-- Uganda (local tier)
(35,'Winta',    'female',24,'eritrea', 'UG','Kampala',      '256700000135','orthodox',  '{tigrinya,english}',         'serious_relationship', 164,true, true, 'Studying business in Kampala. Cheerful and family oriented.'),
(36,'Natnael',  'male',  27,'ethiopia','UG','Kampala',      '256700000136','protestant','{amharic,english}',          'marriage',             179,true, true, 'Runs a small cafe. Hardworking and hopeful.'),
(37,'Elsa',     'female',32,'eritrea', 'UG','Kampala',      '256700000137','orthodox',  '{tigrinya,english}',         'marriage',             166,true, true, 'Hairdresser with my own salon. Looking for a serious, kind man.'),
-- Kenya (local tier)
(38,'Biniam',   'male',  29,'eritrea', 'KE','Nairobi',      '254700000138','orthodox',  '{tigrinya,english,swahili}', 'marriage',             177,true, true, 'Import business in Nairobi. Easygoing and ready for commitment.'),
(39,'Zewdi',    'female',45,'ethiopia','KE','Nairobi',      '254700000139','orthodox',  '{amharic,english}',          'marriage',             161,false,true, 'Widow and proud mother. Looking for a mature, faithful companion.'),
(40,'Kaleb',    'male',  22,'ethiopia','KE','Nairobi',      '254700000140','protestant','{amharic,english,swahili}',  'getting_to_know',      172,true, true, 'Computer science student. Curious, funny, and open minded.');

create or replace function pg_temp.seed_id(n int) returns uuid language sql immutable as $$
  select ('a0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

-- Auth users with confirmed phone numbers (shaped like real GoTrue phone sign-ups).
insert into auth.users (
  instance_id, id, aud, role, phone, phone_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', pg_temp.seed_id(n), 'authenticated', 'authenticated',
       phone, now() - interval '60 days',
       '{"provider":"phone","providers":["phone"]}', '{}', now() - interval '60 days', now(),
       '', '', '', ''
from seed_people;

insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select pg_temp.seed_id(n)::text, pg_temp.seed_id(n),
       jsonb_build_object('sub', pg_temp.seed_id(n)::text, 'phone', phone, 'phone_verified', true),
       'phone', now() - interval '60 days', now()
from seed_people;

-- Profiles. Date of birth is relative to today so ages stay stable.
insert into profiles (
  id, display_name, date_of_birth, gender, height_cm, origin, current_city, current_country_code,
  residence_country_code, religion, languages, relationship_intent, bio,
  open_to_relocating, open_to_long_distance, is_photo_verified, is_premium, premium_expires_at,
  created_at, last_active_at
)
select pg_temp.seed_id(n), name,
       (current_date - make_interval(years => age, days => 30 + n * 7))::date,
       gender, height_cm, origin, city, country, country, religion, languages, intent, bio,
       relocate, long_dist,
       n % 4 = 0,                                     -- some verified (blue tick)
       n in (6, 14, 20),                              -- a few premium diaspora users
       case when n in (6, 14, 20) then now() + interval '30 days' end,
       now() - interval '60 days',
       now() - make_interval(hours => (n % 9) * 7)
from seed_people;

-- Existing users: move the residence change date back so the 30 day cooldown has passed.
update profiles set residence_changed_at = now() - interval '60 days'
where id::text like 'a0000000-0000-4000-8000-%';

-- Core preferences: opposite gender, age range around their own age.
insert into preference_core (user_id, seeking_gender, age_min, age_max)
select pg_temp.seed_id(n),
       case gender when 'female' then 'male'::gender_t else 'female'::gender_t end,
       case gender when 'female' then greatest(18, age - 2) else greatest(18, age - 8) end,
       case gender when 'female' then age + 8 else age + 3 end
from seed_people;

-- Item preferences: a realistic mix of hard deal-breakers and soft wishes.
insert into preference_items (user_id, attribute, kind, value)
-- Religion: Muslims and every third Orthodox user make it a deal-breaker, some others a wish.
select pg_temp.seed_id(n), 'religion'::pref_attr_t, 'hard'::pref_kind_t, jsonb_build_array(religion)
  from seed_people where religion = 'muslim' or (religion = 'orthodox' and n % 3 = 0)
union all
select pg_temp.seed_id(n), 'religion', 'soft', jsonb_build_array(religion)
  from seed_people where religion <> 'muslim' and not (religion = 'orthodox' and n % 3 = 0) and n % 2 = 0
-- Origin: half prefer someone from the same country of origin.
union all
select pg_temp.seed_id(n), 'origin', 'soft', jsonb_build_array(origin)
  from seed_people where n % 2 = 1
-- Languages: everyone would like a shared first language.
union all
select pg_temp.seed_id(n), 'languages', 'soft', jsonb_build_array(languages[1])
  from seed_people
-- Intent: marriage-minded users want someone serious.
union all
select pg_temp.seed_id(n), 'relationship_intent', 'soft', '["marriage","serious_relationship"]'::jsonb
  from seed_people where intent = 'marriage'
-- Height: some women want a taller partner, some men a shorter one.
union all
select pg_temp.seed_id(n), 'height', 'soft',
       case gender when 'female' then jsonb_build_object('min', height_cm + 5)
                   else jsonb_build_object('max', height_cm) end
  from seed_people where n % 4 in (0, 1)
-- Residence type: a few diaspora users prefer diaspora, a few not open to long distance require it.
union all
select pg_temp.seed_id(n), 'residence_type', case when long_dist then 'soft' else 'hard' end::pref_kind_t, '["diaspora"]'
  from seed_people where country not in ('ET','ER','UG','KE') and n % 5 = 0
-- Country: some prefer someone in their own country.
union all
select pg_temp.seed_id(n), 'country', 'soft', jsonb_build_array(country)
  from seed_people where n % 7 = 0;

-- Photos: 1 to 3 approved placeholders each, plus a couple pending uploads for the admin queue.
insert into photos (user_id, storage_path, position, moderation_status, created_at)
select pg_temp.seed_id(p.n), pg_temp.seed_id(p.n)::text || '/' || pos || '.jpg', pos,
       'approved', now() - interval '59 days'
from seed_people p, generate_series(1, 1 + p.n % 3) pos;

insert into photos (user_id, storage_path, position, moderation_status)
select pg_temp.seed_id(n), pg_temp.seed_id(n)::text || '/4.jpg', 4, 'pending'
from seed_people where n in (5, 18);

-- Swipes: a deterministic sample of eligible pairs (gender and age fit both ways), dated yesterday.
insert into swipes (swiper_id, target_id, direction, created_at)
select v.id, c.id,
       case when abs(hashtext(v.id::text || c.id::text)) % 3 = 0 then 'pass' else 'like' end::swipe_dir_t,
       date_trunc('day', now()) - interval '1 day' + make_interval(mins => abs(hashtext(c.id::text || v.id::text)) % 1200)
from profiles v
join profiles c on c.id <> v.id
where v.id::text like 'a0000000-0000-4000-8000-%'
  and c.id::text like 'a0000000-0000-4000-8000-%'
  and swipe_eligible(v.id, c.id)
  and abs(hashtext(v.id::text || c.id::text)) % 5 < 2;

-- A few guaranteed mutual matches so chat screens have data to show.
insert into swipes (swiper_id, target_id, direction, created_at)
select pg_temp.seed_id(a), pg_temp.seed_id(b), 'like', date_trunc('day', now()) - interval '1 day'
from (values (1,2),(2,1),(25,26),(26,25),(13,14),(14,13)) m(a, b)
on conflict (swiper_id, target_id) do update set direction = 'like';

-- Every mutual like gets the conversation record_swipe() would have opened.
insert into conversations (user_a, user_b, initiated_by, origin, counts_toward_limit, created_at)
select least(s1.swiper_id, s1.target_id), greatest(s1.swiper_id, s1.target_id),
       case when s1.created_at >= s2.created_at then s1.swiper_id else s2.swiper_id end,
       'swipe_match', false, greatest(s1.created_at, s2.created_at)
from swipes s1
join swipes s2 on s2.swiper_id = s1.target_id and s2.target_id = s1.swiper_id
where s1.direction = 'like' and s2.direction = 'like' and s1.swiper_id < s1.target_id
on conflict (user_a, user_b) do nothing;

drop table seed_people;
