import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { FieldLabel, Notice, TextField } from '@/components/FormControls';
import { Background, Bio, FamilyLifestyle, Residence, stepProblem } from '@/components/ProfileFields';
import { fetchMyProfile, profileToDraft, residenceLockedUntil, saveMyProfile } from '@/lib/account';
import { friendlyError } from '@/lib/errors';
import type { ProfileDraft } from '@/lib/profileDraft';
import { DISPLAY_NAME_MAX, GENDERS } from '@/lib/profileOptions';
import { fetchResidenceRules } from '@/lib/residence';
import { useSession } from '@/lib/session';
import { colors, spacing, typography } from '@/lib/theme';

// Edit everything from the wizard except date of birth and gender.
export default function EditProfile() {
  const { session } = useSession();
  const myId = session?.user.id ?? '';
  const queryClient = useQueryClient();

  const profile = useQuery({ queryKey: ['my-profile', myId], queryFn: () => fetchMyProfile(myId), enabled: !!myId });
  const rules = useQuery({ queryKey: ['residence-rules'], queryFn: fetchResidenceRules });
  // Only the changes are kept in state; the form shows the saved profile with them applied.
  const [edits, setEdits] = useState<Partial<ProfileDraft>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const draft: ProfileDraft | null = profile.data ? { ...profileToDraft(profile.data), ...edits } : null;

  const update = (patch: Partial<ProfileDraft>) => {
    setProblem(null);
    setEdits((e) => ({ ...e, ...patch }));
  };

  const back = (
    <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12} style={styles.back}>
      <Text style={[typography.button, { color: colors.accent }]}>Cancel</Text>
    </Pressable>
  );

  if (profile.isError || rules.isError) {
    return (
      <SafeAreaView style={styles.container}>
        {back}
        <View style={styles.center}>
          <Text style={[typography.body, styles.centerText]}>{friendlyError(profile.error ?? rules.error)}</Text>
          <Button
            label="Try again"
            variant="secondary"
            onPress={() => {
              profile.refetch();
              rules.refetch();
            }}
          />
        </View>
      </SafeAreaView>
    );
  }
  if (!draft || !rules.data || !profile.data) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const lockedUntil = residenceLockedUntil(profile.data.residence_changed_at, rules.data.cooldownDays);
  const gender = GENDERS.find((g) => g.value === profile.data.gender)?.label;
  const dob = new Date(`${profile.data.date_of_birth}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const save = async () => {
    if (!draft.displayName.trim()) {
      setProblem('Please enter your first name.');
      return;
    }
    for (const step of [1, 2, 3, 4]) {
      const issue = stepProblem(step, draft, rules.data, session?.user.phone);
      if (issue) {
        setProblem(issue);
        return;
      }
    }
    setSaving(true);
    setProblem(null);
    try {
      await saveMyProfile(myId, draft);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-profile', myId] }),
        queryClient.invalidateQueries({ queryKey: ['profile', myId] }),
      ]);
      router.back();
    } catch (e) {
      setProblem(friendlyError(e));
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {back}
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={typography.title}>Edit profile</Text>

          <FieldLabel>First name</FieldLabel>
          <TextField
            value={draft.displayName}
            onChangeText={(t) => update({ displayName: t })}
            maxLength={DISPLAY_NAME_MAX}
            autoCapitalize="words"
            accessibilityLabel="First name"
          />
          <Notice>{`Date of birth: ${dob}. Gender: ${gender}. These cannot be changed in the app. If one is wrong, please contact support.`}</Notice>

          <Text style={[typography.subtitle, styles.section]}>Background</Text>
          <Background draft={draft} update={update} />

          <Text style={[typography.subtitle, styles.section]}>Family & lifestyle</Text>
          <FamilyLifestyle draft={draft} update={update} />

          <Text style={[typography.subtitle, styles.section]}>Where you live</Text>
          <Residence
            draft={draft}
            update={update}
            rules={rules.data}
            phone={session?.user.phone}
            lockedUntil={lockedUntil}
          />

          <Text style={[typography.subtitle, styles.section]}>Your bio</Text>
          <Bio draft={draft} update={update} />
        </ScrollView>

        <View style={styles.footer}>
          {problem && (
            <Text style={[typography.caption, styles.problem]} accessibilityLiveRegion="polite">
              {problem}
            </Text>
          )}
          <Button label="Save" onPress={save} loading={saving} />
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  centerText: {
    textAlign: 'center',
  },
  back: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  section: {
    marginTop: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  problem: {
    color: colors.rose,
    textAlign: 'center',
  },
});
