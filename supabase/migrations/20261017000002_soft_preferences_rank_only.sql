-- Nice-to-have (soft) preferences only RANK people for now; they no longer hide anyone from
-- Meets My Criteria. With few members, a single nice-to-have at 0.3 behaved almost like a must-have.
-- get_meets_my_criteria still orders by soft score, best matches first.
-- Raise this again (e.g. to 0.3) when the community is larger.
update app_config set value = '0', updated_at = now() where key = 'soft_match_threshold';
