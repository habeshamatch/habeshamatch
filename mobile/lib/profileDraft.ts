import type { HeightUnit } from '@/lib/height';
import { secureStorage } from '@/lib/secureStorage';
import type { Enums } from '@/types/database';

// Wizard answers kept on the device (encrypted) until the profile is created, so the wizard
// resumes where the user left off if the app closes. One draft per account.
export type ProfileDraft = {
  step: number;
  displayName: string;
  dateOfBirth: string | null; // YYYY-MM-DD
  gender: Enums<'gender_t'> | null;
  origin: Enums<'origin_t'> | null;
  heightCm: number | null;
  heightUnit: HeightUnit;
  religion: Enums<'religion_t'> | null;
  languages: string[];
  otherLanguage: string;
  intent: Enums<'intent_t'> | null;
  currentCity: string;
  residenceCountry: string | null;
  openToRelocating: boolean;
  openToLongDistance: boolean;
  bio: string;
};

export function emptyDraft(heightUnit: HeightUnit): ProfileDraft {
  return {
    step: 0,
    displayName: '',
    dateOfBirth: null,
    gender: null,
    origin: null,
    heightCm: null,
    heightUnit,
    religion: null,
    languages: [],
    otherLanguage: '',
    intent: null,
    currentCity: '',
    residenceCountry: null,
    openToRelocating: false,
    openToLongDistance: false,
    bio: '',
  };
}

const key = (userId: string) => `profile_draft_${userId}`;

export async function loadDraft(userId: string): Promise<Partial<ProfileDraft> | null> {
  try {
    const raw = await secureStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as Partial<ProfileDraft>) : null;
  } catch {
    return null; // unreadable draft: start fresh rather than block onboarding
  }
}

export async function saveDraft(userId: string, draft: ProfileDraft): Promise<void> {
  try {
    await secureStorage.setItem(key(userId), JSON.stringify(draft));
  } catch {
    // Saving the draft is a convenience; never interrupt the wizard because of it.
  }
}

export async function clearDraft(userId: string): Promise<void> {
  try {
    await secureStorage.removeItem(key(userId));
  } catch {
    // ignore
  }
}
