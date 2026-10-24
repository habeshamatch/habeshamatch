-- Suggested stays a short, meaningful list instead of piling up:
--   * people you already chat with are left out (they are in Messages);
--   * people you passed on in Swipe are left out (you already said no);
--   * you can remove someone yourself ("Not for me"), quietly: they never know, and it only
--     affects your Suggested list. Undo puts them back.
-- One rule, is_suggested_for(), is used by the list, the count and the For you badge.
-- get_suggested_count(since) can now count only people new to the list since a time (the
-- Suggested badge on the For you tab).

create table suggested_dismissals (
  user_id    uuid not null references profiles(id) on delete cascade,
  target_id  uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, target_id)
);
alter table suggested_dismissals enable row level security;
-- Changed only through the functions below; nobody reads anyone else's.
create policy dismissals_own on suggested_dismissals for select to authenticated using (user_id = auth.uid());

-- When someone became a member others can see (their approval), for "new" counts.
create or replace function member_since(p_user uuid) returns timestamptz
language sql stable security definer set search_path = public as $$
  select coalesce((select max(r.reviewed_at) from verification_requests r
                   where r.user_id = p_user and r.status = 'approved'),
                  (select created_at from profiles where id = p_user))
$$;

create or replace function is_suggested_for(p_viewer uuid, p_cand uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_discoverable(p_viewer, p_cand)
     and exists (select 1 from preference_core vp join profiles c on c.id = p_cand
                 where vp.user_id = p_viewer and c.gender = vp.seeking_gender)
     and meets_hard(p_cand, p_viewer)
     and not meets_hard(p_viewer, p_cand)
     and not exists (select 1 from conversations
                     where user_a = least(p_viewer, p_cand) and user_b = greatest(p_viewer, p_cand))
     and not exists (select 1 from swipes
                     where swiper_id = p_viewer and target_id = p_cand and direction = 'pass')
     and not exists (select 1 from suggested_dismissals
                     where user_id = p_viewer and target_id = p_cand)
$$;

create or replace function get_suggested(p_limit int default 20, p_offset int default 0)
returns setof profile_card
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
begin
  if user_tier(v_uid) <> 'premium' then raise exception 'premium_required'; end if;
  return query
    select (to_card(c, soft_score(v_uid, c.id))).*
    from profiles c
    where is_suggested_for(v_uid, c.id)
    order by member_since(c.id) desc, c.last_active_at desc
    limit p_limit offset p_offset;
end $$;

drop function if exists get_suggested_count();
create or replace function get_suggested_count(p_since timestamptz default null) returns int
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
        v_count int;
begin
  select count(*)::int into v_count from (
    select 1 from profiles c
    where is_suggested_for(v_uid, c.id)
      and (p_since is null or member_since(c.id) > p_since)
    limit 100
  ) s;
  return v_count;
end $$;

create or replace function dismiss_suggestion(p_target uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
begin
  if p_target = v_uid then raise exception 'not_permitted'; end if;
  insert into suggested_dismissals (user_id, target_id) values (v_uid, p_target)
    on conflict do nothing;
end $$;

create or replace function undo_dismiss_suggestion(p_target uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
begin
  delete from suggested_dismissals where user_id = v_uid and target_id = p_target;
end $$;

create or replace function get_for_you_new_counts(p_since timestamptz default null)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
        v_since timestamptz := coalesce(p_since, '-infinity');
        v_likes int;
        v_picks int := 0;
begin
  select count(*)::int into v_likes
  from swipes s
  where s.target_id = v_uid and s.direction = 'like' and s.created_at > v_since
    and is_discoverable(v_uid, s.swiper_id)
    and not exists (select 1 from swipes m where m.swiper_id = v_uid and m.target_id = s.swiper_id);

  if user_tier(v_uid) = 'premium' then
    perform generate_daily_picks_for(v_uid);
    select count(*)::int into v_picks
    from daily_picks d
    where d.user_id = v_uid and d.pick_date = current_date
      and is_discoverable(v_uid, d.pick_user_id)
      and not exists (select 1 from conversations
                      where user_a = least(v_uid, d.pick_user_id) and user_b = greatest(v_uid, d.pick_user_id));
  end if;

  return jsonb_build_object('likes', v_likes, 'suggested', get_suggested_count(v_since), 'picks', v_picks);
end $$;

revoke execute on function member_since(uuid), is_suggested_for(uuid, uuid) from public, anon, authenticated;
revoke execute on function get_suggested_count(timestamptz), dismiss_suggestion(uuid), undo_dismiss_suggestion(uuid)
  from public, anon;
grant execute on function get_suggested_count(timestamptz), dismiss_suggestion(uuid), undo_dismiss_suggestion(uuid)
  to authenticated;
