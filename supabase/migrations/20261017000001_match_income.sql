-- Teach matching about the income preference: the candidate's bracket must be at or above "min".
-- Brackets compare in their declared order (under_10k < 10k_25k < ... < over_250k).
-- "prefer_not_to_say" is declared last but is not an amount, so it never meets an income preference,
-- and neither does an unanswered income.
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
  end
$$;
