-- Education level on profiles, and education as a preference attribute.
-- The matching function is updated in the next migration: a new enum value cannot be used in the
-- same transaction that adds it.

create type education_level_t as enum (
  'high_school',
  'vocational',
  'bachelors',
  'masters',
  'doctorate',
  'prefer_not_to_say'
);

alter table profiles add column education_level education_level_t;

-- preference_items value for education: JSON array of acceptable levels, e.g. ["bachelors","masters","doctorate"]
alter type pref_attr_t add value 'education';
