-- Push notifications (Prompt 5.2).
--
-- The database decides WHO gets WHAT (blocks, account status, each member's settings); the
-- send-push edge function only delivers through Expo's push service and removes dead tokens.
-- Notifications:
--   message  a new message, to the other person in the chat
--   match    a mutual like (swipe match), to the person who liked first
--   picks    today's picks are ready (Premium), once a day around 9 am in the member's own time
--            zone (from their phone), by an hourly job
-- The function's address and password live in Supabase Vault ('push_function_url',
-- 'push_function_secret'); while either is missing nothing is sent (tests, fresh databases).

create extension if not exists pg_net with schema extensions;

-- Settings, all on by default; members change them in Profile > Notifications.
alter table profiles
  add column notify_messages boolean not null default true,
  add column notify_matches  boolean not null default true,
  add column notify_picks    boolean not null default true,
  add column picks_notified_on date; -- last local day a picks notification was sent

-- One owner per phone: when someone else signs in on the same phone, the token moves to them.
alter table push_tokens
  add column time_zone  text check (char_length(time_zone) <= 64),
  add column updated_at timestamptz not null default now();
create unique index push_tokens_token_key on push_tokens (token);

create or replace function register_push_token(p_token text, p_platform text, p_time_zone text default null)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
begin
  if p_token is null or char_length(p_token) > 300 or p_platform not in ('ios', 'android') then
    raise exception 'not_permitted';
  end if;
  insert into push_tokens (user_id, token, platform, time_zone)
    values (v_uid, p_token, p_platform, left(p_time_zone, 64))
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform,
        time_zone = excluded.time_zone, updated_at = now();
end $$;

-- On sign out: this phone stops getting this member's notifications.
create or replace function unregister_push_token(p_token text) returns void
language sql volatile security definer set search_path = public as $$
  delete from push_tokens where token = p_token and user_id = auth.uid();
$$;

-- Queues one notification for a member, if they want this kind and have a phone registered.
create or replace function notify_member(p_user uuid, p_kind text, p_title text, p_body text, p_data jsonb)
returns boolean
language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_url text;
        v_secret text;
        v_wants boolean;
begin
  select case p_kind when 'message' then notify_messages
                     when 'match'   then notify_matches
                     when 'picks'   then notify_picks end
    into v_wants
    from profiles where id = p_user and account_status = 'active';
  if not coalesce(v_wants, false) then return false; end if;
  if not exists (select 1 from push_tokens where user_id = p_user) then return false; end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_function_secret';
  if v_url is null or v_secret is null then return false; end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('user_id', p_user, 'title', p_title, 'body', p_body,
                               'data', coalesce(p_data, '{}'::jsonb) || jsonb_build_object('type', p_kind)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', v_secret),
    timeout_milliseconds := 5000);
  return true;
end $$;

-- New message: tell the other person (never across a block).
create or replace function push_on_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_to uuid;
        v_from text;
begin
  select case when c.user_a = new.sender_id then c.user_b else c.user_a end into v_to
    from conversations c where c.id = new.conversation_id;
  if v_to is null or is_blocked_between(new.sender_id, v_to) then return new; end if;
  select display_name into v_from from profiles where id = new.sender_id;
  perform notify_member(v_to, 'message', coalesce(v_from, 'New message'),
                        left(new.body, 120), jsonb_build_object('conversation_id', new.conversation_id));
  return new;
exception when others then
  return new; -- a notification problem must never stop a message being sent
end $$;

create trigger messages_push after insert on messages
  for each row execute function push_on_message();

-- Swipe match: the person who just swiped sees the match on screen; tell the other one.
create or replace function push_on_match() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_to uuid;
        v_name text;
begin
  if new.origin <> 'swipe_match' then return new; end if;
  v_to := case when new.user_a = new.initiated_by then new.user_b else new.user_a end;
  select display_name into v_name from profiles where id = new.initiated_by;
  perform notify_member(v_to, 'match', 'It''s a match!',
                        format('You and %s like each other. Say hello.', coalesce(v_name, 'someone')),
                        jsonb_build_object('conversation_id', new.id));
  return new;
exception when others then
  return new;
end $$;

create trigger conversations_push after insert on conversations
  for each row execute function push_on_match();

-- Hourly: Premium members whose local time is 9 am or later (until 9 pm) and who have not been
-- told today get "your picks are ready". Uses the time zone of their most recent phone.
create or replace function notify_daily_picks() returns int
language plpgsql volatile security definer set search_path = public as $$
declare r record;
        v_count int;
        v_sent int := 0;
begin
  for r in
    select p.id,
           (now() at time zone t.tz)::date as local_day
    from profiles p
    cross join lateral (
      select coalesce((select pt.time_zone from push_tokens pt
                       where pt.user_id = p.id and pt.time_zone is not null
                         and exists (select 1 from pg_timezone_names z where z.name = pt.time_zone)
                       order by pt.updated_at desc limit 1), 'UTC') as tz) t
    where p.notify_picks
      and user_tier(p.id) = 'premium'
      and is_approved_member(p.id)
      and exists (select 1 from push_tokens pt where pt.user_id = p.id)
      and extract(hour from now() at time zone t.tz) between 9 and 20
      and p.picks_notified_on is distinct from (now() at time zone t.tz)::date
  loop
    perform generate_daily_picks_for(r.id);
    select count(*) into v_count from daily_picks d
      where d.user_id = r.id and d.pick_date = current_date
        and not exists (select 1 from conversations c
                        where c.user_a = least(r.id, d.pick_user_id) and c.user_b = greatest(r.id, d.pick_user_id));
    update profiles set picks_notified_on = r.local_day where id = r.id;
    if v_count > 0 and notify_member(r.id, 'picks', 'Your picks for today',
         format('%s %s chosen for you. Take a look.', v_count, case when v_count = 1 then 'person' else 'people' end),
         '{}'::jsonb) then
      v_sent := v_sent + 1;
    end if;
  end loop;
  return v_sent;
end $$;

revoke execute on function notify_member(uuid, text, text, text, jsonb), notify_daily_picks(),
  push_on_message(), push_on_match() from public, anon, authenticated;
revoke execute on function register_push_token(text, text, text), unregister_push_token(text) from public, anon;
grant execute on function register_push_token(text, text, text), unregister_push_token(text) to authenticated;

select cron.schedule('notify-daily-picks', '0 * * * *', 'select public.notify_daily_picks()');
