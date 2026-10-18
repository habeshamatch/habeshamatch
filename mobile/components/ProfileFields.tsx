import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chips } from '@/components/Chips';
import { CountryPicker } from '@/components/CountryPicker';
import { DateOfBirthField } from '@/components/DateOfBirthField';
import { FieldLabel, Notice, TextField, ToggleRow } from '@/components/FormControls';
import { HeightField } from '@/components/HeightField';
import { LanguagePicker } from '@/components/LanguagePicker';
import {
  languageName,
  MAX_LANGUAGES,
  QUICK_LANGUAGE_CODES,
  QUICK_LANGUAGES,
} from '@/lib/languages';
import { formatForDisplay, getCountry } from '@/lib/phone';
import type { ProfileDraft } from '@/lib/profileDraft';
import {
  BIO_MAX,
  DISPLAY_NAME_MAX,
  EDUCATION_LEVELS,
  GENDERS,
  HEIGHT_MAX_CM,
  HEIGHT_MIN_CM,
  INCOME_RANGES,
  INTENTS,
  MIN_AGE,
  ORIGINS,
  RELIGIONS,
} from '@/lib/profileOptions';
import { hasLocalTierPhone, isLocalTierCountry, phoneCountry, type ResidenceRules } from '@/lib/residence';
import { colors, radius, spacing, typography } from '@/lib/theme';

// Profile fields shared by the onboarding wizard (profile-setup) and Edit profile.

export function ageOn(dob: string, today = new Date()): number {
  const [y, m, d] = dob.split('-').map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
}

export function latestAllowedBirthDate(): Date {
  const t = new Date();
  return new Date(t.getFullYear() - MIN_AGE, t.getMonth(), t.getDate());
}

// What is wrong with the current step, or null if the user can continue.
export function stepProblem(step: number, d: ProfileDraft, rules: ResidenceRules, phone: string | undefined): string | null {
  switch (step) {
    case 0:
      if (!d.displayName.trim()) return 'Please enter your first name.';
      if (!d.dateOfBirth) return 'Please select your date of birth.';
      if (ageOn(d.dateOfBirth) < MIN_AGE) return `You must be ${MIN_AGE} or older to use HabeshaMatch.`;
      if (!d.gender) return 'Please choose your gender.';
      return null;
    case 1:
      if (!d.origin) return 'Please choose where your family is from.';
      if (!d.heightCm || d.heightCm < HEIGHT_MIN_CM || d.heightCm > HEIGHT_MAX_CM)
        return 'Please enter a valid height.';
      if (!d.religion) return 'Please choose your religion, or "Prefer not to say".';
      if (d.languages.length === 0) return 'Please choose at least one language.';
      if (!d.intent) return 'Please choose what you are looking for.';
      if (!d.educationLevel) return 'Please choose your education, or "Prefer not to say".';
      if (!d.incomeRange) return 'Please choose your income range, or "Prefer not to say".';
      return null;
    case 2:
      if (!d.currentCity.trim()) return 'Please enter the city you live in.';
      if (!d.residenceCountry) return 'Please choose your country of residence.';
      if (isLocalTierCountry(d.residenceCountry, rules) && !hasLocalTierPhone(phone, rules))
        return 'Please read the note about your country of residence.';
      return null;
    case 3:
      if (d.bio.length > BIO_MAX) return `Your bio can be up to ${BIO_MAX} characters.`;
      return null;
    default:
      return null;
  }
}

export type StepProps = { draft: ProfileDraft; update: (patch: Partial<ProfileDraft>) => void };

