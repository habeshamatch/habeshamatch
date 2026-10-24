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

-- Every member must be approved (selfie verified + approved photo) to take part.
update profiles set is_photo_verified = true;

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

-- ===== an UNAPPROVED member (Dawit's selfie not verified yet) =====
update profiles set is_photo_verified = false where id = '00000000-0000-0000-0000-00000000000d';
set role authenticated;
set request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000d"}';
select t_err('select * from get_meets_my_criteria()', 'approval_pending') as unapproved_cannot_browse;
select t_err('select * from get_swipe_deck()', 'approval_pending') as unapproved_cannot_swipe_deck;
select t_err($$select record_swipe('00000000-0000-0000-0000-00000000000c', 'pass')$$, 'approval_pending') as unapproved_cannot_swipe;
select t_err($$select start_conversation('00000000-0000-0000-0000-00000000000c')$$, 'approval_pending') as unapproved_cannot_chat;
select t_err($$select get_profile('00000000-0000-0000-0000-00000000000c')$$, 'approval_pending') as unapproved_cannot_view_profiles;
select t_err($$insert into verification_requests (user_id, selfie_path, pose) values (auth.uid(), auth.uid()::text || '/s.jpg', 'Thumbs up')$$,
  'two_photos_required') as submit_needs_two_photos;
insert into photos (user_id, storage_path, position) values (auth.uid(), auth.uid()::text || '/2.jpg', 2);
insert into verification_requests (user_id, selfie_path, pose, status, rejection_reason)
  values (auth.uid(), auth.uid()::text || '/s.jpg', 'Thumbs up', 'approved', 'self-approved?');
select 'submission stored as' t, status, rejection_reason is null from verification_requests where user_id = auth.uid();  -- pending t
select t_err($$insert into verification_requests (user_id, selfie_path) values (auth.uid(), auth.uid()::text || '/s2.jpg')$$,
  'duplicate key value violates unique constraint "verification_one_pending"') as one_pending_submission;
reset role; set request.jwt.claims = '{}';
set role authenticated;
set request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000c"}';
select 'unapproved Dawit visible to Chaltu' t, count(*) from get_swipe_deck() where display_name = 'Dawit';  -- 0
reset role; set request.jwt.claims = '{}';
delete from photos where storage_path like '00000000-0000-0000-0000-00000000000d/2.jpg';
update profiles set is_photo_verified = true where id = '00000000-0000-0000-0000-00000000000d';

-- ===== act as Abel (free, Canada) =====
set role authenticated;
set request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a"}';

select 'tier' t, get_my_tier();
select 'criteria' t, display_name, match_score from get_meets_my_criteria();       -- expect Bethel 100
select t_err('select * from get_suggested()', 'premium_required') as suggested_locked;
select t_err($$select start_conversation('00000000-0000-0000-0000-00000000000c')$$, 'premium_required') as suggested_msg_locked;
select t_err('select * from get_daily_picks()', 'premium_required') as picks_locked;
select t_err('select undo_last_swipe()', 'premium_required') as undo_locked;
select t_err('select generate_daily_picks()', 'permission denied for function generate_daily_picks') as picks_job_hidden;
select t_err($$update profiles set is_premium = true where id = auth.uid()$$, 'protected_field') as protect_premium;
select t_err($$select meets_hard(auth.uid(), auth.uid())$$, 'permission denied for function meets_hard') as internals_hidden;
select count(*) as can_read_others_profiles from profiles;                         -- expect 1 (own)
select 'deck' t, display_name, match_score from get_swipe_deck();                   -- Bethel then Chaltu (same country first)
-- photos: owner adds a second photo (always pending), then reorders
insert into photos (user_id, storage_path, position) values (auth.uid(), auth.uid()::text || '/2.jpg', 2);
select t_err($$insert into photos (user_id, storage_path, position, moderation_status)
  values (auth.uid(), auth.uid()::text || '/3.jpg', 3, 'approved')$$,
  'new row violates row-level security policy for table "photos"') as photo_insert_must_be_pending;
select reorder_my_photos(array(select id from photos where user_id = auth.uid() order by position desc));
select 'photo order after reorder' t, string_agg(storage_path, ' > ' order by position) from photos where user_id = auth.uid();  -- .../2.jpg > .../1.jpg
select t_err($$select reorder_my_photos(array(select id from photos where user_id = auth.uid() limit 1))$$, 'not_permitted') as reorder_needs_all;
select t_err($$select reorder_my_photos(array(select id from photos where user_id = auth.uid()) || (select id from photos where storage_path like '00000000-0000-0000-0000-00000000000b/%' limit 1))$$, 'not_permitted') as reorder_others_blocked;
update photos set moderation_status = 'approved' where user_id = auth.uid() and moderation_status = 'pending';  -- no UPDATE policy: changes nothing
select 'still pending after self-approve attempt' t, count(*) from photos where user_id = auth.uid() and moderation_status = 'pending';  -- expect 1
select 'profile Bethel' t, display_name, age, match_score from get_profile('00000000-0000-0000-0000-00000000000b');  -- Bethel, 28, 100
select t_err($$select get_profile('00000000-0000-0000-0000-000000000099')$$, 'not_found') as profile_unknown_user;
select 'chat with Bethel' t, start_conversation('00000000-0000-0000-0000-00000000000b') is not null;
select 'criteria leaves out chats' t, count(*) from get_meets_my_criteria();          -- expect 0 (Bethel is in Messages now)
select 'country filter' t, count(*) from get_meets_my_criteria(20, 0, array['ZZ']);   -- expect 0 (nobody lives there)
select 'filter countries' t, count(*) from get_meets_my_criteria_countries();          -- expect 0 (Bethel left out)
select get_my_limits();
reset role; set request.jwt.claims = '{}';
update app_config set value = '1' where key = 'free_new_chats_per_day';
update profiles set is_premium = true, premium_expires_at = now() + interval '30 days' where id = '00000000-0000-0000-0000-00000000000a';

-- ===== Abel premium =====
set role authenticated; set request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a"}';
select 'tier' t, get_my_tier();
select 'suggested' t, display_name from get_suggested();                            -- expect Chaltu
select 'daily picks' t, display_name from get_daily_picks();                         -- expect no rows: Bethel already has a chat, Chaltu fails Abel's must-haves
select 'msg Chaltu' t, start_conversation('00000000-0000-0000-0000-00000000000c') is not null;
select 'swipe Bethel' t, record_swipe('00000000-0000-0000-0000-00000000000b','like');
select 'undo' t, undo_last_swipe() = '00000000-0000-0000-0000-00000000000b';         -- t
select 'swipe Bethel again' t, record_swipe('00000000-0000-0000-0000-00000000000b','like');

-- ===== Bethel (free) likes back =====
set request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000b"}';
select 'likes count' t, get_likes_received_count();                                  -- expect 1
select t_err('select * from get_likes_received()', 'premium_required') as likes_list_locked;
select 'swipe back' t, record_swipe('00000000-0000-0000-0000-00000000000a','like');  -- matched true
select 'convos' t, other_name, origin from get_my_conversations();
insert into messages (conversation_id, sender_id, body)
  select conversation_id, auth.uid(), 'Selam!' from get_my_conversations() limit 1;
-- the server sets the time and unread state, whatever the app sends
insert into messages (conversation_id, sender_id, body, created_at, read_at)
  select conversation_id, auth.uid(), 'Backdated?', now() - interval '3 days', now() from get_my_conversations() limit 1;
select 'message time forced to now, unread' t, created_at > now() - interval '1 minute', read_at is null from messages where body = 'Backdated?';  -- t t
select t_err($$insert into messages (conversation_id, sender_id, body)
  select conversation_id, '00000000-0000-0000-0000-00000000000a', 'Spoofed' from get_my_conversations() limit 1$$,
  'new row violates row-level security policy for table "messages"') as cannot_send_as_someone_else;
select t_err($$insert into messages (conversation_id, sender_id, body)
  select conversation_id, auth.uid(), repeat('x', 2001) from get_my_conversations() limit 1$$,
  'new row for relation "messages" violates check constraint "messages_body_check"') as message_max_2000;
insert into blocks values ('00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000a');
select 'blocked list' t, display_name from get_my_blocked_users();  -- Abel
-- reports: always open, moderation fields cleared, cannot report as someone else
insert into reports (reporter_id, reported_id, category, details, action_taken, resolved_at)
  values (auth.uid(), '00000000-0000-0000-0000-00000000000a', 'harassment', 'Rude messages', 'banned', now());
select 'report stored as' t, status, action_taken is null, resolved_at is null from reports where reporter_id = auth.uid();  -- open t t
select t_err($$insert into reports (reporter_id, reported_id, category) values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a', 'spam')$$,
  'new row violates row-level security policy for table "reports"') as cannot_report_as_other;
select t_err($$insert into reports (reporter_id, reported_id, category, status) values (auth.uid(), '00000000-0000-0000-0000-00000000000a', 'spam', 'dismissed')$$,
  'new row violates row-level security policy for table "reports"') as report_must_be_open;

-- ===== Abel after block =====
set request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000a"}';
select 'convos after block' t, count(*) from get_my_conversations();               -- expect 1 (Chaltu only)
select 'criteria after block' t, count(*) from get_meets_my_criteria();             -- expect 0
select t_err($$select get_profile('00000000-0000-0000-0000-00000000000b')$$, 'not_found') as profile_hidden_after_block;  -- shared chat, but blocked

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

-- ===== education preference (checked directly, as the matching internals are not callable by users) =====
update profiles set education_level = 'masters' where id = '00000000-0000-0000-0000-00000000000b';
insert into preference_items (user_id, attribute, kind, value) values
 ('00000000-0000-0000-0000-00000000000a','education','hard','["bachelors","masters","doctorate"]');
select 'education: masters meets degree must-have' t, pref_item_met('education', '["bachelors","masters","doctorate"]', p) from profiles p where id = '00000000-0000-0000-0000-00000000000b';  -- t
update profiles set education_level = 'high_school' where id = '00000000-0000-0000-0000-00000000000b';
select 'education: high school fails it' t, pref_item_met('education', '["bachelors","masters","doctorate"]', p) from profiles p where id = '00000000-0000-0000-0000-00000000000b';  -- f
update profiles set education_level = null where id = '00000000-0000-0000-0000-00000000000b';
select 'education: not answered fails it' t, coalesce(pref_item_met('education', '["bachelors"]', p), false) from profiles p where id = '00000000-0000-0000-0000-00000000000b';  -- f

-- ===== income preference: "at least" a bracket =====
update profiles set income_range = '75k_100k' where id = '00000000-0000-0000-0000-00000000000b';
select 'income: 75-100k meets at least 50k' t, pref_item_met('income', '{"min":"50k_75k"}', p) from profiles p where id = '00000000-0000-0000-0000-00000000000b';  -- t
select 'income: 75-100k meets at least 75k' t, pref_item_met('income', '{"min":"75k_100k"}', p) from profiles p where id = '00000000-0000-0000-0000-00000000000b';  -- t
select 'income: 75-100k fails at least 100k' t, pref_item_met('income', '{"min":"100k_150k"}', p) from profiles p where id = '00000000-0000-0000-0000-00000000000b';  -- f
update profiles set income_range = 'prefer_not_to_say' where id = '00000000-0000-0000-0000-00000000000b';
select 'income: prefer not to say fails' t, pref_item_met('income', '{"min":"under_10k"}', p) from profiles p where id = '00000000-0000-0000-0000-00000000000b';  -- f
update profiles set income_range = null where id = '00000000-0000-0000-0000-00000000000b';
select 'income: not answered fails' t, coalesce(pref_item_met('income', '{"min":"under_10k"}', p), false) from profiles p where id = '00000000-0000-0000-0000-00000000000b';  -- f

-- ===== family and lifestyle preferences =====
update profiles set smoking = 'never', wants_children = 'yes', marital_status = 'never_married' where id = '00000000-0000-0000-0000-00000000000b';
select 'lifestyle: never smokes meets [never,trying_to_quit]' t, pref_item_met('smoking', '["never","trying_to_quit"]', p) from profiles p where id = '00000000-0000-0000-0000-00000000000b';  -- t
select 'lifestyle: wants children fails [no]' t, pref_item_met('wants_children', '["no"]', p) from profiles p where id = '00000000-0000-0000-0000-00000000000b';  -- f
select 'lifestyle: drinking not answered fails' t, coalesce(pref_item_met('drinking', '["never"]', p), false) from profiles p where id = '00000000-0000-0000-0000-00000000000b';  -- f
select 'card shows lifestyle' t, smoking, wants_children, marital_status from to_card((select p from profiles p where id = '00000000-0000-0000-0000-00000000000b'), null);  -- never yes never_married
select t_err($$update profiles set interests = array['a','b','c','d','e','f','g','h','i'] where id = '00000000-0000-0000-0000-00000000000b'$$,
  'new row for relation "profiles" violates check constraint "profiles_interests_check"') as interests_max_8;
