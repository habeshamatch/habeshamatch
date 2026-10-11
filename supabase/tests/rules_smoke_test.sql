-- Smoke test for database rules. Run against LOCAL Supabase only (never production),
-- on an EMPTY database (the expected results assume only these test users exist):
--   supabase db reset --no-seed
--   psql <DB URL shown by 'supabase status'> -f supabase/tests/rules_smoke_test.sql
-- Every line of output should read 'ok', a name, or an expected value. Any 'FAIL' is a bug.
-- Run 'supabase db reset' afterwards to clear the test data and load the seed again.

\set ON_ERROR_STOP 1
create or replace function public.t_err(p_sql text, p_expected text) returns text language plpgsql as $$
begin execute p_sql; return 'FAIL (no error) ' || p_sql;
exception when others then
  return case when sqlerrm = p_expected then 'ok: ' || p_expected else 'FAIL got ' || sqlerrm || ' expected ' || p_expected end;
end $$;
grant execute on function public.t_err(text,text) to authenticated;

-- users (phones verified, as onboarding requires before a profile can exist)
insert into auth.users (id, phone, phone_confirmed_at) values
 ('00000000-0000-0000-0000-00000000000a','14035550001', now()),
 ('00000000-0000-0000-0000-00000000000b','14035550002', now()),
 ('00000000-0000-0000-0000-00000000000c','251911000001', now()),
 ('00000000-0000-0000-0000-00000000000d','251911000002', now()),
 ('00000000-0000-0000-0000-00000000000e','14035550005', now()),
 ('00000000-0000-0000-0000-00000000000f','14035550006', now());
-- users who have NOT verified a phone: one with an unconfirmed number, one with none
insert into auth.users (id, phone, phone_confirmed_at) values
 ('00000000-0000-0000-0000-000000000010','14035550010', null),
 ('00000000-0000-0000-0000-000000000011', null, null);

-- service-role context (no JWT role) for seeding
insert into profiles (id, display_name, date_of_birth, gender, height_cm, origin, residence_country_code, religion, languages, relationship_intent) values
 ('00000000-0000-0000-0000-00000000000a','Abel',  current_date - interval '30 years','male',  178,'eritrea','CA','orthodox','{ti,en}','marriage'),
 ('00000000-0000-0000-0000-00000000000b','Bethel',current_date - interval '28 years','female',165,'eritrea','CA','orthodox','{ti,en}','marriage'),
 ('00000000-0000-0000-0000-00000000000c','Chaltu',current_date - interval '26 years','female',160,'ethiopia','ET','muslim','{am}','marriage'),
 ('00000000-0000-0000-0000-00000000000d','Dawit', current_date - interval '27 years','male',  175,'ethiopia','ET','orthodox','{am}','marriage');

select t_err($$insert into profiles (id, display_name, date_of_birth, gender, origin, residence_country_code, religion, relationship_intent)
  values ('00000000-0000-0000-0000-00000000000e','Eden', current_date - interval '25 years','female','ethiopia','ET','orthodox','marriage')$$,
  'local_residence_requires_local_phone') as local_phone_rule;
select t_err($$insert into profiles (id, display_name, date_of_birth, gender, origin, residence_country_code, religion, relationship_intent)
  values ('00000000-0000-0000-0000-00000000000f','Feven', current_date - interval '17 years','female','ethiopia','CA','orthodox','marriage')$$,
  'must_be_18') as age_gate;
select t_err($$insert into profiles (id, display_name, date_of_birth, gender, origin, residence_country_code, religion, relationship_intent)
  values ('00000000-0000-0000-0000-000000000010','Gelila', current_date - interval '25 years','female','eritrea','CA','orthodox','marriage')$$,
  'phone_not_verified') as unconfirmed_phone_blocked;

-- the same check when a user creates their own profile from the app
set role authenticated;
set request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000011"}';
select t_err($$insert into profiles (id, display_name, date_of_birth, gender, origin, residence_country_code, religion, relationship_intent)
  values ('00000000-0000-0000-0000-000000000011','Haben', current_date - interval '25 years','male','eritrea','CA','orthodox','marriage')$$,
  'phone_not_verified') as no_phone_blocked_in_app;
reset role; set request.jwt.claims = '{}';

