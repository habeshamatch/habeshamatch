import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

import { supabase } from '@/lib/supabase';

export type LocalTierCountry = { code: string; name: string; phonePrefix: string };

export type ResidenceRules = {
  localTierCountries: LocalTierCountry[];
  cooldownDays: number;
};

// Local-tier countries and the residence change cooldown come from the database
// (local_tier_countries, app_config). Never hardcode either.
export async function fetchResidenceRules(): Promise<ResidenceRules> {
  const [countries, config] = await Promise.all([
    supabase.from('local_tier_countries').select('country_code, country_name, phone_prefix').eq('active', true),
    supabase.from('app_config').select('value').eq('key', 'location_change_cooldown_days').single(),
  ]);
  if (countries.error) throw countries.error;
  if (config.error) throw config.error;
  return {
    localTierCountries: countries.data.map((c) => ({
      code: c.country_code,
      name: c.country_name,
      phonePrefix: c.phone_prefix,
    })),
    cooldownDays: Number(config.data.value),
  };
}

// auth.users.phone is stored as digits without '+'.
function phoneDigits(phone: string | undefined): string {
  return (phone ?? '').replace(/^\+/, '');
}

// Mirrors enforce_residence_rules: a local-tier residence needs a phone starting with ANY active
// local-tier prefix (not necessarily the same country). The database makes the final check.
export function hasLocalTierPhone(phone: string | undefined, rules: ResidenceRules): boolean {
  const digits = phoneDigits(phone);
  return !!digits && rules.localTierCountries.some((c) => digits.startsWith(c.phonePrefix));
}

export function isLocalTierCountry(code: string | null, rules: ResidenceRules): boolean {
  return !!code && rules.localTierCountries.some((c) => c.code === code);
}

// Country of the verified phone number (e.g. "+14165550199" -> "CA"), used to pre-fill residence.
export function phoneCountry(phone: string | undefined): string | null {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  return parsePhoneNumberFromString(`+${digits}`)?.country ?? null;
}
