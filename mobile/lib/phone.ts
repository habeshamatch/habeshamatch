import { getLocales } from 'expo-localization';
import {
  getCountries,
  getCountryCallingCode,
  isPossiblePhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min';

import { COUNTRY_NAMES } from '@/lib/countryNames';

export type Country = {
  code: CountryCode;
  name: string;
  dialCode: string; // digits only, e.g. "251"
  flag: string;
};

// Shown first in the picker. Display order only; tier rules come from the database.
const PINNED: CountryCode[] = ['ER', 'ET', 'US', 'CA', 'GB', 'DE', 'SE', 'AU', 'KE', 'UG', 'SD', 'SA', 'AE'];

function flagEmoji(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function toCountry(code: CountryCode): Country {
  return {
    code,
    name: COUNTRY_NAMES[code] ?? code,
    dialCode: getCountryCallingCode(code),
    flag: flagEmoji(code),
  };
}

const ALL = getCountries()
  .map(toCountry)
  .sort((a, b) => a.name.localeCompare(b.name));

export const pinnedCountries: Country[] = PINNED.map(toCountry);
export const otherCountries: Country[] = ALL.filter((c) => !PINNED.includes(c.code));

export function getCountry(code: string): Country {
  return ALL.find((c) => c.code === code) ?? toCountry('US');
}

// The device region (e.g. "CA") if we support it, otherwise the US.
export function defaultCountry(): Country {
  const region = getLocales()[0]?.regionCode;
  return getCountry(region && ALL.some((c) => c.code === region) ? region : 'US');
}

// Turns what the user typed into an E.164 number (+14165550199), or null if it cannot be a real number.
// Only the length is checked here; Supabase and the SMS provider do the final validation.
export function toE164(input: string, country: Country): string | null {
  const parsed = parsePhoneNumberFromString(input, country.code);
  if (!parsed || !isPossiblePhoneNumber(parsed.number)) return null;
  return parsed.number;
}

export function formatForDisplay(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}
