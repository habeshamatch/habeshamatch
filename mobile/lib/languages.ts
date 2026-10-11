// Languages a member can list on their profile. Stored in profiles.languages as ISO 639 codes
// (639-1 where one exists, otherwise 639-3), so preferences can match them and names can be
// translated later. Only codes from this list are saved; there is no free text.

export type Language = { code: string; name: string };
export type LanguageGroup = { title: string; languages: Language[] };

// Shown as quick chips on the wizard; everything else is in the searchable list.
export const QUICK_LANGUAGE_CODES = ['ti', 'am', 'en', 'om', 'ar'];

export const MAX_LANGUAGES = 8;

export const LANGUAGE_GROUPS: LanguageGroup[] = [
  {
    // All nine languages of Eritrea.
    title: 'Eritrea',
    languages: [
      { code: 'ti', name: 'Tigrinya' },
      { code: 'tig', name: 'Tigre' },
      { code: 'ar', name: 'Arabic' },
      { code: 'aa', name: 'Afar' },
      { code: 'ssy', name: 'Saho' },
      { code: 'byn', name: 'Bilen' },
      { code: 'kun', name: 'Kunama' },
      { code: 'nrb', name: 'Nara' },
      { code: 'bej', name: 'Hedareb (Beja)' },
    ],
  },
  {
    title: 'Ethiopia',
    languages: [
      { code: 'am', name: 'Amharic' },
      { code: 'om', name: 'Afaan Oromo' },
      { code: 'so', name: 'Somali' },
      { code: 'sid', name: 'Sidama' },
      { code: 'wal', name: 'Wolaytta' },
      { code: 'sgw', name: 'Gurage (Sebat Bet)' },
      { code: 'hdy', name: 'Hadiya' },
      { code: 'gmv', name: 'Gamo' },
      { code: 'ktb', name: 'Kambaata' },
      { code: 'har', name: 'Harari' },
      { code: 'awn', name: 'Awngi (Agaw)' },
      { code: 'xan', name: 'Xamtanga (Agaw)' },
    ],
  },
  {
    title: 'Europe',
    languages: [
      { code: 'en', name: 'English' },
      { code: 'de', name: 'German' },
      { code: 'sv', name: 'Swedish' },
      { code: 'no', name: 'Norwegian' },
      { code: 'da', name: 'Danish' },
      { code: 'nl', name: 'Dutch' },
      { code: 'fr', name: 'French' },
      { code: 'it', name: 'Italian' },
      { code: 'es', name: 'Spanish' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'fi', name: 'Finnish' },
      { code: 'is', name: 'Icelandic' },
      { code: 'ga', name: 'Irish' },
      { code: 'lb', name: 'Luxembourgish' },
      { code: 'ca', name: 'Catalan' },
      { code: 'el', name: 'Greek' },
      { code: 'mt', name: 'Maltese' },
      { code: 'pl', name: 'Polish' },
      { code: 'cs', name: 'Czech' },
      { code: 'sk', name: 'Slovak' },
      { code: 'hu', name: 'Hungarian' },
      { code: 'ro', name: 'Romanian' },
      { code: 'bg', name: 'Bulgarian' },
      { code: 'hr', name: 'Croatian' },
      { code: 'sr', name: 'Serbian' },
      { code: 'bs', name: 'Bosnian' },
      { code: 'sl', name: 'Slovenian' },
      { code: 'mk', name: 'Macedonian' },
      { code: 'sq', name: 'Albanian' },
      { code: 'et', name: 'Estonian' },
      { code: 'lv', name: 'Latvian' },
      { code: 'lt', name: 'Lithuanian' },
      { code: 'uk', name: 'Ukrainian' },
      { code: 'be', name: 'Belarusian' },
      { code: 'ru', name: 'Russian' },
      { code: 'tr', name: 'Turkish' },
    ],
  },
  {
    title: 'Africa and Middle East',
    languages: [
      { code: 'sw', name: 'Swahili' },
      { code: 'lg', name: 'Luganda' },
      { code: 'nus', name: 'Nuer' },
      { code: 'din', name: 'Dinka' },
      { code: 'rw', name: 'Kinyarwanda' },
      { code: 'ln', name: 'Lingala' },
      { code: 'ha', name: 'Hausa' },
      { code: 'yo', name: 'Yoruba' },
      { code: 'af', name: 'Afrikaans' },
      { code: 'he', name: 'Hebrew' },
      { code: 'fa', name: 'Persian' },
    ],
  },
  {
    title: 'Other languages',
    languages: [
      { code: 'hi', name: 'Hindi' },
      { code: 'ur', name: 'Urdu' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'tl', name: 'Tagalog' },
    ],
  },
];

const BY_CODE = new Map(LANGUAGE_GROUPS.flatMap((g) => g.languages).map((l) => [l.code, l]));

export function languageName(code: string): string {
  return BY_CODE.get(code)?.name ?? code;
}

export function isKnownLanguage(code: string): boolean {
  return BY_CODE.has(code);
}

export const QUICK_LANGUAGES: Language[] = QUICK_LANGUAGE_CODES.map((c) => BY_CODE.get(c) as Language);
