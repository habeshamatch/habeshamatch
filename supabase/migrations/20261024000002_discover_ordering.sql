-- Discover ordering and a country filter. Nobody is hidden for being inactive; they just sort lower.
--
-- Order:
--   * people you passed on in Swipe go last;
--   * active in the last discover_recent_days first, then up to discover_inactive_days, then the rest;
--   * within each, best nice-to-have score first;
--   * ties break with a shuffle that changes daily and differs per viewer, so the same few people
--     are not at the top for everyone (stable within a day, so paging works).
-- People you already have a chat with are left out (they are in Messages).
--
-- Filter: p_countries narrows the list to people living in those countries, on top of your
-- preferences (it never widens them). get_meets_my_criteria_countries() lists the countries
-- your current matches live in, with how many, for the filter sheet.

insert into app_config (key, value) values
  ('discover_recent_days', '7'),
  ('discover_inactive_days', '30')
on conflict (key) do nothing;

drop function if exists get_meets_my_criteria(int, int);
drop function if exists get_meets_my_criteria(int, int, text);
create or replace function get_meets_my_criteria(p_limit int default 20, p_offset int default 0, p_countries text[] default null)
returns setof profile_card
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
        v_recent interval := make_interval(days => cfg_num('discover_recent_days')::int);
        v_inactive interval := make_interval(days => cfg_num('discover_inactive_days')::int);
begin
  return query
    select (to_card(c, s.score)).*
    from profiles c
    cross join lateral (select soft_score(v_uid, c.id) as score) s
    where is_discoverable(v_uid, c.id)
      and meets_hard(v_uid, c.id)
      and meets_hard(c.id, v_uid)
      and s.score >= cfg_num('soft_match_threshold')
      and not exists (select 1 from conversations
                      where user_a = least(v_uid, c.id) and user_b = greatest(v_uid, c.id))
      and (coalesce(cardinality(p_countries), 0) = 0 or c.residence_country_code = any (p_countries))
    order by
      exists (select 1 from swipes w
              where w.swiper_id = v_uid and w.target_id = c.id and w.direction = 'pass'),
      case when c.last_active_at >= now() - v_recent then 0
           when c.last_active_at >= now() - v_inactive then 1
           else 2 end,
      s.score desc,
      md5(v_uid::text || c.id::text || current_date::text)
    limit p_limit offset p_offset;
end $$;

-- Countries your current Discover list lives in, most people first (for the filter).
create or replace function get_meets_my_criteria_countries()
returns table (country_code text, people int)
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
begin
  return query
    select c.residence_country_code::text, count(*)::int
    from profiles c
    where is_discoverable(v_uid, c.id)
      and meets_hard(v_uid, c.id)
      and meets_hard(c.id, v_uid)
      and soft_score(v_uid, c.id) >= cfg_num('soft_match_threshold')
      and not exists (select 1 from conversations
                      where user_a = least(v_uid, c.id) and user_b = greatest(v_uid, c.id))
    group by c.residence_country_code
    order by count(*) desc, c.residence_country_code;
end $$;

revoke execute on function get_meets_my_criteria(int, int, text[]), get_meets_my_criteria_countries() from public, anon;
grant execute on function get_meets_my_criteria(int, int, text[]), get_meets_my_criteria_countries() to authenticated;
