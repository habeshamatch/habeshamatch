-- Teach matching about the education preference. Same as before plus the 'education' case.
-- A candidate with no education level (or "prefer not to say" when it is not listed) does not
-- meet an education preference.
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
  end
$$;
