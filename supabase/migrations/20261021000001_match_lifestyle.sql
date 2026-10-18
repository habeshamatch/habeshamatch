-- 1. Matching for the family and lifestyle preferences. Same as before plus the new cases.
--    A candidate who has not answered does not meet a preference on that attribute.
create or replace function pref_item_met(p_attr pref_attr_t, p_value jsonb, c profiles) returns boolean
language sql stable set search_path = public as $$
  select case p_attr
    when 'religion'            then p_value ? c.religion::text
    when 'origin'              then p_value ? c.origin::text
    when 'relationship_intent' then p_value ? c.relationship_intent::text
    when 'languages'           then p_value ?| c.languages
    when 'country'             then p_value ? (c.residence_country_code)::text
    when 'residence_type'      then p_value ? residence_type(c.residence_country_code)
    when 'height'              then c.height_cm is not null
                                    and c.height_cm between coalesce((p_value ->> 'min')::int, 0)
                                                        and coalesce((p_value ->> 'max')::int, 999)
    when 'education'           then c.education_level is not null and p_value ? c.education_level::text
    when 'income'              then c.income_range is not null
                                    and c.income_range <> 'prefer_not_to_say'
                                    and p_value ->> 'min' is not null
                                    and c.income_range >= (p_value ->> 'min')::income_range_t
    when 'marital_status'      then c.marital_status is not null and p_value ? c.marital_status::text
    when 'has_children'        then c.has_children is not null and p_value ? c.has_children::text
    when 'wants_children'      then c.wants_children is not null and p_value ? c.wants_children::text
    when 'smoking'             then c.smoking is not null and p_value ? c.smoking::text
    when 'drinking'            then c.drinking is not null and p_value ? c.drinking::text
    when 'exercise'            then c.exercise is not null and p_value ? c.exercise::text
  end
$$;

-- 2. Show the new details on public profile cards (Discover, profile pages, swipe cards).
--    Income and education stay off the card for now.
alter type profile_card
  add attribute marital_status marital_status_t,
  add attribute has_children   has_children_t,
  add attribute wants_children wants_children_t,
  add attribute smoking        smoking_t,
  add attribute drinking       drinking_t,
  add attribute exercise       exercise_t,
  add attribute occupation     text,
  add attribute interests      text[];

create or replace function to_card(c profiles, p_score numeric) returns profile_card
language sql stable set search_path = public as $$
  select row(c.id, c.display_name, age_years(c.date_of_birth), c.gender, c.height_cm, c.origin,
             c.current_city, c.residence_country_code, residence_type(c.residence_country_code),
             c.religion, c.languages, c.relationship_intent, c.bio, c.open_to_relocating,
             c.open_to_long_distance, c.is_photo_verified, primary_photo_path(c.id),
             case when p_score is null then null else round(p_score * 100)::int end,
             c.marital_status, c.has_children, c.wants_children, c.smoking, c.drinking, c.exercise,
             c.occupation, c.interests)::profile_card
$$;
