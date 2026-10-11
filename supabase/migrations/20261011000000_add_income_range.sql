-- Yearly income as a range in US dollars. Optional in the database; the profile wizard asks for it
-- and offers "prefer not to say". Ranges start low so they also fit people living in local-tier
-- countries. Not shown to other users yet: get_profile / to_card are unchanged.

create type income_range_t as enum (
  'under_10k',
  '10k_25k',
  '25k_50k',
  '50k_75k',
  '75k_100k',
  '100k_150k',
  '150k_250k',
  'over_250k',
  'prefer_not_to_say'
);

alter table profiles add column income_range income_range_t;
