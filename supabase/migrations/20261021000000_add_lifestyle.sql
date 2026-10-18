-- Family and lifestyle details on profiles, and the matching preference attributes.
-- Matching (pref_item_met) and the public profile card are updated in the next migration:
-- new enum values cannot be used in the transaction that adds them.

create type marital_status_t as enum ('never_married', 'divorced', 'widowed');
create type has_children_t   as enum ('no', 'yes_live_with_me', 'yes_not_with_me');
create type wants_children_t as enum ('yes', 'no', 'open', 'not_sure');
create type smoking_t        as enum ('never', 'socially', 'regularly', 'trying_to_quit');
create type drinking_t       as enum ('never', 'rarely', 'socially', 'regularly');
create type exercise_t       as enum ('daily', 'often', 'sometimes', 'rarely');

alter table profiles
  add column marital_status marital_status_t,
  add column has_children   has_children_t,
  add column wants_children wants_children_t,
  add column smoking        smoking_t,
  add column drinking       drinking_t,
  add column exercise       exercise_t,
  add column occupation     text check (char_length(occupation) <= 60),
  -- interest codes from mobile/lib/interests.ts, like languages
  add column interests      text[] not null default '{}' check (cardinality(interests) <= 8);

-- preference_items value for each: JSON array of acceptable values, e.g. ["never","socially"]
alter type pref_attr_t add value 'marital_status';
alter type pref_attr_t add value 'has_children';
alter type pref_attr_t add value 'wants_children';
alter type pref_attr_t add value 'smoking';
alter type pref_attr_t add value 'drinking';
alter type pref_attr_t add value 'exercise';
