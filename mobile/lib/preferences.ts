import { HEIGHT_MAX_CM, HEIGHT_MIN_CM, MIN_AGE } from '@/lib/profileOptions';
import { supabase } from '@/lib/supabase';
import type { Enums, Json } from '@/types/database';

// Who the user is looking for. Gender and age range are always required (preference_core) and
// always act as deal-breakers. Everything else is optional (preference_items): each attribute is
// either not set ("any"), a "must have" (hard) or a "nice to have" (soft). The database applies
// them in matching; the app only stores them.

export type PrefKind = Enums<'pref_kind_t'>;
export type ListPref = { values: string[]; kind: PrefKind }; // empty values = not set
export type HeightPref = { enabled: boolean; min: number; max: number; kind: PrefKind };

export type Preferences = {
  seekingGender: Enums<'gender_t'> | null;
  ageMin: number;
  ageMax: number;
  religion: ListPref;
  origin: ListPref;
  languages: ListPref; // ISO 639 codes, matched if any overlap
  intent: ListPref;
  residenceType: ListPref; // ["diaspora"] or ["home"]
  country: ListPref; // ISO country codes
  height: HeightPref;
};

export const AGE_MAX = 99; // mirrors preference_core.age_max check
export const MAX_COUNTRIES = 15;

type ListKey = 'religion' | 'origin' | 'languages' | 'intent' | 'residenceType' | 'country';
const LIST_ATTRIBUTES: Record<ListKey, Enums<'pref_attr_t'>> = {
  religion: 'religion',
  origin: 'origin',
  languages: 'languages',
  intent: 'relationship_intent',
  residenceType: 'residence_type',
  country: 'country',
};

const emptyList = (): ListPref => ({ values: [], kind: 'soft' });

function ageFrom(dob: string): number {
  const [y, m, d] = dob.split('-').map(Number);
  const t = new Date();
  let age = t.getFullYear() - y;
  if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) age -= 1;
  return age;
}

// Saved preferences, or sensible defaults built from the user's own profile on first use.
export async function loadPreferences(userId: string): Promise<{ prefs: Preferences; saved: boolean }> {
  const [profile, core, items] = await Promise.all([
    supabase.from('profiles').select('gender, date_of_birth').eq('id', userId).single(),
    supabase.from('preference_core').select('seeking_gender, age_min, age_max').eq('user_id', userId).maybeSingle(),
    supabase.from('preference_items').select('attribute, kind, value').eq('user_id', userId),
  ]);
  if (profile.error) throw profile.error;
  if (core.error) throw core.error;
  if (items.error) throw items.error;

  const age = ageFrom(profile.data.date_of_birth);
  const prefs: Preferences = {
    seekingGender: core.data?.seeking_gender ?? (profile.data.gender === 'male' ? 'female' : 'male'),
    ageMin: core.data?.age_min ?? Math.max(MIN_AGE, age - 5),
    ageMax: core.data?.age_max ?? Math.min(AGE_MAX, age + 5),
    religion: emptyList(),
    origin: emptyList(),
    languages: emptyList(),
    intent: emptyList(),
    residenceType: emptyList(),
    country: emptyList(),
    height: { enabled: false, min: 155, max: 190, kind: 'soft' },
  };

  for (const item of items.data) {
    if (item.attribute === 'height') {
      const v = item.value as { min?: number; max?: number };
      prefs.height = {
        enabled: true,
        min: v.min ?? HEIGHT_MIN_CM,
        max: v.max ?? HEIGHT_MAX_CM,
        kind: item.kind,
      };
      continue;
    }
    const key = (Object.keys(LIST_ATTRIBUTES) as ListKey[]).find((k) => LIST_ATTRIBUTES[k] === item.attribute);
    if (key && Array.isArray(item.value)) {
      prefs[key] = { values: item.value.filter((v): v is string => typeof v === 'string'), kind: item.kind };
    }
  }
  return { prefs, saved: !!core.data };
}

// Saves everything: the required core, every set attribute, and removes attributes set to "any".
export async function savePreferences(userId: string, prefs: Preferences): Promise<void> {
  if (!prefs.seekingGender) throw new Error('seeking gender is required');

  const core = await supabase.from('preference_core').upsert({
    user_id: userId,
    seeking_gender: prefs.seekingGender,
    age_min: prefs.ageMin,
    age_max: prefs.ageMax,
  });
  if (core.error) throw core.error;

  const rows: { user_id: string; attribute: Enums<'pref_attr_t'>; kind: PrefKind; value: Json }[] = [];
  for (const key of Object.keys(LIST_ATTRIBUTES) as ListKey[]) {
    const p = prefs[key];
    if (p.values.length > 0) rows.push({ user_id: userId, attribute: LIST_ATTRIBUTES[key], kind: p.kind, value: p.values });
  }
  if (prefs.height.enabled) {
    rows.push({
      user_id: userId,
      attribute: 'height',
      kind: prefs.height.kind,
      value: { min: prefs.height.min, max: prefs.height.max },
    });
  }

  if (rows.length > 0) {
    const upsert = await supabase.from('preference_items').upsert(rows, { onConflict: 'user_id,attribute' });
    if (upsert.error) throw upsert.error;
  }

  const keep = rows.map((r) => r.attribute);
  let del = supabase.from('preference_items').delete().eq('user_id', userId);
  if (keep.length > 0) del = del.not('attribute', 'in', `(${keep.join(',')})`);
  const removed = await del;
  if (removed.error) throw removed.error;
}
