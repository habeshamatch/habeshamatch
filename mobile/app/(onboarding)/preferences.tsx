import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chips } from '@/components/Chips';
import { Notice } from '@/components/FormControls';
import { LanguagePicker } from '@/components/LanguagePicker';
import { MultiSelectSheet, type SelectSection } from '@/components/MultiSelectSheet';
import { Stepper } from '@/components/Stepper';
import { friendlyError } from '@/lib/errors';
import { defaultHeightUnit, formatHeight } from '@/lib/height';
import { languageName, QUICK_LANGUAGE_CODES, QUICK_LANGUAGES } from '@/lib/languages';
import { getCountry, otherCountries, pinnedCountries } from '@/lib/phone';
import {
  AGE_MAX,
  loadPreferences,
  MAX_COUNTRIES,
  savePreferences,
  type ListPref,
  type PrefKind,
  type Preferences,
} from '@/lib/preferences';
import {
  EDUCATION_LEVELS,
  HEIGHT_MAX_CM,
  HEIGHT_MIN_CM,
  INCOME_THRESHOLDS,
  INTENTS,
  MIN_AGE,
  ORIGINS,
  RELIGIONS,
} from '@/lib/profileOptions';
import { useSession } from '@/lib/session';
import { colors, radius, spacing, typography } from '@/lib/theme';

const SEEKING = [
  { value: 'female' as const, label: 'Women' },
  { value: 'male' as const, label: 'Men' },
];
// "Prefer not to say" is an answer about yourself, not something to look for.
const RELIGION_CHOICES = RELIGIONS.filter((r) => r.value !== 'prefer_not_to_say');
// "Prefer not to say" is an answer about yourself, not something to look for.
const EDUCATION_CHOICES = EDUCATION_LEVELS.filter((e) => e.value !== 'prefer_not_to_say');
const KINDS = [
  { value: 'hard' as const, label: 'Must have' },
  { value: 'soft' as const, label: 'Nice to have' },
];
const COUNTRY_SECTIONS: SelectSection[] = [
  { title: 'Common', items: pinnedCountries.map((c) => ({ value: c.code, label: `${c.flag}  ${c.name}` })) },
  { title: 'All countries', items: otherCountries.map((c) => ({ value: c.code, label: `${c.flag}  ${c.name}` })) },
];

