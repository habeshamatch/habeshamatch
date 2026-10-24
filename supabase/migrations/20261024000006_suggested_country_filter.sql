-- Country filter for Suggested (Premium), like the one on Discover: p_countries narrows the list
-- to people living in those countries; get_suggested_countries() lists the countries the
-- member's Suggested people live in, with how many, for the filter sheet.
drop function if exists get_suggested(int, int);
create or replace function get_suggested(p_limit int default 20, p_offset int default 0, p_countries text[] default null)
returns setof profile_card
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
begin
  if user_tier(v_uid) <> 'premium' then raise exception 'premium_required'; end if;
  return query
    select (to_card(c, soft_score(v_uid, c.id))).*
    from profiles c
    where is_suggested_for(v_uid, c.id)
      and (coalesce(cardinality(p_countries), 0) = 0 or c.residence_country_code = any (p_countries))
    order by member_since(c.id) desc, c.last_active_at desc
    limit p_limit offset p_offset;
end $$;

create or replace function get_suggested_countries()
returns table (country_code text, people int)
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
begin
  if user_tier(v_uid) <> 'premium' then raise exception 'premium_required'; end if;
  return query
    select c.residence_country_code::text, count(*)::int
    from profiles c
    where is_suggested_for(v_uid, c.id)
    group by c.residence_country_code
    order by count(*) desc, c.residence_country_code;
end $$;

revoke execute on function get_suggested(int, int, text[]), get_suggested_countries() from public, anon;
grant execute on function get_suggested(int, int, text[]), get_suggested_countries() to authenticated;
