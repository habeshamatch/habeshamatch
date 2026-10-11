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

// profiles.languages is free text[]. Known languages use these lowercase keys (matched by
// preferences); "Other" lets people type their own, stored lowercase.
export const LANGUAGES: Option<string>[] = [
  { value: 'tigrinya', label: 'Tigrinya' },
  { value: 'amharic', label: 'Amharic' },
  { value: 'english', label: 'English' },
  { value: 'oromo', label: 'Afaan Oromo' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'tigre', label: 'Tigre' },
];

export const DISPLAY_NAME_MAX = 40;
export const BIO_MAX = 500;
export const MIN_AGE = 18;

// Mirrors the profiles.height_cm check constraint.
export const HEIGHT_MIN_CM = 120;
export const HEIGHT_MAX_CM = 230;
