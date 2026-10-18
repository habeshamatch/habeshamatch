-- 1. The people I have blocked, for the Blocked list in settings (with Unblock). Once blocked,
--    their profile and photos are hidden from me by RLS, so this returns only a first name.
create or replace function get_my_blocked_users() returns table (
  user_id      uuid,
  display_name text,
  blocked_at   timestamptz
)
language sql stable security definer set search_path = public as $$
  select b.blocked_id, p.display_name, b.created_at
  from blocks b
  join profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc
$$;

revoke execute on function get_my_blocked_users() from public, anon;
grant execute on function get_my_blocked_users() to authenticated;

-- 2. Reports from the app can only describe a problem. The moderation fields are for admins,
--    so they are cleared on insert for app users (status = 'open' is already required by RLS).
create or replace function enforce_report_defaults() returns trigger
language plpgsql as $$
begin
  if is_end_user() then
    new.action_taken := null;
    new.resolved_by := null;
    new.resolved_at := null;
    new.created_at := now();
  end if;
  return new;
end $$;

create trigger reports_defaults before insert on reports
  for each row execute function enforce_report_defaults();

revoke execute on function enforce_report_defaults() from public, anon, authenticated;
