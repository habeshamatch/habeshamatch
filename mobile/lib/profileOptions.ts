import type { Enums } from '@/types/database';

// Choices shown in the profile wizard. Values match the database enums; labels are UI copy.

export type Option<T extends string> = { value: T; label: string };

export const GENDERS: Option<Enums<'gender_t'>>[] = [
  { value: 'female', label: 'Woman' },
  { value: 'male', label: 'Man' },
];

export const ORIGINS: Option<Enums<'origin_t'>>[] = [
  { value: 'eritrea', label: 'Eritrea' },
  { value: 'ethiopia', label: 'Ethiopia' },
];

export const RELIGIONS: Option<Enums<'religion_t'>>[] = [
  { value: 'orthodox', label: 'Orthodox' },
  { value: 'muslim', label: 'Muslim' },
  { value: 'catholic', label: 'Catholic' },
  { value: 'protestant', label: 'Protestant' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const INTENTS: Option<Enums<'intent_t'>>[] = [
  { value: 'marriage', label: 'Marriage' },
  { value: 'serious_relationship', label: 'Serious relationship' },
  { value: 'getting_to_know', label: 'Getting to know' },
];

// Yearly income in US dollars. Lower ranges are finer so they also fit people living in
// local-tier countries. Languages live in lib/languages.ts.
export const INCOME_RANGES: Option<Enums<'income_range_t'>>[] = [
  { value: 'under_10k', label: 'Under $10k' },
  { value: '10k_25k', label: '$10k to $25k' },
  { value: '25k_50k', label: '$25k to $50k' },
  { value: '50k_75k', label: '$50k to $75k' },
  { value: '75k_100k', label: '$75k to $100k' },
  { value: '100k_150k', label: '$100k to $150k' },
  { value: '150k_250k', label: '$150k to $250k' },
  { value: 'over_250k', label: '$250k or more' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

// Income preference thresholds: each means "this bracket or higher".
export const INCOME_THRESHOLDS: Option<Enums<'income_range_t'>>[] = [
  { value: '10k_25k', label: '$10k+' },
  { value: '25k_50k', label: '$25k+' },
  { value: '50k_75k', label: '$50k+' },
  { value: '75k_100k', label: '$75k+' },
  { value: '100k_150k', label: '$100k+' },
  { value: '150k_250k', label: '$150k+' },
  { value: 'over_250k', label: '$250k+' },
];

export const EDUCATION_LEVELS: Option<Enums<'education_level_t'>>[] = [
  { value: 'high_school', label: 'High school' },
  { value: 'vocational', label: 'Diploma or vocational' },
  { value: 'bachelors', label: "Bachelor's degree" },
  { value: 'masters', label: "Master's degree" },
  { value: 'doctorate', label: 'Doctorate' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const MARITAL_STATUSES: Option<Enums<'marital_status_t'>>[] = [
  { value: 'never_married', label: 'Never married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
];

export const HAS_CHILDREN: Option<Enums<'has_children_t'>>[] = [
  { value: 'no', label: 'No' },
  { value: 'yes_live_with_me', label: 'Yes, they live with me' },
  { value: 'yes_not_with_me', label: "Yes, they don't live with me" },
];

export const WANTS_CHILDREN: Option<Enums<'wants_children_t'>>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'open', label: 'Open to it' },
  { value: 'not_sure', label: 'Not sure yet' },
];

export const SMOKING: Option<Enums<'smoking_t'>>[] = [
  { value: 'never', label: 'Never' },
  { value: 'socially', label: 'Socially' },
  { value: 'regularly', label: 'Regularly' },
  { value: 'trying_to_quit', label: 'Trying to quit' },
];

export const DRINKING: Option<Enums<'drinking_t'>>[] = [
  { value: 'never', label: 'Never' },
  { value: 'rarely', label: 'Rarely' },
  { value: 'socially', label: 'Socially' },
  { value: 'regularly', label: 'Regularly' },
];

export const EXERCISE: Option<Enums<'exercise_t'>>[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'often', label: 'Often' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'rarely', label: 'Rarely' },
];

export const OCCUPATION_MAX = 60; // mirrors the profiles.occupation check constraint

export const DISPLAY_NAME_MAX = 40;
export const BIO_MAX = 500;
export const MIN_AGE = 18;

// Mirrors the profiles.height_cm check constraint.
export const HEIGHT_MIN_CM = 120;
export const HEIGHT_MAX_CM = 230;
