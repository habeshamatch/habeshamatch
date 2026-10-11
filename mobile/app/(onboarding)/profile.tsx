import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chips } from '@/components/Chips';
import { CountryPicker } from '@/components/CountryPicker';
import { DateOfBirthField } from '@/components/DateOfBirthField';
import { FieldLabel, Notice, ProgressBar, TextField, ToggleRow } from '@/components/FormControls';
import { HeightField } from '@/components/HeightField';
import { LanguagePicker } from '@/components/LanguagePicker';
import { errorCode, friendlyError } from '@/lib/errors';
import { defaultHeightUnit } from '@/lib/height';
import {
  isKnownLanguage,
  languageName,
  MAX_LANGUAGES,
  QUICK_LANGUAGE_CODES,
  QUICK_LANGUAGES,
} from '@/lib/languages';
import { formatForDisplay, getCountry } from '@/lib/phone';
import { clearDraft, emptyDraft, loadDraft, saveDraft, type ProfileDraft } from '@/lib/profileDraft';
import {
  BIO_MAX,
  DISPLAY_NAME_MAX,
  GENDERS,
  HEIGHT_MAX_CM,
  HEIGHT_MIN_CM,
  INCOME_RANGES,
  INTENTS,
  MIN_AGE,
  ORIGINS,
  RELIGIONS,
} from '@/lib/profileOptions';
import {
  fetchResidenceRules,
  hasLocalTierPhone,
  isLocalTierCountry,
  phoneCountry,
  type ResidenceRules,
} from '@/lib/residence';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing, typography } from '@/lib/theme';

const STEPS = ['About you', 'Background', 'Where you live', 'Your bio'];

function ageOn(dob: string, today = new Date()): number {
  const [y, m, d] = dob.split('-').map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
}

function latestAllowedBirthDate(): Date {
  const t = new Date();
  return new Date(t.getFullYear() - MIN_AGE, t.getMonth(), t.getDate());
}

// What is wrong with the current step, or null if the user can continue.
function stepProblem(step: number, d: ProfileDraft, rules: ResidenceRules, phone: string | undefined): string | null {
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

export default function ProfileWizard() {
  const { session, refreshProfile } = useSession();
  const userId = session?.user.id ?? '';
  const phone = session?.user.phone;

  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [rules, setRules] = useState<ResidenceRules | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Load the saved draft (resume) and the residence rules from the database.
  // "Try again" bumps loadAttempt to run this again.
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadDraft(userId), fetchResidenceRules()])
      .then(([saved, fetchedRules]) => {
        if (cancelled) return;
        setDraft({
          ...emptyDraft(defaultHeightUnit()),
          ...saved,
          // Drafts from before languages became codes may hold old names; keep only known codes.
          languages: (saved?.languages ?? []).filter(isKnownLanguage),
          // Pre-fill residence from the verified phone's country.
          residenceCountry: saved?.residenceCountry ?? phoneCountry(phone),
        });
        setRules(fetchedRules);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(friendlyError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [userId, phone, loadAttempt]);

  // Keep the draft on the device as the user goes.
  useEffect(() => {
    if (!draft || !userId) return;
    const t = setTimeout(() => saveDraft(userId, draft), 400);
    return () => clearTimeout(t);
  }, [draft, userId]);

  const update = useCallback((patch: Partial<ProfileDraft>) => {
    setProblem(null);
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }, []);

  const goTo = useCallback(
    (step: number) => {
      setProblem(null);
      update({ step });
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [update],
  );

  // Android back button moves to the previous step instead of leaving the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (draft && draft.step > 0) {
        goTo(draft.step - 1);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [draft, goTo]);

  const save = async (d: ProfileDraft) => {
    setSaving(true);
    setProblem(null);
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      display_name: d.displayName.trim(),
      date_of_birth: d.dateOfBirth as string,
      gender: d.gender!,
      height_cm: d.heightCm,
      origin: d.origin!,
      religion: d.religion!,
      languages: d.languages,
      relationship_intent: d.intent!,
      income_range: d.incomeRange,
      current_city: d.currentCity.trim(),
      residence_country_code: d.residenceCountry as string,
      open_to_relocating: d.openToRelocating,
      open_to_long_distance: d.openToLongDistance,
      bio: d.bio.trim() || null,
    });

    if (error && error.code !== '23505') {
      // 23505: the profile already exists (e.g. saved just before the app closed). Treat as success.
      setSaving(false);
      const code = errorCode(error);
      if (code === 'must_be_18') goTo(0);
      if (code === 'local_residence_requires_local_phone') goTo(2);
      if (code === 'phone_not_verified') {
        // The account has no confirmed phone after all: refresh so routing returns to that step.
        await supabase.auth.refreshSession();
      }
      setProblem(friendlyError(error));
      return;
    }
    await clearDraft(userId);
    await refreshProfile(); // routing moves on to the next onboarding step
  };

  const next = () => {
    if (!draft || !rules) return;
    const issue = stepProblem(draft.step, draft, rules, phone);
    if (issue) {
      setProblem(issue);
      return;
    }
    if (draft.step < STEPS.length - 1) goTo(draft.step + 1);
    else save(draft);
  };

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={[typography.body, styles.centerText]}>{loadError}</Text>
        <Button
          label="Try again"
          variant="secondary"
          onPress={() => {
            setLoadError(null);
            setLoadAttempt((n) => n + 1);
          }}
        />
      </SafeAreaView>
    );
  }
  if (!draft || !rules) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const step = draft.step;
  const isLast = step === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {step > 0 ? (
              <Pressable onPress={() => goTo(step - 1)} accessibilityRole="button" hitSlop={12}>
                <Text style={[typography.button, { color: colors.accent }]}>Back</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Text style={typography.caption}>
              Step {step + 1} of {STEPS.length}
            </Text>
          </View>
          <ProgressBar step={step} total={STEPS.length} />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={typography.title}>{STEPS[step]}</Text>
          {step === 0 && <AboutYou draft={draft} update={update} />}
          {step === 1 && <Background draft={draft} update={update} />}
          {step === 2 && <Residence draft={draft} update={update} rules={rules} phone={phone} />}
          {step === 3 && <Bio draft={draft} update={update} />}
        </ScrollView>

        <View style={styles.footer}>
          {problem && (
            <Text style={[typography.caption, styles.problem]} accessibilityLiveRegion="polite">
              {problem}
            </Text>
          )}
          <Button label={isLast ? 'Create my profile' : 'Continue'} onPress={next} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type StepProps = { draft: ProfileDraft; update: (patch: Partial<ProfileDraft>) => void };

function AboutYou({ draft, update }: StepProps) {
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

function Background({ draft, update }: StepProps) {
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

function Residence({
  draft,
  update,
  rules,
  phone,
}: StepProps & { rules: ResidenceRules; phone: string | undefined }) {
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
        style={styles.countryField}
        accessibilityRole="button"
        accessibilityLabel={`Country of residence: ${country?.name ?? 'not chosen'}. Change`}
      >
        <Text style={typography.body}>{country ? `${country.flag}  ${country.name}` : 'Choose a country'}</Text>
        <Text style={[typography.button, { color: colors.accent }]}>Change</Text>
      </Pressable>

      <Notice>
        {`Your country of residence sets your pricing on HabeshaMatch. You can change it once every ${rules.cooldownDays} days, so choose where you actually live.`}
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

function Bio({ draft, update }: StepProps) {
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  centerText: {
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 32,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  problem: {
    color: colors.rose,
    textAlign: 'center',
  },
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
