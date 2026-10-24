-- How many people are in your Suggested section (shown as a badge on Discover). A number only,
-- never who they are, so everyone sees it (like the Liked you count); the list stays Premium.
-- Counted up to 100; the app shows "99+" above that.
create or replace function get_suggested_count() returns int
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
        v_count int;
begin
  select count(*)::int into v_count from (
    select 1
    from profiles c
    join preference_core vp on vp.user_id = v_uid
    where is_discoverable(v_uid, c.id)
      and c.gender = vp.seeking_gender
      and meets_hard(c.id, v_uid)
      and not meets_hard(v_uid, c.id)
    limit 100
  ) s;
  return v_count;
end $$;

revoke execute on function get_suggested_count() from public, anon;
grant execute on function get_suggested_count() to authenticated;
