-- =====================================================================
-- HabeshaMatch: initial schema
-- Target: Supabase (PostgreSQL 15+)
--
-- Design principles
--   1. Every product rule lives in the database, not only in the app.
--      The app can be modified by a bad actor; the database cannot.
--   2. Other users' profiles are never read directly from tables.
--      Discovery, swipes, likes and profile views go through RPC
--      functions that return only safe public fields (age, never DOB).
--   3. Tunable numbers (limits, thresholds, cooldowns) live in
--      app_config so they can change without an app release.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type gender_t            as enum ('male', 'female');
create type origin_t            as enum ('eritrea', 'ethiopia');
create type religion_t          as enum ('orthodox', 'muslim', 'catholic', 'protestant', 'other', 'prefer_not_to_say');
create type intent_t            as enum ('marriage', 'serious_relationship', 'getting_to_know');
create type account_status_t    as enum ('active', 'suspended', 'banned', 'deleted');
create type moderation_status_t as enum ('pending', 'approved', 'rejected');
create type pref_kind_t         as enum ('hard', 'soft');
create type pref_attr_t         as enum ('religion', 'origin', 'languages', 'relationship_intent', 'height', 'residence_type', 'country');
create type swipe_dir_t         as enum ('like', 'pass');
create type convo_origin_t      as enum ('criteria', 'suggested', 'swipe_match');
create type report_category_t   as enum ('fake_profile', 'scam', 'harassment', 'spam', 'inappropriate_photos', 'underage', 'other');
create type report_status_t     as enum ('open', 'actioned', 'dismissed');
create type tier_t              as enum ('free', 'local', 'premium');

-- ---------------------------------------------------------------------
-- Configuration
-- ---------------------------------------------------------------------
create table app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

insert into app_config (key, value) values
  ('free_new_chats_per_day',          '5'),
  ('unlimited_new_chats_safety_cap',  '50'),   -- applies to local and premium users
  ('free_swipes_per_day',             '10'),   -- free and local users
  ('premium_swipes_per_day',          '25'),
  ('soft_match_threshold',            '0.3'),  -- share of soft preferences that must match
  ('location_change_cooldown_days',   '30');

create or replace function cfg_num(p_key text) returns numeric
language sql stable set search_path = public as $$
  select (value #>> '{}')::numeric from app_config where key = p_key
$$;

-- Countries whose residents get the local tier (unlimited new chats, free).
create table local_tier_countries (
  country_code char(2) primary key,
  country_name text    not null,
  phone_prefix text    not null,   -- digits only, no plus sign
  active       boolean not null default true
);

insert into local_tier_countries (country_code, country_name, phone_prefix) values
  ('ET', 'Ethiopia', '251'),
  ('ER', 'Eritrea',  '291'),
  ('UG', 'Uganda',   '256'),
  ('SD', 'Sudan',    '249'),
  ('KE', 'Kenya',    '254'),
  ('AO', 'Angola',   '244');

-- ---------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------
create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  display_name           text not null check (char_length(display_name) between 1 and 40),
  date_of_birth          date not null,
  gender                 gender_t not null,
  height_cm              smallint check (height_cm between 120 and 230),
  origin                 origin_t not null,
  current_city           text,
  current_country_code   char(2),
  -- Where the user permanently lives. This decides the pricing tier.
  residence_country_code char(2) not null,
  residence_changed_at   timestamptz not null default now(),
  religion               religion_t not null,
  languages              text[] not null default '{}',
  relationship_intent    intent_t not null,
  bio                    text check (char_length(bio) <= 500),
  open_to_relocating     boolean not null default false,
  open_to_long_distance  boolean not null default false,
  is_photo_verified      boolean not null default false,   -- blue tick, free for everyone
  is_premium             boolean not null default false,   -- set only by the RevenueCat webhook
  premium_expires_at     timestamptz,
  account_status         account_status_t not null default 'active',
  created_at             timestamptz not null default now(),
  last_active_at         timestamptz not null default now()
);

create index profiles_discovery_idx on profiles (account_status, gender, residence_country_code);

-- Always-required preferences (also used as the swipe deck guardrail).
create table preference_core (
  user_id        uuid primary key references profiles(id) on delete cascade,
  seeking_gender gender_t not null,
  age_min        smallint not null check (age_min >= 18),
  age_max        smallint not null check (age_max <= 99),
  check (age_min <= age_max)
);

