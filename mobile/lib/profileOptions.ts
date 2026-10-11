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

export const DISPLAY_NAME_MAX = 40;
export const BIO_MAX = 500;
export const MIN_AGE = 18;

// Mirrors the profiles.height_cm check constraint.
export const HEIGHT_MIN_CM = 120;
export const HEIGHT_MAX_CM = 230;
