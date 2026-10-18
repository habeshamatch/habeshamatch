-- Mandatory verification: every member is approved by an admin before taking part.
-- A member is APPROVED when their account is active, an admin has verified their selfie
-- (profiles.is_photo_verified) and they have at least one approved photo. Until then they are
-- invisible, cannot browse, swipe, start chats or send messages ('approval_pending').
-- Submitting for review needs at least 2 photos and a live selfie (stored in the private
-- 'verifications' bucket, readable only by the member and the admin panel).

-- 1. Selfie storage -------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verifications', 'verifications', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy verifications_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'verifications' and (storage.foldername(name))[1] = auth.uid()::text);
create policy verifications_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'verifications' and (storage.foldername(name))[1] = auth.uid()::text);
create policy verifications_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'verifications' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Submissions ----------------------------------------------------------------------------
alter table verification_requests
  add column pose text check (char_length(pose) <= 100),             -- the pose the member was asked to copy
  add column rejection_reason text check (char_length(rejection_reason) <= 500); -- shown to the member

create unique index verification_one_pending on verification_requests (user_id) where status = 'pending';

-- App users submit only as themselves, always pending, with at least 2 photos that are not rejected.
create or replace function enforce_verification_submit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if is_end_user() then
    if (select count(*) from photos where user_id = new.user_id and moderation_status <> 'rejected') < 2 then
      raise exception 'two_photos_required';
    end if;
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
    new.created_at := now();
  end if;
  return new;
end $$;

create trigger verification_submit before insert on verification_requests
  for each row execute function enforce_verification_submit();
revoke execute on function enforce_verification_submit() from public, anon, authenticated;

-- 3. Who counts as approved -----------------------------------------------------------------
create or replace function is_approved_member(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = p_user and account_status = 'active' and is_photo_verified)
     and exists (select 1 from photos where user_id = p_user and moderation_status = 'approved')
$$;

-- For the RPCs below: signed in, active (require_active_user) AND approved.
create or replace function require_approved_user() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
begin
  if not is_approved_member(v_uid) then raise exception 'approval_pending'; end if;
  return v_uid;
end $$;