-- Optional preferences, each marked hard (deal-breaker) or soft (ranking).
-- value is a JSON array of strings, except height: {"min": 160, "max": 190}
--   religion            ["orthodox","protestant"]
--   origin              ["eritrea"]
--   languages           ["tigrinya","amharic"]   (match if any overlap)
--   relationship_intent ["marriage"]
--   residence_type      ["diaspora"] or ["home"]
--   country             ["CA","US"]
create table preference_items (
  id        bigserial primary key,
  user_id   uuid not null references profiles(id) on delete cascade,
  attribute pref_attr_t not null,
  kind      pref_kind_t not null,
  value     jsonb not null,
  unique (user_id, attribute)
);

create table photos (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  storage_path      text not null,
  position          smallint not null check (position between 1 and 6),
  moderation_status moderation_status_t not null default 'pending',
  created_at        timestamptz not null default now(),
  unique (user_id, position)
);
create index photos_user_idx on photos (user_id);

create table verification_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  selfie_path text not null,
  status      moderation_status_t not null default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

create table swipes (
  swiper_id  uuid not null references profiles(id) on delete cascade,
  target_id  uuid not null references profiles(id) on delete cascade,
  direction  swipe_dir_t not null,
  created_at timestamptz not null default now(),
  primary key (swiper_id, target_id),
  check (swiper_id <> target_id)
);
create index swipes_target_idx on swipes (target_id, direction);
create index swipes_swiper_time_idx on swipes (swiper_id, created_at desc);

create table conversations (
  id                  uuid primary key default gen_random_uuid(),
  user_a              uuid not null references profiles(id) on delete cascade,
  user_b              uuid not null references profiles(id) on delete cascade,
  initiated_by        uuid references profiles(id) on delete set null,
  origin              convo_origin_t not null,
  counts_toward_limit boolean not null default true,  -- false for mutual swipe matches
  created_at          timestamptz not null default now(),
  last_message_at     timestamptz,
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index conversations_initiator_idx on conversations (initiated_by, created_at desc);
create index conversations_user_b_idx on conversations (user_b);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 2000),  -- text only
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);
create index messages_convo_time_idx on messages (conversation_id, created_at desc);

create table blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on blocks (blocked_id);

create table reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references profiles(id) on delete cascade,
  reported_id  uuid not null references profiles(id) on delete cascade,
  category     report_category_t not null,
  details      text check (char_length(details) <= 1000),
  status       report_status_t not null default 'open',
  action_taken text,
  resolved_by  uuid references auth.users(id),
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index reports_status_idx on reports (status, created_at);

create table moderation_actions (
  id         bigserial primary key,
  admin_id   uuid references auth.users(id),
  user_id    uuid references profiles(id) on delete set null,
  action     text not null,   -- warn, suspend, ban, unban, approve_photo, reject_photo, verify, ...
  reason     text,
  created_at timestamptz not null default now()
);

create table push_tokens (
  user_id    uuid not null references profiles(id) on delete cascade,
  token      text not null,
  platform   text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  primary key (user_id, token)
);

create table daily_picks (
  user_id      uuid not null references profiles(id) on delete cascade,
  pick_user_id uuid not null references profiles(id) on delete cascade,
  pick_date    date not null default current_date,
  primary key (user_id, pick_user_id, pick_date)
);

-- ---------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------
create or replace function age_years(dob date) returns int
language sql stable as $$
  select extract(year from age(current_date, dob))::int
$$;

-- True when the request comes from an app user (not the service role or SQL editor).
create or replace function is_end_user() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid())
$$;

create or replace function residence_type(p_country char(2)) returns text
language sql stable set search_path = public as $$
  select case when exists (select 1 from local_tier_countries
                           where country_code = p_country and active)
              then 'home' else 'diaspora' end
$$;

create or replace function user_tier(p_user uuid) returns tier_t
language sql stable security definer set search_path = public as $$
  select case
           when p.is_premium and coalesce(p.premium_expires_at, 'infinity') > now() then 'premium'::tier_t
           when residence_type(p.residence_country_code) = 'home' then 'local'::tier_t
           else 'free'::tier_t
         end
  from profiles p where p.id = p_user
$$;

create or replace function is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks
                 where (blocker_id = a and blocked_id = b)
                    or (blocker_id = b and blocked_id = a))
