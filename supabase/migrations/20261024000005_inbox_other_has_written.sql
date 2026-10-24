-- The inbox also says whether the other person has ever written, so the Messages tab can split
-- chats into Sent (you wrote, they never replied) and Conversations (they have written at least
-- once; a chat stays there for good). Otherwise unchanged.
drop function if exists get_my_conversations();
create function get_my_conversations() returns table (
  conversation_id   uuid,
  other_user_id     uuid,
  other_name        text,
  other_photo_path  text,
  other_verified    boolean,
  origin            convo_origin_t,
  last_message      text,
  last_message_at   timestamptz,
  unread_count      int,
  other_has_written boolean
)
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
begin
  return query
    select cv.id,
           o.id,
           o.display_name,
           primary_photo_path(o.id),
           o.is_photo_verified,
           cv.origin,
           (select m.body from messages m where m.conversation_id = cv.id order by m.created_at desc limit 1),
           coalesce(cv.last_message_at, cv.created_at),
           (select count(*)::int from messages m
             where m.conversation_id = cv.id and m.sender_id <> v_uid and m.read_at is null),
           exists (select 1 from messages m where m.conversation_id = cv.id and m.sender_id = o.id)
    from conversations cv
    join profiles o on o.id = case when cv.user_a = v_uid then cv.user_b else cv.user_a end
    where v_uid in (cv.user_a, cv.user_b)
      and not is_blocked_between(cv.user_a, cv.user_b)
      and o.account_status = 'active'
    order by coalesce(cv.last_message_at, cv.created_at) desc;
end $$;

revoke execute on function get_my_conversations() from public, anon;
grant execute on function get_my_conversations() to authenticated;
