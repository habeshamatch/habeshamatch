import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { Chips } from '@/components/Chips';
import { TextField, ToggleRow } from '@/components/FormControls';
import { Sheet } from '@/components/Sheet';
import { friendlyError } from '@/lib/errors';
import { blockUser, PEOPLE_QUERY_KEYS, REPORT_CATEGORIES, REPORT_DETAILS_MAX, reportUser } from '@/lib/safety';
import { useSession } from '@/lib/session';
import { colors, spacing, typography } from '@/lib/theme';
import type { Enums } from '@/types/database';

type Step = 'menu' | 'report' | 'confirmBlock' | 'done';

type Props = {
  userId: string;
  name: string;
  // Called after a block so the screen can leave (the person is now hidden everywhere).
  onBlocked: () => void;
};

// "⋯" button with Report and Block, shown on every profile and chat.
export function SafetyMenu({ userId, name, onBlocked }: Props) {
  const { session } = useSession();
  const myId = session?.user.id ?? '';
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('menu');
  const [category, setCategory] = useState<Enums<'report_category_t'> | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  const close = () => {
    setOpen(false);
    if (blocked) onBlocked();
    // Reset for next time.
    setStep('menu');
    setCategory(null);
    setDetails('');
    setAlsoBlock(true);
    setError(null);
    setBlocked(false);
  };

  const afterBlock = async () => {
    setBlocked(true);
    await Promise.all(PEOPLE_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    queryClient.removeQueries({ queryKey: ['profile', userId] });
    queryClient.removeQueries({ queryKey: ['conversation-with', userId] });
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const submitReport = () =>
    run(async () => {
      if (!category) return;
      await reportUser(myId, userId, category, details);
      if (alsoBlock) {
        await blockUser(myId, userId);
        await afterBlock();
      }
      setStep('done');
    });

  const confirmBlock = () =>
    run(async () => {
      await blockUser(myId, userId);
      await afterBlock();
      close();
      onBlocked();
    });

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`More options for ${name}: report or block`}
      >
        <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
      </Pressable>

      <Sheet visible={open} onClose={close}>
        {step === 'menu' && (
          <>
            <Button label={`Report ${name}`} variant="secondary" onPress={() => setStep('report')} />
            <Button label={`Block ${name}`} variant="secondary" onPress={() => setStep('confirmBlock')} />
            <Button label="Cancel" variant="text" onPress={close} />
          </>
        )}

        {step === 'confirmBlock' && (
          <>
            <Text style={typography.subtitle}>{`Block ${name}?`}</Text>
            <Text style={typography.bodyMuted}>
              {`You and ${name} will no longer see each other anywhere on HabeshaMatch, and your conversation will be hidden. ${name} is not told. You can unblock later in Profile, Blocked people.`}
            </Text>
            {error && <Text style={[typography.caption, styles.error]}>{error}</Text>}
            <Button label={`Block ${name}`} onPress={confirmBlock} loading={busy} />
            <Button label="Cancel" variant="text" onPress={close} />
          </>
        )}

        {step === 'report' && (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <Text style={typography.subtitle}>{`Report ${name}`}</Text>
            <Text style={typography.bodyMuted}>What is the problem? Reports are private.</Text>
            <Chips
              options={REPORT_CATEGORIES}
              selected={category ? [category] : []}
              onToggle={(v) => setCategory(v)}
              label="Reason for report"
            />
            <TextField
              value={details}
              onChangeText={setDetails}
              placeholder="Add details (optional)"
              multiline
              maxLength={REPORT_DETAILS_MAX}
              textAlignVertical="top"
              style={styles.details}
              accessibilityLabel="Report details"
            />
            <ToggleRow label={`Also block ${name}`} value={alsoBlock} onChange={setAlsoBlock} />
            {error && <Text style={[typography.caption, styles.error]}>{error}</Text>}
            <Button label="Send report" onPress={submitReport} loading={busy} disabled={!category} />
            <Button label="Back" variant="text" onPress={() => setStep('menu')} />
          </ScrollView>
        )}

        {step === 'done' && (
          <>
            <Text style={typography.subtitle}>Thanks for telling us</Text>
            <Text style={typography.bodyMuted}>
              {`Our team reviews every report.${blocked ? ` You won't see ${name} again.` : ''}`}
            </Text>
            <Button label="Done" onPress={close} />
          </>
        )}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  details: {
    minHeight: 90,
    paddingTop: spacing.sm,
  },
  error: {
    color: colors.rose,
  },
});
