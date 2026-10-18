import { useCallback, useEffect, useRef, useState } from 'react';
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
import { ProgressBar } from '@/components/FormControls';
import { AboutYou, Background, Bio, Residence, stepProblem } from '@/components/ProfileFields';
import { errorCode, friendlyError } from '@/lib/errors';
import { defaultHeightUnit } from '@/lib/height';
import { isKnownLanguage } from '@/lib/languages';
import { clearDraft, emptyDraft, loadDraft, saveDraft, type ProfileDraft } from '@/lib/profileDraft';
import { fetchResidenceRules, phoneCountry, type ResidenceRules } from '@/lib/residence';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { colors, spacing, typography } from '@/lib/theme';

const STEPS = ['About you', 'Background', 'Where you live', 'Your bio'];

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
      education_level: d.educationLevel,
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
});
