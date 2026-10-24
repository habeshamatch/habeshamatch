-- Discover ordering and sort options. Nobody is hidden for being inactive; they just sort lower.
--
-- Every sort:
--   * leaves out people you already have a chat with (they are in Messages);
--   * puts people you passed on in Swipe at the very end;
--   * breaks ties with a shuffle that changes daily and differs per viewer, so the same few
--     people are not at the top for everyone (stable within a day, so paging works).
--
-- 'best' (default): active in the last discover_recent_days first, then up to
--   discover_inactive_days, then the rest; within each, best nice-to-have score first.
-- 'active': people active in the last 24 hours first (best score first), then everyone else by
--   how recently they were active.
-- 'near': same current city, then same current country, then same region type (abroad or back
--   home), then the rest; within each, the 'best' order. Uses what people entered, never GPS.

insert into app_config (key, value) values
  ('discover_recent_days', '7'),
  ('discover_inactive_days', '30')
on conflict (key) do nothing;

drop function if exists get_meets_my_criteria(int, int);
create or replace function get_meets_my_criteria(p_limit int default 20, p_offset int default 0, p_sort text default 'best')
returns setof profile_card
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
        v_me profiles;
        v_recent interval := make_interval(days => cfg_num('discover_recent_days')::int);
        v_inactive interval := make_interval(days => cfg_num('discover_inactive_days')::int);
begin
  if p_sort not in ('best', 'active', 'near') then raise exception 'not_permitted'; end if;
  select * into v_me from profiles where id = v_uid;
  return query
    select (to_card(c, s.score)).*
    from profiles c
    cross join lateral (select soft_score(v_uid, c.id) as score) s
    cross join lateral (select
        exists (select 1 from swipes w
                where w.swiper_id = v_uid and w.target_id = c.id and w.direction = 'pass') as passed,
        case when c.last_active_at >= now() - v_recent then 0
             when c.last_active_at >= now() - v_inactive then 1
             else 2 end as activity,
        c.last_active_at >= now() - interval '1 day' as active_today,
        md5(v_uid::text || c.id::text || current_date::text) as shuffle) o
    where is_discoverable(v_uid, c.id)
      and meets_hard(v_uid, c.id)
      and meets_hard(c.id, v_uid)
      and s.score >= cfg_num('soft_match_threshold')
      and not exists (select 1 from conversations
                      where user_a = least(v_uid, c.id) and user_b = greatest(v_uid, c.id))
    order by
      o.passed,
      -- Active today: today's people first, best match first among them.
      case when p_sort = 'active' then not o.active_today end,
      case when p_sort = 'active' and o.active_today then s.score end desc nulls last,
      case when p_sort = 'active' then c.last_active_at end desc,
      -- Near me: same city, same country, same region type.
      case when p_sort = 'near' then
        -- Current country, or where they live when it was not given.
        case when coalesce(c.current_country_code, c.residence_country_code)
                    = coalesce(v_me.current_country_code, v_me.residence_country_code)
                  and lower(trim(c.current_city)) = lower(trim(v_me.current_city)) then 0
             when coalesce(c.current_country_code, c.residence_country_code)
                    = coalesce(v_me.current_country_code, v_me.residence_country_code) then 1
             when residence_type(c.residence_country_code) = residence_type(v_me.residence_country_code) then 2
             else 3 end
      end,
      -- Best match (and the rest of Near me).
      o.activity,
      s.score desc,
      o.shuffle
    limit p_limit offset p_offset;
end $$;

revoke execute on function get_meets_my_criteria(int, int, text) from public, anon;
grant execute on function get_meets_my_criteria(int, int, text) to authenticated;