insert into preference_core values
 ('00000000-0000-0000-0000-00000000000a','female',25,35),
 ('00000000-0000-0000-0000-00000000000b','male',25,35),
 ('00000000-0000-0000-0000-00000000000c','male',25,40),
 ('00000000-0000-0000-0000-00000000000d','female',22,30);
insert into preference_items (user_id, attribute, kind, value) values
 ('00000000-0000-0000-0000-00000000000a','religion','hard','["orthodox"]'),
 ('00000000-0000-0000-0000-00000000000a','languages','soft','["ti"]'),
 ('00000000-0000-0000-0000-00000000000a','height','soft','{"min":160,"max":170}');
insert into photos (user_id, storage_path, position, moderation_status)
 select id, id::text || '/1.jpg', 1, 'approved' from profiles;

-- ===== act as Abel (free, Canada) =====
set role authenticated;
set request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a"}';

select 'tier' t, get_my_tier();
select 'criteria' t, display_name, match_score from get_meets_my_criteria();       -- expect Bethel 100
select t_err('select * from get_suggested()', 'premium_required') as suggested_locked;
select t_err($$select start_conversation('00000000-0000-0000-0000-00000000000c')$$, 'premium_required') as suggested_msg_locked;
select t_err($$update profiles set is_premium = true where id = auth.uid()$$, 'protected_field') as protect_premium;
select t_err($$select meets_hard(auth.uid(), auth.uid())$$, 'permission denied for function meets_hard') as internals_hidden;
select count(*) as can_read_others_profiles from profiles;                         -- expect 1 (own)
select 'deck' t, display_name, match_score from get_swipe_deck();                   -- Bethel then Chaltu (same country first)
select 'chat with Bethel' t, start_conversation('00000000-0000-0000-0000-00000000000b') is not null;
select get_my_limits();
reset role; set request.jwt.claims = '{}';
update app_config set value = '1' where key = 'free_new_chats_per_day';
update profiles set is_premium = true, premium_expires_at = now() + interval '30 days' where id = '00000000-0000-0000-0000-00000000000a';

-- ===== Abel premium =====
set role authenticated; set request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a"}';
select 'tier' t, get_my_tier();
select 'suggested' t, display_name from get_suggested();                            -- expect Chaltu
select 'msg Chaltu' t, start_conversation('00000000-0000-0000-0000-00000000000c') is not null;
select 'swipe Bethel' t, record_swipe('00000000-0000-0000-0000-00000000000b','like');

-- ===== Bethel (free) likes back =====
set request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000b"}';
select 'likes count' t, get_likes_received_count();                                  -- expect 1
select t_err('select * from get_likes_received()', 'premium_required') as likes_list_locked;
select 'swipe back' t, record_swipe('00000000-0000-0000-0000-00000000000a','like');  -- matched true
select 'convos' t, other_name, origin from get_my_conversations();
insert into messages (conversation_id, sender_id, body)
  select conversation_id, auth.uid(), 'Selam!' from get_my_conversations() limit 1;
insert into blocks values ('00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000a');

-- ===== Abel after block =====
set request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a"}';
select 'convos after block' t, count(*) from get_my_conversations();               -- expect 1 (Chaltu only)
select 'criteria after block' t, count(*) from get_meets_my_criteria();             -- expect 0

-- ===== Dawit (local) =====
set request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000d"}';
select 'tier' t, get_my_tier();
select t_err($$update profiles set residence_country_code = 'CA' where id = auth.uid()$$, 'residence_change_cooldown') as cooldown;
reset role; set request.jwt.claims = '{}';
update app_config set value = '1' where key = 'free_swipes_per_day';
set role authenticated;
set request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000d"}';
select 'swipe 1' t, record_swipe('00000000-0000-0000-0000-00000000000c','pass');
select t_err($$select record_swipe('00000000-0000-0000-0000-00000000000b','like')$$, 'daily_swipe_limit_reached') as swipe_cap;

-- ===== free daily chat limit =====
reset role; set request.jwt.claims = '{}';
update app_config set value = '0' where key = 'free_new_chats_per_day';
set role authenticated;
set request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000b"}';
select t_err($$select start_conversation('00000000-0000-0000-0000-00000000000d')$$, 'daily_new_chat_limit_reached') as free_chat_cap;
reset role;