export default function PreferencesScreen() {
  const { session, refreshProfile } = useSession();
  const userId = session?.user.id ?? '';
  const heightUnit = useMemo(() => defaultHeightUnit(), []);
  // Height steppers move one cm, or one inch in feet and inches. Always stored in cm.
  const toUnit = (cm: number) => (heightUnit === 'cm' ? cm : Math.round(cm / 2.54));
  const fromUnit = (v: number) => (heightUnit === 'cm' ? v : Math.round(v * 2.54));

  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [alreadySaved, setAlreadySaved] = useState(false); // false during onboarding
  const [softThresholdPct, setSoftThresholdPct] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [picker, setPicker] = useState<'languages' | 'countries' | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPreferences(userId)
      .then((loaded) => {
        if (cancelled) return;
        setPrefs(loaded.prefs);
        setAlreadySaved(loaded.saved);
        setSoftThresholdPct(Math.round(loaded.softMatchThreshold * 100));
      })
      .catch((e) => {
        if (!cancelled) setLoadError(friendlyError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [userId, loadAttempt]);

  const update = (patch: Partial<Preferences>) => {
    setProblem(null);
    setPrefs((p) => (p ? { ...p, ...patch } : p));
  };

  const save = async () => {
    if (!prefs) return;
    if (!prefs.seekingGender) {
      setProblem('Please choose who you are interested in.');
      return;
    }
    setSaving(true);
    setProblem(null);
    try {
      await savePreferences(userId, prefs);
      if (alreadySaved) {
        router.back();
      } else {
        await refreshProfile(); // onboarding is complete; the app opens
        router.replace('/');
      }
    } catch (e) {
      setProblem(friendlyError(e));
      setSaving(false);
    }
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
  if (!prefs) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const mustHaveCount = (['religion', 'origin', 'languages', 'intent', 'education', 'country'] as const).filter(
    (k) => prefs[k].values.length > 0 && prefs[k].kind === 'hard',
  ).length +
    (prefs.height.enabled && prefs.height.kind === 'hard' ? 1 : 0) +
    (prefs.income.min && prefs.income.kind === 'hard' ? 1 : 0);

  const listCard = (
    key: 'religion' | 'origin' | 'intent' | 'education',
    title: string,
    options: { value: string; label: string }[],
    opts: { single?: boolean; hint?: string } = {},
  ) => (
    <PreferenceCard
      title={title}
      hint={opts.hint}
      pref={prefs[key]}
      onKind={(kind) => update({ [key]: { ...prefs[key], kind } })}
      onClear={() => update({ [key]: { ...prefs[key], values: [] } })}
    >
      <Chips
        multiple={!opts.single}
        options={options}
        selected={prefs[key].values}
        onToggle={(v) => {
          const values = prefs[key].values;
          const next = opts.single
            ? values.includes(v) ? [] : [v]
            : values.includes(v) ? values.filter((x) => x !== v) : [...values, v];
          update({ [key]: { ...prefs[key], values: next } });
        }}
        label={title}
      />
    </PreferenceCard>
  );

  const extraLanguages = prefs.languages.values.filter((c) => !QUICK_LANGUAGE_CODES.includes(c));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {alreadySaved ? (
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
            <Text style={[typography.button, { color: colors.accent }]}>Back</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.replace('/photos')} accessibilityRole="button" hitSlop={12}>
            <Text style={[typography.button, { color: colors.accent }]}>Back to photos</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={typography.title}>{alreadySaved ? 'Your preferences' : 'Who are you looking for?'}</Text>

        <Text style={[typography.body, styles.sectionLabel]}>Interested in</Text>
        <Chips
          options={SEEKING}
          selected={prefs.seekingGender ? [prefs.seekingGender] : []}
          onToggle={(v) => update({ seekingGender: v })}
          label="Interested in"
        />

        <Text style={[typography.body, styles.sectionLabel]}>Age</Text>
        <View style={styles.pair}>
          <Stepper
            label="From"
            value={prefs.ageMin}
            min={MIN_AGE}
            max={prefs.ageMax}
            onChange={(ageMin) => update({ ageMin })}
          />
          <Stepper
            label="To"
            value={prefs.ageMax}
            min={prefs.ageMin}
            max={AGE_MAX}
            onChange={(ageMax) => update({ ageMax })}
          />
        </View>
        <Text style={typography.caption}>Gender and age always apply, in both directions.</Text>

        <Notice>
          {`Everything below is optional. "Must have" is a deal-breaker: you only see people who match it, and people who do not match it cannot start a chat with you. ${
            softThresholdPct > 0
              ? `"Nice to have" ranks people: those who match more of them come first, and people who match less than ${softThresholdPct}% of your nice-to-haves are left out of your main matches.`
              : '"Nice to have" only ranks people: those who match more of them come first, and nobody is hidden.'
          }`}
        </Notice>
        {mustHaveCount >= 3 && (
          <Notice tone="warning">
            {`You have ${mustHaveCount} must-haves. Each one shrinks who you can meet, so consider making some of them nice to have.`}
          </Notice>
        )}

        {listCard('religion', 'Religion', RELIGION_CHOICES)}
        {listCard('origin', 'Origin', ORIGINS)}

        <PreferenceCard
          title="Languages"
          hint="Matches anyone who speaks at least one of these."
          pref={prefs.languages}
          onKind={(kind) => update({ languages: { ...prefs.languages, kind } })}
          onClear={() => update({ languages: { ...prefs.languages, values: [] } })}
        >
          <Chips
            multiple
            options={[
              ...QUICK_LANGUAGES.map((l) => ({ value: l.code, label: l.name })),
              ...extraLanguages.map((c) => ({ value: c, label: `${languageName(c)}  ✕` })),
            ]}
            selected={prefs.languages.values}
            onToggle={(v) => {
              const values = prefs.languages.values;
              update({
                languages: {
                  ...prefs.languages,
                  values: values.includes(v) ? values.filter((x) => x !== v) : [...values, v],
                },
              });
            }}
            label="Languages"
          />
          <LinkButton label="+ More languages" onPress={() => setPicker('languages')} />
        </PreferenceCard>

        {listCard('intent', 'Looking for', INTENTS)}
        {listCard('education', 'Education', EDUCATION_CHOICES, {
          hint: 'Choose every level you are open to.',
        })}

        <PreferenceCard
          title="Height"
          pref={{ values: prefs.height.enabled ? ['set'] : [], kind: prefs.height.kind }}
          onKind={(kind) => update({ height: { ...prefs.height, kind } })}
          onClear={() => update({ height: { ...prefs.height, enabled: false } })}
        >
          {prefs.height.enabled ? (
            <View style={styles.pair}>
              <Stepper
                label="From"
                value={toUnit(prefs.height.min)}
                min={toUnit(HEIGHT_MIN_CM)}
                max={toUnit(prefs.height.max)}
                format={(v) => formatHeight(fromUnit(v), heightUnit)}
                onChange={(v) => update({ height: { ...prefs.height, min: fromUnit(v) } })}
              />
              <Stepper
                label="To"
                value={toUnit(prefs.height.max)}
                min={toUnit(prefs.height.min)}
                max={toUnit(HEIGHT_MAX_CM)}
                format={(v) => formatHeight(fromUnit(v), heightUnit)}
                onChange={(v) => update({ height: { ...prefs.height, max: fromUnit(v) } })}
              />
            </View>
          ) : (
            <LinkButton label="+ Set a height range" onPress={() => update({ height: { ...prefs.height, enabled: true } })} />
          )}
        </PreferenceCard>

        <PreferenceCard
          title="Income"
          hint='At least this much per year, in US dollars. People who chose "Prefer not to say" do not meet this.'
          pref={{ values: prefs.income.min ? [prefs.income.min] : [], kind: prefs.income.kind }}
          onKind={(kind) => update({ income: { ...prefs.income, kind } })}
          onClear={() => update({ income: { ...prefs.income, min: null } })}
        >
          <Chips
            options={INCOME_THRESHOLDS}
            selected={prefs.income.min ? [prefs.income.min] : []}
            onToggle={(v) => update({ income: { ...prefs.income, min: prefs.income.min === v ? null : v } })}
            label="Income at least"
          />
        </PreferenceCard>

        <PreferenceCard
          title="Where they live"
          hint="Countries where they live now."
          pref={prefs.country}
          onKind={(kind) => update({ country: { ...prefs.country, kind } })}
          onClear={() => update({ country: { ...prefs.country, values: [] } })}
        >
          {prefs.country.values.length > 0 && (
            <Chips
              multiple
              options={prefs.country.values.map((c) => {
                const country = getCountry(c);
                return { value: c, label: `${country.flag} ${country.name}  ✕` };
              })}
              selected={prefs.country.values}
              onToggle={(v) => update({ country: { ...prefs.country, values: prefs.country.values.filter((x) => x !== v) } })}
              label="Countries. Tap to remove."
            />
          )}
          <LinkButton
            label={prefs.country.values.length > 0 ? '+ Add or remove countries' : '+ Choose countries'}
            onPress={() => setPicker('countries')}
          />
        </PreferenceCard>
      </ScrollView>

      <View style={styles.footer}>
        {problem && (
          <Text style={[typography.caption, styles.problem]} accessibilityLiveRegion="polite">
            {problem}
          </Text>
        )}
        <Button label={alreadySaved ? 'Save' : 'Finish'} onPress={save} loading={saving} />
      </View>

      <LanguagePicker
        visible={picker === 'languages'}
        title="Languages they speak"
        selected={prefs.languages.values}
        onChange={(values) => update({ languages: { ...prefs.languages, values } })}
        onClose={() => setPicker(null)}
      />
      <MultiSelectSheet
        visible={picker === 'countries'}
        title="Countries they live in"
        searchPlaceholder="Search countries"
        sections={COUNTRY_SECTIONS}
        selected={prefs.country.values}
        onChange={(values) => update({ country: { ...prefs.country, values } })}
        onClose={() => setPicker(null)}
        max={MAX_COUNTRIES}
      />
    </SafeAreaView>
  );
}

function PreferenceCard({
  title,
  hint,
  pref,
  onKind,
  onClear,
  children,
}: {
  title: string;
  hint?: string;
  pref: ListPref;
  onKind: (kind: PrefKind) => void;
  onClear: () => void;
  children: ReactNode;
}) {
  const isSet = pref.values.length > 0;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[typography.body, styles.cardTitle]}>{title}</Text>
        {isSet ? (
          <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel={`Clear ${title}`} hitSlop={8}>
            <Text style={[typography.caption, { color: colors.accent }]}>Clear</Text>
          </Pressable>
        ) : (
          <Text style={typography.caption}>Any</Text>
        )}
      </View>
      {hint && <Text style={typography.caption}>{hint}</Text>}
      {children}
      {isSet && (
        <View style={styles.kind}>
          <Chips options={KINDS} selected={[pref.kind]} onToggle={onKind} label={`${title}: must have or nice to have`} />
        </View>
      )}
    </View>
  );
}

function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} style={styles.link}>
      <Text style={[typography.button, { color: colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    minHeight: 32,
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: typography.button.fontFamily,
    marginTop: spacing.md,
  },
  pair: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: typography.button.fontFamily,
  },
  kind: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceRaised,
  },
  link: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
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
});
