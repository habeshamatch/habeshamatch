import { formatHeight, defaultHeightUnit } from '@/lib/height';
import { languageName } from '@/lib/languages';
import { getCountry } from '@/lib/phone';
import { INTENTS, ORIGINS, RELIGIONS } from '@/lib/profileOptions';

// Turns stored values into words for profile cards and pages.

const labelOf = (options: { value: string; label: string }[], value: string | null | undefined) =>
  options.find((o) => o.value === value)?.label ?? null;

export const originLabel = (v: string | null | undefined) => labelOf(ORIGINS, v);
export const religionLabel = (v: string | null | undefined) =>
  v === 'prefer_not_to_say' ? null : labelOf(RELIGIONS, v);
export const intentLabel = (v: string | null | undefined) => labelOf(INTENTS, v);
export const languagesLabel = (codes: string[]) => codes.map(languageName).join(', ');
export const heightLabel = (cm: number | null) => (cm ? formatHeight(cm, defaultHeightUnit()) : null);

// "Toronto, Canada" or just the country.
export function placeLabel(city: string | null, countryCode: string | null): string | null {
  const country = countryCode ? getCountry(countryCode).name : null;
  if (city && country) return `${city}, ${country}`;
  return city || country;
}
