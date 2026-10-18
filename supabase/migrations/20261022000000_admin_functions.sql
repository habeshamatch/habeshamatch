-- Functions for the admin panel only. Callable with the service role key (server side of the
-- admin panel, after it has checked the admins table); never by app users or anonymous visitors.

-- Search members by name, email or phone (auth.users is not reachable through the API).
create or replace function admin_search_users(p_query text default '', p_limit int default 50)
returns table (
  user_id        uuid,
  display_name   text,
  email          text,
  phone          text,
  gender         gender_t,
  age            int,
  residence      char(2),
  tier           tier_t,
  account_status account_status_t,
  is_photo_verified boolean,
  open_reports   int,
  created_at     timestamptz,
  last_active_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, u.email::text, u.phone, p.gender, age_years(p.date_of_birth),
         p.residence_country_code, user_tier(p.id), p.account_status, p.is_photo_verified,
         (select count(*)::int from reports r where r.reported_id = p.id and r.status = 'open'),
         p.created_at, p.last_active_at
  from profiles p
  join auth.users u on u.id = p.id
  where coalesce(p_query, '') = ''
     or p.display_name ilike '%' || p_query || '%'
     or u.email ilike '%' || p_query || '%'
     or u.phone like '%' || regexp_replace(p_query, '\D', '', 'g') || '%' and regexp_replace(p_query, '\D', '', 'g') <> ''
     or p.id::text = p_query
  order by p.created_at desc
  limit least(p_limit, 200)
$$;

-- Numbers for the dashboard.
create or replace function admin_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total_users',     (select count(*) from profiles where account_status <> 'deleted'),
    'active_7d',       (select count(*) from profiles where last_active_at >= now() - interval '7 days'),
    'active_30d',      (select count(*) from profiles where last_active_at >= now() - interval '30 days'),
    'suspended',       (select count(*) from profiles where account_status = 'suspended'),
    'banned',          (select count(*) from profiles where account_status = 'banned'),
    'tiers',           (select jsonb_object_agg(t, n) from (select user_tier(id)::text t, count(*) n from profiles
                                                            where account_status = 'active' group by 1) x),
    'verified',        (select count(*) from profiles where is_photo_verified),
    'signups_1d',      (select count(*) from profiles where created_at >= now() - interval '1 day'),
    'signups_7d',      (select count(*) from profiles where created_at >= now() - interval '7 days'),
    'signups_30d',     (select count(*) from profiles where created_at >= now() - interval '30 days'),
    'signups_daily',   (select jsonb_agg(jsonb_build_object('day', d::date, 'n',
                          (select count(*) from profiles where created_at >= d and created_at < d + interval '1 day')) order by d)
                        from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d),
    'messages_daily',  (select jsonb_agg(jsonb_build_object('day', d::date, 'n',
                          (select count(*) from messages where created_at >= d and created_at < d + interval '1 day')) order by d)
                        from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d),
    'matches_7d',      (select count(*) from conversations where origin = 'swipe_match' and created_at >= now() - interval '7 days'),
    'chats_7d',        (select count(*) from conversations where created_at >= now() - interval '7 days'),
    'pending_photos',  (select count(*) from photos where moderation_status = 'pending'),
    'open_reports',    (select count(*) from reports where status = 'open'),
    'pending_verifications', (select count(*) from verification_requests where status = 'pending')
  )
$$;

revoke execute on function admin_search_users(text, int), admin_stats() from public, anon, authenticated;
grant execute on function admin_search_users(text, int), admin_stats() to service_role;
