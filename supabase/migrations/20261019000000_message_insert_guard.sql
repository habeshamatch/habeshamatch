-- Messages sent from the app always get the server's time and start unread. Without this, a
-- modified app could backdate a message or insert it as already read. The sender_id,
-- participant and block checks stay in the messages_participant_insert policy.
create or replace function enforce_message_defaults() returns trigger
language plpgsql as $$
begin
  if is_end_user() then
    new.created_at := now();
    new.read_at := null;
  end if;
  return new;
end $$;

create trigger messages_defaults before insert on messages
  for each row execute function enforce_message_defaults();

revoke execute on function enforce_message_defaults() from public, anon, authenticated;