-- Only approved members can appear to anyone.
create or replace function is_discoverable(p_viewer uuid, p_cand uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_viewer <> p_cand
     and is_approved_member(p_cand)
     and not is_blocked_between(p_viewer, p_cand)
$$;

-- Sending messages needs an approved member too.
drop policy messages_participant_insert on messages;
create policy messages_participant_insert on messages for insert to authenticated
  with check (sender_id = auth.uid()
              and is_approved_member(auth.uid())
              and exists (select 1 from conversations cv
                          where cv.id = conversation_id and auth.uid() in (cv.user_a, cv.user_b)
                            and not is_blocked_between(cv.user_a, cv.user_b)));

-- 4. Discovery, swiping, chats and profiles need an approved member (bodies unchanged apart from
--    require_approved_user()).
create or replace function get_meets_my_criteria(p_limit int default 20, p_offset int default 0)
returns setof profile_card
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
begin
  return query
    select (to_card(c, s.score)).*
    from profiles c
    cross join lateral (select soft_score(v_uid, c.id) as score) s
    where is_discoverable(v_uid, c.id)
      and meets_hard(v_uid, c.id)
      and meets_hard(c.id, v_uid)
      and s.score >= cfg_num('soft_match_threshold')
    order by s.score desc, c.last_active_at desc
    limit p_limit offset p_offset;
end $$;

create or replace function get_suggested(p_limit int default 20, p_offset int default 0)
returns setof profile_card
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
begin
  if user_tier(v_uid) <> 'premium' then raise exception 'premium_required'; end if;
  return query
    select (to_card(c, soft_score(v_uid, c.id))).*
    from profiles c
    join preference_core vp on vp.user_id = v_uid
    where is_discoverable(v_uid, c.id)
      and c.gender = vp.seeking_gender
      and meets_hard(c.id, v_uid)
      and not meets_hard(v_uid, c.id)
    order by c.last_active_at desc
    limit p_limit offset p_offset;
end $$;

create or replace function get_swipe_deck(p_limit int default 20)
returns setof profile_card
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
        v_me profiles;
begin
  select * into v_me from profiles where id = v_uid;
  return query
    select (to_card(c, null)).*
    from profiles c
    where is_discoverable(v_uid, c.id)
      and swipe_eligible(v_uid, c.id)
      and not exists (select 1 from swipes s where s.swiper_id = v_uid and s.target_id = c.id)
    order by (c.residence_country_code = v_me.residence_country_code) desc,
             (residence_type(c.residence_country_code) = residence_type(v_me.residence_country_code)) desc,
             random()
    limit p_limit;
end $$;

create or replace function start_conversation(p_target uuid) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
        v_existing uuid;
        v_origin convo_origin_t;
        v_tier tier_t;
        v_limit int;
        v_used int;
        v_id uuid;
begin
  select id into v_existing from conversations
    where user_a = least(v_uid, p_target) and user_b = greatest(v_uid, p_target);
  if v_existing is not null then
    if is_blocked_between(v_uid, p_target) then raise exception 'not_permitted'; end if;
    return v_existing;
  end if;

  if not is_discoverable(v_uid, p_target) then raise exception 'not_permitted'; end if;
  if not meets_hard(p_target, v_uid) then raise exception 'not_permitted'; end if;

  v_tier := user_tier(v_uid);
  if meets_hard(v_uid, p_target) then
    v_origin := 'criteria';
  elsif v_tier = 'premium' then
    v_origin := 'suggested';
  else
    raise exception 'premium_required';
  end if;

  v_limit := case when v_tier = 'free' then cfg_num('free_new_chats_per_day')
                  else cfg_num('unlimited_new_chats_safety_cap') end;
  select count(*) into v_used from conversations
    where initiated_by = v_uid and counts_toward_limit and created_at >= date_trunc('day', now());
  if v_used >= v_limit then raise exception 'daily_new_chat_limit_reached'; end if;

  insert into conversations (user_a, user_b, initiated_by, origin, counts_toward_limit)
    values (least(v_uid, p_target), greatest(v_uid, p_target), v_uid, v_origin, true)
    returning id into v_id;
  return v_id;
end $$;

create or replace function record_swipe(p_target uuid, p_direction swipe_dir_t) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
        v_limit int;
        v_used int;
        v_convo uuid;
begin
  if not is_discoverable(v_uid, p_target) or not swipe_eligible(v_uid, p_target) then
    raise exception 'not_permitted';
  end if;

  v_limit := case when user_tier(v_uid) = 'premium' then cfg_num('premium_swipes_per_day')
                  else cfg_num('free_swipes_per_day') end;
  select count(*) into v_used from swipes
    where swiper_id = v_uid and created_at >= date_trunc('day', now());
  if v_used >= v_limit then raise exception 'daily_swipe_limit_reached'; end if;

  insert into swipes (swiper_id, target_id, direction) values (v_uid, p_target, p_direction)
    on conflict (swiper_id, target_id) do nothing;

  if p_direction = 'like' and exists (select 1 from swipes
       where swiper_id = p_target and target_id = v_uid and direction = 'like') then
    -- Mutual like: open a chat that does NOT count toward the daily limit.
    insert into conversations (user_a, user_b, initiated_by, origin, counts_toward_limit)
      values (least(v_uid, p_target), greatest(v_uid, p_target), v_uid, 'swipe_match', false)
      on conflict (user_a, user_b) do nothing;
    select id into v_convo from conversations
      where user_a = least(v_uid, p_target) and user_b = greatest(v_uid, p_target);
    return jsonb_build_object('matched', true, 'conversation_id', v_convo);
  end if;

  return jsonb_build_object('matched', false);
end $$;

create or replace function undo_last_swipe() returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
        v_target uuid;
begin
  if user_tier(v_uid) <> 'premium' then raise exception 'premium_required'; end if;
  select target_id into v_target from swipes
    where swiper_id = v_uid order by created_at desc limit 1;
  if v_target is null then return null; end if;
  if exists (select 1 from conversations
             where user_a = least(v_uid, v_target) and user_b = greatest(v_uid, v_target)
               and origin = 'swipe_match') then
    raise exception 'cannot_undo_match';
  end if;
  delete from swipes where swiper_id = v_uid and target_id = v_target;
  return v_target;
end $$;

create or replace function get_likes_received(p_limit int default 50) returns setof profile_card
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
begin
  if user_tier(v_uid) <> 'premium' then raise exception 'premium_required'; end if;
  return query
    select (to_card(c, null)).*
    from swipes s
    join profiles c on c.id = s.swiper_id
    where s.target_id = v_uid and s.direction = 'like'
      and is_discoverable(v_uid, c.id)
      and not exists (select 1 from swipes m where m.swiper_id = v_uid and m.target_id = c.id)
    order by s.created_at desc
    limit p_limit;
end $$;

create or replace function get_daily_picks() returns setof profile_card
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
begin
  if user_tier(v_uid) <> 'premium' then raise exception 'premium_required'; end if;
  return query
    select (to_card(c, soft_score(v_uid, c.id))).*
    from daily_picks d
    join profiles c on c.id = d.pick_user_id
    where d.user_id = v_uid and d.pick_date = current_date
      and is_discoverable(v_uid, c.id);
end $$;

create or replace function get_profile(p_user uuid) returns profile_card
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := require_approved_user();
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

revoke execute on function is_approved_member(uuid), require_approved_user() from public, anon;
grant execute on function is_approved_member(uuid) to authenticated;