$$;

-- Candidate can appear to the viewer at all (active, has an approved photo, no block).
create or replace function is_discoverable(p_viewer uuid, p_cand uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_viewer <> p_cand
     and exists (select 1 from profiles where id = p_cand and account_status = 'active')
     and exists (select 1 from photos where user_id = p_cand and moderation_status = 'approved')
     and not is_blocked_between(p_viewer, p_cand)
$$;

-- Does candidate c satisfy one preference item?
create or replace function pref_item_met(p_attr pref_attr_t, p_value jsonb, c profiles) returns boolean
language sql stable set search_path = public as $$
  select case p_attr
    when 'religion'            then p_value ? c.religion::text
    when 'origin'              then p_value ? c.origin::text
    when 'relationship_intent' then p_value ? c.relationship_intent::text
    when 'languages'           then p_value ?| c.languages
    when 'country'             then p_value ? (c.residence_country_code)::text
    when 'residence_type'      then p_value ? residence_type(c.residence_country_code)
    when 'height'              then c.height_cm is not null
                                    and c.height_cm between coalesce((p_value ->> 'min')::int, 0)
                                                        and coalesce((p_value ->> 'max')::int, 999)
  end
$$;

-- Does p_cand satisfy ALL of p_viewer's hard preferences (incl. gender and age)?
create or replace function meets_hard(p_viewer uuid, p_cand uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
           select 1
           from preference_core pc
           join profiles c on c.id = p_cand
           where pc.user_id = p_viewer
             and c.gender = pc.seeking_gender
             and age_years(c.date_of_birth) between pc.age_min and pc.age_max)
     and not exists (
           select 1
           from preference_items pi
           join profiles c on c.id = p_cand
           where pi.user_id = p_viewer
             and pi.kind = 'hard'
             and not coalesce(pref_item_met(pi.attribute, pi.value, c), false))
$$;

-- Share (0..1) of p_viewer's soft preferences that p_cand satisfies. 1 if none set.
create or replace function soft_score(p_viewer uuid, p_cand uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(avg(case when coalesce(pref_item_met(pi.attribute, pi.value, c), false) then 1 else 0 end), 1)::numeric
  from preference_items pi
  join profiles c on c.id = p_cand
  where pi.user_id = p_viewer and pi.kind = 'soft'
$$;

-- Swipe guardrail: gender and age range must fit in BOTH directions.
create or replace function swipe_eligible(p_viewer uuid, p_cand uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from profiles v
    join preference_core vp on vp.user_id = v.id
    join profiles c on c.id = p_cand
    join preference_core cp on cp.user_id = c.id
    where v.id = p_viewer
      and c.gender = vp.seeking_gender and v.gender = cp.seeking_gender
      and age_years(c.date_of_birth) between vp.age_min and vp.age_max
      and age_years(v.date_of_birth) between cp.age_min and cp.age_max)
$$;

create or replace function primary_photo_path(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select storage_path from photos
  where user_id = p_user and moderation_status = 'approved'
  order by position limit 1
$$;

create or replace function require_active_user() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from profiles where id = v_uid and account_status = 'active') then
    raise exception 'account_not_active';
  end if;
  return v_uid;
end $$;

-- ---------------------------------------------------------------------
-- Public profile card (the only shape other users ever receive)
-- ---------------------------------------------------------------------
create type profile_card as (
  id                     uuid,
  display_name           text,
  age                    int,
  gender                 gender_t,
  height_cm              smallint,
  origin                 origin_t,
  current_city           text,
  residence_country_code char(2),
  residence_type         text,
  religion               religion_t,
  languages              text[],
  relationship_intent    intent_t,
  bio                    text,
  open_to_relocating     boolean,
  open_to_long_distance  boolean,
  is_photo_verified      boolean,
  primary_photo_path     text,
  match_score            int     -- percent of the viewer's soft preferences met; null in swipe deck
);

create or replace function to_card(c profiles, p_score numeric) returns profile_card
language sql stable set search_path = public as $$
  select row(c.id, c.display_name, age_years(c.date_of_birth), c.gender, c.height_cm, c.origin,
             c.current_city, c.residence_country_code, residence_type(c.residence_country_code),
             c.religion, c.languages, c.relationship_intent, c.bio, c.open_to_relocating,
             c.open_to_long_distance, c.is_photo_verified, primary_photo_path(c.id),
             case when p_score is null then null else round(p_score * 100)::int end)::profile_card
$$;

-- ---------------------------------------------------------------------
-- Discovery RPCs
-- ---------------------------------------------------------------------

-- Meets My Criteria: mutual hard match + soft threshold, ranked by soft score.
create or replace function get_meets_my_criteria(p_limit int default 20, p_offset int default 0)
returns setof profile_card
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
begin
  return query
    select (to_card(c, s.score)).*
    from profiles c
    cross join lateral (select soft_score(v_uid, c.id) as score) s
    where is_discoverable(v_uid, c.id)
      and meets_hard(v_uid, c.id)
      and meets_hard(c.id, v_uid)
      and s.score >= cfg_num('soft_match_threshold')
    order by s.score desc, c.last_active_at desc
    limit p_limit offset p_offset;
end $$;

-- Suggested (premium): you meet THEIR hard preferences, they do not meet YOURS.
create or replace function get_suggested(p_limit int default 20, p_offset int default 0)
returns setof profile_card
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
begin
  if user_tier(v_uid) <> 'premium' then raise exception 'premium_required'; end if;
  return query
    select (to_card(c, soft_score(v_uid, c.id))).*
    from profiles c
    join preference_core vp on vp.user_id = v_uid
    where is_discoverable(v_uid, c.id)
      and c.gender = vp.seeking_gender
      and meets_hard(c.id, v_uid)
      and not meets_hard(v_uid, c.id)
    order by c.last_active_at desc
    limit p_limit offset p_offset;
end $$;

-- Swipe deck: ignores criteria except mutual gender + age. Same country first, then same region type.
create or replace function get_swipe_deck(p_limit int default 20)
returns setof profile_card
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
        v_me profiles;
begin
  select * into v_me from profiles where id = v_uid;
  return query
    select (to_card(c, null)).*
    from profiles c
    where is_discoverable(v_uid, c.id)
      and swipe_eligible(v_uid, c.id)
      and not exists (select 1 from swipes s where s.swiper_id = v_uid and s.target_id = c.id)
    order by (c.residence_country_code = v_me.residence_country_code) desc,
             (residence_type(c.residence_country_code) = residence_type(v_me.residence_country_code)) desc,
             random()
    limit p_limit;
end $$;

create or replace function get_profile(p_user uuid) returns profile_card
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
        v_card profile_card;
begin
  if not is_discoverable(v_uid, p_user)
     and not exists (select 1 from conversations
                     where user_a = least(v_uid, p_user) and user_b = greatest(v_uid, p_user)) then
    raise exception 'not_found';
  end if;
  select to_card(c, soft_score(v_uid, c.id)) into v_card from profiles c where c.id = p_user;
  return v_card;
end $$;

create or replace function get_my_tier() returns tier_t
language sql stable security definer set search_path = public as $$
  select user_tier(auth.uid())
$$;

-- ---------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------

-- Usage counters for the UI (remaining chats and swipes today, in UTC days).
create or replace function get_my_limits() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
        v_tier tier_t := user_tier(v_uid);
        v_chat_limit int;
        v_swipe_limit int;
        v_chats int;
        v_swipes int;
begin
  v_chat_limit := case when v_tier = 'free' then cfg_num('free_new_chats_per_day')
                       else cfg_num('unlimited_new_chats_safety_cap') end;
  v_swipe_limit := case when v_tier = 'premium' then cfg_num('premium_swipes_per_day')
                        else cfg_num('free_swipes_per_day') end;
  select count(*) into v_chats from conversations
    where initiated_by = v_uid and counts_toward_limit and created_at >= date_trunc('day', now());
  select count(*) into v_swipes from swipes
    where swiper_id = v_uid and created_at >= date_trunc('day', now());
  return jsonb_build_object(
    'tier', v_tier,
    'new_chats_used', v_chats, 'new_chats_limit', v_chat_limit,
    'show_chat_limit', v_tier = 'free',   -- locals and premium see "unlimited"
    'swipes_used', v_swipes, 'swipes_limit', v_swipe_limit);
end $$;

-- Start (or reopen) a conversation.
-- Core rule: you can only message someone whose hard preferences YOU meet.
--   Criteria path:  you also meet each other's hard preferences (anyone).
--   Suggested path: they do not meet yours, you make an exception (premium).
create or replace function start_conversation(p_target uuid) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
        v_existing uuid;
        v_origin convo_origin_t;
        v_tier tier_t;
        v_limit int;
        v_used int;
        v_id uuid;
begin
  select id into v_existing from conversations
    where user_a = least(v_uid, p_target) and user_b = greatest(v_uid, p_target);
  if v_existing is not null then
    if is_blocked_between(v_uid, p_target) then raise exception 'not_permitted'; end if;
    return v_existing;
  end if;

  if not is_discoverable(v_uid, p_target) then raise exception 'not_permitted'; end if;
  if not meets_hard(p_target, v_uid) then raise exception 'not_permitted'; end if;

  v_tier := user_tier(v_uid);
  if meets_hard(v_uid, p_target) then
    v_origin := 'criteria';
  elsif v_tier = 'premium' then
    v_origin := 'suggested';
  else
    raise exception 'premium_required';
  end if;

  v_limit := case when v_tier = 'free' then cfg_num('free_new_chats_per_day')
                  else cfg_num('unlimited_new_chats_safety_cap') end;
  select count(*) into v_used from conversations
    where initiated_by = v_uid and counts_toward_limit and created_at >= date_trunc('day', now());
  if v_used >= v_limit then raise exception 'daily_new_chat_limit_reached'; end if;

  insert into conversations (user_a, user_b, initiated_by, origin, counts_toward_limit)
    values (least(v_uid, p_target), greatest(v_uid, p_target), v_uid, v_origin, true)
    returning id into v_id;
  return v_id;
end $$;

create or replace function get_my_conversations() returns table (
  conversation_id   uuid,
  other_user_id     uuid,
  other_name        text,
  other_photo_path  text,
  other_verified    boolean,
  origin            convo_origin_t,
  last_message      text,
  last_message_at   timestamptz,
  unread_count      int
)
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
begin
  return query
    select cv.id,
           o.id,
           o.display_name,
           primary_photo_path(o.id),
           o.is_photo_verified,
           cv.origin,
           (select m.body from messages m where m.conversation_id = cv.id order by m.created_at desc limit 1),
           coalesce(cv.last_message_at, cv.created_at),
           (select count(*)::int from messages m
             where m.conversation_id = cv.id and m.sender_id <> v_uid and m.read_at is null)
    from conversations cv
    join profiles o on o.id = case when cv.user_a = v_uid then cv.user_b else cv.user_a end
    where v_uid in (cv.user_a, cv.user_b)
      and not is_blocked_between(cv.user_a, cv.user_b)
      and o.account_status = 'active'
    order by coalesce(cv.last_message_at, cv.created_at) desc;
end $$;

create or replace function mark_conversation_read(p_conversation uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
begin
  update messages m set read_at = now()
  from conversations cv
  where m.conversation_id = cv.id and cv.id = p_conversation
    and v_uid in (cv.user_a, cv.user_b)
    and m.sender_id <> v_uid and m.read_at is null;
end $$;

-- ---------------------------------------------------------------------
-- Swipes
-- ---------------------------------------------------------------------
create or replace function record_swipe(p_target uuid, p_direction swipe_dir_t) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
        v_limit int;
        v_used int;
        v_convo uuid;
begin
  if not is_discoverable(v_uid, p_target) or not swipe_eligible(v_uid, p_target) then
    raise exception 'not_permitted';
  end if;

  v_limit := case when user_tier(v_uid) = 'premium' then cfg_num('premium_swipes_per_day')
                  else cfg_num('free_swipes_per_day') end;
  select count(*) into v_used from swipes
    where swiper_id = v_uid and created_at >= date_trunc('day', now());
  if v_used >= v_limit then raise exception 'daily_swipe_limit_reached'; end if;

  insert into swipes (swiper_id, target_id, direction) values (v_uid, p_target, p_direction)
    on conflict (swiper_id, target_id) do nothing;

  if p_direction = 'like' and exists (select 1 from swipes
       where swiper_id = p_target and target_id = v_uid and direction = 'like') then
    -- Mutual like: open a chat that does NOT count toward the daily limit.
    insert into conversations (user_a, user_b, initiated_by, origin, counts_toward_limit)
      values (least(v_uid, p_target), greatest(v_uid, p_target), v_uid, 'swipe_match', false)
      on conflict (user_a, user_b) do nothing;
    select id into v_convo from conversations
      where user_a = least(v_uid, p_target) and user_b = greatest(v_uid, p_target);
    return jsonb_build_object('matched', true, 'conversation_id', v_convo);
  end if;

  return jsonb_build_object('matched', false);
end $$;

-- Premium: undo the most recent swipe (not allowed once it created a match).
create or replace function undo_last_swipe() returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
        v_target uuid;
begin
  if user_tier(v_uid) <> 'premium' then raise exception 'premium_required'; end if;
  select target_id into v_target from swipes
    where swiper_id = v_uid order by created_at desc limit 1;
  if v_target is null then return null; end if;
  if exists (select 1 from conversations
             where user_a = least(v_uid, v_target) and user_b = greatest(v_uid, v_target)
               and origin = 'swipe_match') then
    raise exception 'cannot_undo_match';
  end if;
  delete from swipes where swiper_id = v_uid and target_id = v_target;
  return v_target;
end $$;

-- Everyone: how many people liked you that you have not swiped on yet.
create or replace function get_likes_received_count() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int
  from swipes s
  where s.target_id = auth.uid() and s.direction = 'like'
    and is_discoverable(auth.uid(), s.swiper_id)
    and not exists (select 1 from swipes m where m.swiper_id = auth.uid() and m.target_id = s.swiper_id)
$$;

-- Premium: the full list of people who liked you.
create or replace function get_likes_received(p_limit int default 50) returns setof profile_card
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
begin
  if user_tier(v_uid) <> 'premium' then raise exception 'premium_required'; end if;
  return query
    select (to_card(c, null)).*
    from swipes s
    join profiles c on c.id = s.swiper_id
    where s.target_id = v_uid and s.direction = 'like'
      and is_discoverable(v_uid, c.id)
      and not exists (select 1 from swipes m where m.swiper_id = v_uid and m.target_id = c.id)
    order by s.created_at desc
    limit p_limit;
end $$;

create or replace function get_daily_picks() returns setof profile_card
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
begin
  if user_tier(v_uid) <> 'premium' then raise exception 'premium_required'; end if;
  return query
    select (to_card(c, soft_score(v_uid, c.id))).*
    from daily_picks d
    join profiles c on c.id = d.pick_user_id
    where d.user_id = v_uid and d.pick_date = current_date
      and is_discoverable(v_uid, c.id);
end $$;

-- ---------------------------------------------------------------------
-- Triggers: integrity rules the app cannot bypass
-- ---------------------------------------------------------------------

-- 18+ only.
create or replace function enforce_age_gate() returns trigger
language plpgsql as $$
begin
  if new.date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'must_be_18';
  end if;
  return new;
end $$;

create trigger profiles_age_gate before insert on profiles
  for each row execute function enforce_age_gate();

-- App users cannot grant themselves premium, verification, status changes, or change DOB.
create or replace function protect_profile_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_end_user() or is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.is_premium := false;
    new.premium_expires_at := null;
    new.is_photo_verified := false;
    new.account_status := 'active';
    return new;
  end if;
  if new.is_premium         is distinct from old.is_premium
     or new.premium_expires_at is distinct from old.premium_expires_at
     or new.is_photo_verified  is distinct from old.is_photo_verified
     or new.account_status     is distinct from old.account_status
     or new.date_of_birth      is distinct from old.date_of_birth then
    raise exception 'protected_field';
  end if;
  return new;
end $$;

create trigger profiles_protect before insert or update on profiles
  for each row execute function protect_profile_columns();

-- Residence rules: a local-tier country requires a local-tier phone number,
-- and residence can change only once per cooldown period.
create or replace function enforce_residence_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_phone text;
begin
  if tg_op = 'UPDATE' and new.residence_country_code is not distinct from old.residence_country_code then
    return new;
  end if;

  if tg_op = 'UPDATE' and is_end_user() and not is_admin()
     and old.residence_changed_at > now() - make_interval(days => cfg_num('location_change_cooldown_days')::int) then
    raise exception 'residence_change_cooldown';
  end if;

  if residence_type(new.residence_country_code) = 'home' then
    select ltrim(coalesce(phone, ''), '+') into v_phone from auth.users where id = new.id;
    if not exists (select 1 from local_tier_countries
                   where active and v_phone like phone_prefix || '%') then
      raise exception 'local_residence_requires_local_phone';
    end if;
  end if;

  new.residence_changed_at := now();
  return new;
end $$;

create trigger profiles_residence before insert or update on profiles
  for each row execute function enforce_residence_rules();

create or replace function touch_conversation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;

create trigger messages_touch after insert on messages
  for each row execute function touch_conversation();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table app_config            enable row level security;
alter table local_tier_countries  enable row level security;
alter table admins                enable row level security;
alter table profiles              enable row level security;
alter table preference_core       enable row level security;
alter table preference_items      enable row level security;
alter table photos                enable row level security;
alter table verification_requests enable row level security;
alter table swipes                enable row level security;
alter table conversations         enable row level security;
alter table messages              enable row level security;
alter table blocks                enable row level security;
alter table reports               enable row level security;
alter table moderation_actions    enable row level security;
alter table push_tokens           enable row level security;
alter table daily_picks           enable row level security;

-- Reference data: readable by app users, editable by admins.
create policy config_read  on app_config for select to authenticated using (true);
create policy config_admin on app_config for all    to authenticated using (is_admin()) with check (is_admin());
create policy ltc_read     on local_tier_countries for select to authenticated using (true);
create policy ltc_admin    on local_tier_countries for all    to authenticated using (is_admin()) with check (is_admin());
create policy admins_admin on admins for select to authenticated using (is_admin());

-- Profiles: own row only. Other users' profiles come through RPCs.
create policy profiles_own_select on profiles for select to authenticated using (id = auth.uid() or is_admin());
create policy profiles_own_insert on profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_own_update on profiles for update to authenticated
  using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());

create policy prefcore_own on preference_core  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy prefitems_own on preference_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Photos: owners manage their own; others see approved photos of discoverable users.
create policy photos_own_select on photos for select to authenticated using (user_id = auth.uid());
create policy photos_own_insert on photos for insert to authenticated
  with check (user_id = auth.uid() and moderation_status = 'pending');
create policy photos_own_delete on photos for delete to authenticated using (user_id = auth.uid());
create policy photos_public on photos for select to authenticated
  using (moderation_status = 'approved' and is_discoverable(auth.uid(), user_id));
create policy photos_admin on photos for all to authenticated using (is_admin()) with check (is_admin());

create policy verif_own_insert on verification_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy verif_own_select on verification_requests for select to authenticated
  using (user_id = auth.uid() or is_admin());
create policy verif_admin on verification_requests for update to authenticated
  using (is_admin()) with check (is_admin());

-- Swipes: write only through record_swipe(); you may read your own.
create policy swipes_own_select on swipes for select to authenticated using (swiper_id = auth.uid());

-- Conversations: create only through RPCs; participants may read.
create policy convo_participant_select on conversations for select to authenticated
  using (auth.uid() in (user_a, user_b) and not is_blocked_between(user_a, user_b));

create policy messages_participant_select on messages for select to authenticated
  using (exists (select 1 from conversations cv
                 where cv.id = conversation_id and auth.uid() in (cv.user_a, cv.user_b)
                   and not is_blocked_between(cv.user_a, cv.user_b)));
create policy messages_participant_insert on messages for insert to authenticated
  with check (sender_id = auth.uid()
              and exists (select 1 from profiles p where p.id = auth.uid() and p.account_status = 'active')
              and exists (select 1 from conversations cv
                          where cv.id = conversation_id and auth.uid() in (cv.user_a, cv.user_b)
                            and not is_blocked_between(cv.user_a, cv.user_b)));

create policy blocks_own on blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy reports_insert on reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open');
create policy reports_select on reports for select to authenticated
  using (reporter_id = auth.uid() or is_admin());
create policy reports_admin on reports for update to authenticated using (is_admin()) with check (is_admin());

create policy modactions_admin on moderation_actions for all to authenticated using (is_admin()) with check (is_admin());

create policy push_own on push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy picks_own on daily_picks for select to authenticated using (user_id = auth.uid());

-- Matching internals should not be callable directly from the app (they would
-- reveal who meets whose criteria). They still run inside the RPCs above.
revoke execute on function meets_hard(uuid, uuid), soft_score(uuid, uuid), swipe_eligible(uuid, uuid),
                           user_tier(uuid), primary_photo_path(uuid)
  from public, anon, authenticated;

-- Realtime: stream new messages to chat screens.
-- (Run in Supabase; the publication exists there by default.)
-- alter publication supabase_realtime add table messages;