export function AboutYou({ draft, update }: StepProps) {
  const maxDate = useMemo(() => latestAllowedBirthDate(), []);
  return (
    <View>
      <FieldLabel>First name</FieldLabel>
      <TextField
        value={draft.displayName}
        onChangeText={(t) => update({ displayName: t })}
        placeholder="Your first name"
        maxLength={DISPLAY_NAME_MAX}
        autoCapitalize="words"
        textContentType="givenName"
        autoComplete="name-given"
        accessibilityLabel="First name"
      />

      <FieldLabel hint="Only your age is shown on your profile. Your date of birth cannot be changed later.">
        Date of birth
      </FieldLabel>
      <DateOfBirthField value={draft.dateOfBirth} onChange={(v) => update({ dateOfBirth: v })} maximumDate={maxDate} />
      {draft.dateOfBirth && ageOn(draft.dateOfBirth) < MIN_AGE && (
        <Notice tone="error">{`You must be ${MIN_AGE} or older to use HabeshaMatch.`}</Notice>
      )}

      <FieldLabel>I am a</FieldLabel>
      <Chips
        options={GENDERS}
        selected={draft.gender ? [draft.gender] : []}
        onToggle={(v) => update({ gender: v })}
        label="Gender"
      />
    </View>
  );
}

export function Background({ draft, update }: StepProps) {
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  // Languages chosen from the full list that are not quick chips, shown so they can be removed.
  const extraLanguages = draft.languages.filter((c) => !QUICK_LANGUAGE_CODES.includes(c));
  const toggleLanguage = (code: string) => {
    if (draft.languages.includes(code)) update({ languages: draft.languages.filter((c) => c !== code) });
    else if (draft.languages.length < MAX_LANGUAGES) update({ languages: [...draft.languages, code] });
  };

  return (
    <View>
      <FieldLabel>Origin</FieldLabel>
      <Chips
        options={ORIGINS}
        selected={draft.origin ? [draft.origin] : []}
        onToggle={(v) => update({ origin: v })}
        label="Origin"
      />

      <FieldLabel>Height</FieldLabel>
      <HeightField
        heightCm={draft.heightCm}
        unit={draft.heightUnit}
        onChange={(heightCm, heightUnit) => update({ heightCm, heightUnit })}
      />

      <FieldLabel>Religion</FieldLabel>
      <Chips
        options={RELIGIONS}
        selected={draft.religion ? [draft.religion] : []}
        onToggle={(v) => update({ religion: v })}
        label="Religion"
      />

      <FieldLabel hint="Choose all that you speak.">Languages</FieldLabel>
      <Chips
        multiple
        options={QUICK_LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
        selected={draft.languages}
        onToggle={toggleLanguage}
        label="Languages"
      />
      {extraLanguages.length > 0 && (
        <View style={styles.spaced}>
          <Chips
            multiple
            options={extraLanguages.map((code) => ({ value: code, label: `${languageName(code)}  ✕` }))}
            selected={extraLanguages}
            onToggle={toggleLanguage}
            label="Other languages you chose. Tap to remove."
          />
        </View>
      )}
      <Pressable
        onPress={() => setLanguagePickerOpen(true)}
        style={styles.addLanguages}
        accessibilityRole="button"
        hitSlop={8}
      >
        <Text style={[typography.button, { color: colors.accent }]}>+ Add more languages</Text>
      </Pressable>
      <LanguagePicker
        visible={languagePickerOpen}
        selected={draft.languages}
        onChange={(languages) => update({ languages })}
        onClose={() => setLanguagePickerOpen(false)}
      />

      <FieldLabel>Looking for</FieldLabel>
      <Chips
        options={INTENTS}
        selected={draft.intent ? [draft.intent] : []}
        onToggle={(v) => update({ intent: v })}
        label="Relationship intent"
      />

      <FieldLabel>Education</FieldLabel>
      <Chips
        options={EDUCATION_LEVELS}
        selected={draft.educationLevel ? [draft.educationLevel] : []}
        onToggle={(v) => update({ educationLevel: v })}
        label="Highest education"
      />

      <FieldLabel hint="Per year, in US dollars.">Income</FieldLabel>
      <Chips
        options={INCOME_RANGES}
        selected={draft.incomeRange ? [draft.incomeRange] : []}
        onToggle={(v) => update({ incomeRange: v })}
        label="Yearly income"
      />
    </View>
  );
}

export function Residence({
  draft,
  update,
  rules,
  phone,
  lockedUntil = null,
}: StepProps & {
  rules: ResidenceRules;
  phone: string | undefined;
  // Edit profile only: residence changed recently, so the country cannot change until this date.
  lockedUntil?: Date | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const country = draft.residenceCountry ? getCountry(draft.residenceCountry) : null;
  const localPhone = hasLocalTierPhone(phone, rules);
  const pickedLocal = isLocalTierCountry(draft.residenceCountry, rules);
  const phoneCountryName = getCountry(phoneCountry(phone) ?? 'US').name;
  const localNames = rules.localTierCountries.map((c) => c.name).join(', ');

  return (
    <View>
      <FieldLabel>City you live in</FieldLabel>
      <TextField
        value={draft.currentCity}
        onChangeText={(t) => update({ currentCity: t })}
        placeholder="e.g. Toronto"
        maxLength={60}
        autoCapitalize="words"
        textContentType="addressCity"
        accessibilityLabel="City you live in"
      />

      <FieldLabel hint="Where you permanently live, not where you are visiting.">Country of residence</FieldLabel>
      <Pressable
        onPress={() => setPickerOpen(true)}
        disabled={!!lockedUntil}
        style={styles.countryField}
        accessibilityRole="button"
        accessibilityLabel={`Country of residence: ${country?.name ?? 'not chosen'}.${lockedUntil ? '' : ' Change'}`}
      >
        <Text style={typography.body}>{country ? `${country.flag}  ${country.name}` : 'Choose a country'}</Text>
        {!lockedUntil && <Text style={[typography.button, { color: colors.accent }]}>Change</Text>}
      </Pressable>

      <Notice>
        {lockedUntil
          ? `You changed your country of residence recently. You can change it again on ${lockedUntil.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.`
          : `You can change your country of residence once every ${rules.cooldownDays} days, so choose where you actually live.`}
      </Notice>

      {pickedLocal && !localPhone && country && (
        <Notice tone="error">
          {`To live in ${country.name} on HabeshaMatch, your verified phone number must be from one of these countries: ${localNames}. Your number ${formatForDisplay(`+${(phone ?? '').replace(/^\+/, '')}`)} is from ${phoneCountryName}. If you live in ${country.name}, please contact support.`}
        </Notice>
      )}
      {localPhone && !pickedLocal && country && (
        <Notice tone="warning">
          {`Your phone number is from ${phoneCountryName}, where HabeshaMatch is free with unlimited new conversations. If you live in ${country.name}, you will be on the standard plan instead and lose the free local tier.`}
        </Notice>
      )}

      <ToggleRow
        label="Open to relocating"
        value={draft.openToRelocating}
        onChange={(v) => update({ openToRelocating: v })}
      />
      <ToggleRow
        label="Open to long distance"
        value={draft.openToLongDistance}
        onChange={(v) => update({ openToLongDistance: v })}
      />

      <CountryPicker
        visible={pickerOpen}
        selected={country ?? getCountry('US')}
        onSelect={(c) => update({ residenceCountry: c.code })}
        onClose={() => setPickerOpen(false)}
        title="Where do you live?"
        showDialCode={false}
      />
    </View>
  );
}

export function Bio({ draft, update }: StepProps) {
  const remaining = BIO_MAX - draft.bio.length;
  return (
    <View>
      <FieldLabel hint="A few lines about you and what you are looking for. You can change this later.">
        About me
      </FieldLabel>
      <TextField
        value={draft.bio}
        onChangeText={(t) => update({ bio: t })}
        placeholder="I love family Sundays, coffee ceremonies and..."
        multiline
        maxLength={BIO_MAX}
        textAlignVertical="top"
        style={styles.bio}
        accessibilityLabel="Bio"
      />
      <Text style={[typography.caption, styles.counter, remaining < 50 && { color: colors.accentSoft }]}>
        {draft.bio.length} / {BIO_MAX}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  spaced: {
    marginTop: spacing.sm,
  },
  addLanguages: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.md,
  },
  countryField: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  bio: {
    minHeight: 160,
    paddingTop: spacing.md,
  },
  counter: {
    textAlign: 'right',
    marginTop: spacing.xs,
  },
});
