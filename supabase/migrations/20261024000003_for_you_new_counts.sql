-- What is new on the For you tab since the member last opened it (the app remembers when that
-- was, on the phone). The tab badge adds these up and clears when the tab is opened, so it only
-- ever means "something new is waiting", like unread messages.
--   likes:     people who liked you since then (and you have not swiped on yet)
--   suggested: people who joined your Suggested list since then (approved as members since then)
--   picks:     today's picks (Premium only, else 0); the app counts them until opened that day
-- Numbers only, never who; everyone gets them, the lists stay Premium.
create or replace function get_for_you_new_counts(p_since timestamptz default null)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
        v_since timestamptz := coalesce(p_since, '-infinity');
        v_likes int;
        v_suggested int;
        v_picks int := 0;
begin
  select count(*)::int into v_likes
  from swipes s
  where s.target_id = v_uid and s.direction = 'like' and s.created_at > v_since
    and is_discoverable(v_uid, s.swiper_id)
    and not exists (select 1 from swipes m where m.swiper_id = v_uid and m.target_id = s.swiper_id);

  select count(*)::int into v_suggested from (
    select 1
    from profiles c
    join preference_core vp on vp.user_id = v_uid
    where is_discoverable(v_uid, c.id)
      and c.gender = vp.seeking_gender
      and meets_hard(c.id, v_uid)
      and not meets_hard(v_uid, c.id)
      and coalesce((select max(r.reviewed_at) from verification_requests r
                    where r.user_id = c.id and r.status = 'approved'), c.created_at) > v_since
    limit 100
  ) n;

  if user_tier(v_uid) = 'premium' then
    perform generate_daily_picks_for(v_uid);
    select count(*)::int into v_picks
    from daily_picks d
    where d.user_id = v_uid and d.pick_date = current_date
      and is_discoverable(v_uid, d.pick_user_id)
      and not exists (select 1 from conversations
                      where user_a = least(v_uid, d.pick_user_id) and user_b = greatest(v_uid, d.pick_user_id));
  end if;

  return jsonb_build_object('likes', v_likes, 'suggested', v_suggested, 'picks', v_picks);
end $$;

revoke execute on function get_for_you_new_counts(timestamptz) from public, anon;
grant execute on function get_for_you_new_counts(timestamptz) to authenticated;
