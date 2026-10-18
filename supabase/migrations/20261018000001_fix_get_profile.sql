-- Fix get_profile:
-- 1. "select to_card(...) into v_card" assigned the whole card to its first field (id), so every
--    call failed with "invalid input syntax for type uuid".
-- 2. A shared conversation made a profile visible even after a block. Blocking must remove the
--    person everywhere (CLAUDE.md safety rules), so a block now always hides the profile.
-- Otherwise unchanged: visible if discoverable to the viewer, or if they share a conversation.
create or replace function get_profile(p_user uuid) returns profile_card
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
        v_card profile_card;
begin
  if is_blocked_between(v_uid, p_user)
     or (not is_discoverable(v_uid, p_user)
         and not exists (select 1 from conversations
                         where user_a = least(v_uid, p_user) and user_b = greatest(v_uid, p_user))) then
    raise exception 'not_found';
  end if;
  select (to_card(c, soft_score(v_uid, c.id))).* into v_card from profiles c where c.id = p_user;
  if v_card.id is null then raise exception 'not_found'; end if;
  return v_card;
end $$;
