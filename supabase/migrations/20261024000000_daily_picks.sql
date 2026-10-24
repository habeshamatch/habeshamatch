-- Daily picks (Premium): a few hand-picked people every day, shown at the top of the Messages tab.
-- A pick is someone you both fit (both sides' must-haves), you have not passed on and have no
-- chat with yet, best nice-to-have score first. People picked in the last week go to the back of
-- the queue so the picks change from day to day.
--
-- Generated once a day for every Premium member by Supabase Cron (pg_cron), and on demand the
-- first time a member opens their picks on a day without any (e.g. they just subscribed).

insert into app_config (key, value) values
  ('daily_picks_per_day', '5'),
  ('daily_picks_repeat_after_days', '7')
on conflict (key) do nothing;

-- Picks for one member for today. Does nothing if they already have today's picks.
create or replace function generate_daily_picks_for(p_user uuid) returns int
language plpgsql volatile security definer set search_path = public as $$
declare v_count int;
begin
  if exists (select 1 from daily_picks where user_id = p_user and pick_date = current_date) then
    return 0;
  end if;
  insert into daily_picks (user_id, pick_user_id, pick_date)
    select p_user, c.id, current_date
    from profiles c
    where is_discoverable(p_user, c.id)
      and meets_hard(p_user, c.id)
      and meets_hard(c.id, p_user)
      and not exists (select 1 from conversations
                      where user_a = least(p_user, c.id) and user_b = greatest(p_user, c.id))
      and not exists (select 1 from swipes
                      where swiper_id = p_user and target_id = c.id and direction = 'pass')
    order by exists (select 1 from daily_picks d
                     where d.user_id = p_user and d.pick_user_id = c.id
                       and d.pick_date >= current_date - cfg_num('daily_picks_repeat_after_days')::int),
             soft_score(p_user, c.id) desc,
             c.last_active_at desc
    limit cfg_num('daily_picks_per_day')::int
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- The daily job: picks for every approved Premium member, and old picks cleared out.
create or replace function generate_daily_picks() returns int
language plpgsql volatile security definer set search_path = public as $$
declare v_user uuid;
        v_total int := 0;
begin
  delete from daily_picks where pick_date < current_date - 30;
  for v_user in
    select id from profiles where user_tier(id) = 'premium' and is_approved_member(id)
  loop
    v_total := v_total + generate_daily_picks_for(v_user);
  end loop;
  return v_total;
end $$;

-- Now volatile: fills today's picks on demand. Someone you have started a chat with since
-- the picks were made drops out (they are in your inbox instead).
drop function if exists get_daily_picks();
create function get_daily_picks() returns setof profile_card
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
begin
  if user_tier(v_uid) <> 'premium' then raise exception 'premium_required'; end if;
  perform generate_daily_picks_for(v_uid);
  return query
    select (to_card(c, soft_score(v_uid, c.id))).*
    from daily_picks d
    join profiles c on c.id = d.pick_user_id
    where d.user_id = v_uid and d.pick_date = current_date
      and is_discoverable(v_uid, c.id)
      and not exists (select 1 from conversations
                      where user_a = least(v_uid, c.id) and user_b = greatest(v_uid, c.id))
    order by soft_score(v_uid, c.id) desc, c.last_active_at desc;
end $$;

revoke execute on function generate_daily_picks_for(uuid), generate_daily_picks() from public, anon, authenticated;
revoke execute on function get_daily_picks() from public, anon;
grant execute on function get_daily_picks() to authenticated;

-- Every day at 00:05 UTC, just after the daily limits reset.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('generate-daily-picks', '5 0 * * *', 'select public.generate_daily_picks()');
