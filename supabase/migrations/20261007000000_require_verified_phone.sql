-- A profile can only be created once the user has verified a phone number.
--
-- Phone verification happens in onboarding before the profile exists (updateUser + phone_change OTP),
-- and enforce_residence_rules relies on auth.users.phone for the local-tier prefix check. This makes
-- the order impossible to skip from outside the app: no confirmed phone, no profile.
--
-- Applies to every insert, including the service role and seed data, so test users need a
-- confirmed phone too.

create or replace function enforce_verified_phone() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from auth.users
                 where id = new.id
                   and coalesce(phone, '') <> ''
                   and phone_confirmed_at is not null) then
    raise exception 'phone_not_verified';
  end if;
  return new;
end $$;

-- BEFORE triggers run in name order: profiles_age_gate, profiles_phone_verified, profiles_protect,
-- profiles_residence. So the age check still reports first, and the residence check can trust the phone.
create trigger profiles_phone_verified before insert on profiles
  for each row execute function enforce_verified_phone();

revoke execute on function enforce_verified_phone() from public, anon, authenticated;
