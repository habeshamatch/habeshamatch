-- Income as a preference attribute ("at least" a bracket). Matching is updated in the next
-- migration: a new enum value cannot be used in the transaction that adds it.
-- preference_items value for income: {"min": "<income_range_t>"}, e.g. {"min": "50k_75k"}
alter type pref_attr_t add value 'income';
