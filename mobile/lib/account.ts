import { clearDraft, type ProfileDraft } from '@/lib/profileDraft';
import { defaultHeightUnit } from '@/lib/height';
import { isKnownLanguage } from '@/lib/languages';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

// The signed-in user's own profile, for Edit profile and the Profile tab.

export type MyProfile = Tables<'profiles'>;

export async function fetchMyProfile(userId: string): Promise<MyProfile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

// Maps the stored profile to the form shape the wizard fields use.
export function profileToDraft(p: MyProfile): ProfileDraft {
  return {
    step: 0,
    displayName: p.display_name,
    dateOfBirth: p.date_of_birth,
    gender: p.gender,
    origin: p.origin,
    heightCm: p.height_cm,
    heightUnit: defaultHeightUnit(),
    religion: p.religion,
    languages: p.languages.filter(isKnownLanguage),
    intent: p.relationship_intent,
    incomeRange: p.income_range,
    educationLevel: p.education_level,
    currentCity: p.current_city ?? '',
    residenceCountry: p.residence_country_code,
    openToRelocating: p.open_to_relocating,
    openToLongDistance: p.open_to_long_distance,
    bio: p.bio ?? '',
  };
}

// Saves edits. Date of birth and gender are not editable in the app (date of birth is also
// protected in the database). Residence changes are limited by the cooldown in the database.
export async function saveMyProfile(userId: string, d: ProfileDraft): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: d.displayName.trim(),
      origin: d.origin ?? undefined,
      height_cm: d.heightCm,
      religion: d.religion ?? undefined,
      languages: d.languages,
      relationship_intent: d.intent ?? undefined,
      income_range: d.incomeRange,
      education_level: d.educationLevel,
      current_city: d.currentCity.trim(),
      residence_country_code: d.residenceCountry ?? undefined,
      open_to_relocating: d.openToRelocating,
      open_to_long_distance: d.openToLongDistance,
      bio: d.bio.trim() || null,
    })
    .eq('id', userId);
  if (error) throw error;
}

// The date the residence can change again, or null if it can change now.
export function residenceLockedUntil(changedAt: string, cooldownDays: number, now = new Date()): Date | null {
  const until = new Date(new Date(changedAt).getTime() + cooldownDays * 24 * 60 * 60 * 1000);
  return until > now ? until : null;
}

// Signs out on every device (revokes all sessions), not just this phone.
export async function signOutEverywhere(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) throw error;
}

// Permanently deletes the account (edge function delete-account), then clears this device.
export async function deleteMyAccount(userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  await clearDraft(userId);
  await supabase.auth.signOut({ scope: 'local' }); // the session is already invalid on the server
}
