import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { TextField } from '@/components/FormControls';
import { Sheet } from '@/components/Sheet';
import { deleteMyAccount, fetchMyProfile, signOutEverywhere } from '@/lib/account';
import { signOut } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { LINKS } from '@/lib/links';
import { fetchMyPhotos } from '@/lib/photos';
import { useSession } from '@/lib/session';
import { colors, radius, spacing, typography } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const CONFIRM_WORD = 'DELETE';

// Settings: edit profile, photos, preferences, blocked people, notifications, policies,
// log out, log out everywhere, and delete account (confirmed twice).
export default function ProfileTab() {
  const { session } = useSession();
  const myId = session?.user.id ?? '';
  const me = useQuery({ queryKey: ['my-profile', myId], queryFn: () => fetchMyProfile(myId), enabled: !!myId });
  const photos = useQuery({ queryKey: ['my-photos', myId], queryFn: () => fetchMyPhotos(myId), enabled: !!myId });

  const [busy, setBusy] = useState<'logout' | 'everywhere' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const run = async (kind: 'logout' | 'everywhere', action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action(); // signing out sends the app back to the welcome screen
    } catch (e) {
      setError(friendlyError(e));
      setBusy(null);
    }
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteStep(0);
    setConfirmText('');
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMyAccount(myId); // then the app returns to the welcome screen
    } catch (e) {
      setDeleteError(friendlyError(e));
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.me}>
          <Avatar
            url={photos.data?.[0]?.url ?? null}
            cacheKey={photos.data?.[0] ? `thumb:${photos.data[0].storagePath}` : undefined}
            name={me.data?.display_name ?? ''}
            size={72}
          />
          <View style={styles.flex}>
            <Text style={typography.title}>{me.data?.display_name ?? ' '}</Text>
            <Text style={typography.caption}>{session?.user.email}</Text>
          </View>
        </View>

        <Section title="Your profile">
          <Row icon="person-outline" label="Edit profile" onPress={() => router.push('/edit-profile')} />
          <Row icon="images-outline" label="Edit photos" onPress={() => router.push('/photos')} />
          <Row icon="options-outline" label="Edit preferences" onPress={() => router.push('/preferences')} />
        </Section>

        <Section title="Safety and privacy">
          <Row icon="hand-left-outline" label="Blocked people" onPress={() => router.push('/blocked')} />
          <Row icon="notifications-outline" label="Notifications" detail="Coming soon" />
          <Row icon="shield-checkmark-outline" label="Privacy policy" onPress={() => Linking.openURL(LINKS.privacy)} />
          <Row icon="document-text-outline" label="Terms of service" onPress={() => Linking.openURL(LINKS.terms)} />
          <Row icon="mail-outline" label="Contact support" onPress={() => Linking.openURL(LINKS.support)} />
        </Section>

        <Section title="Account">
          <Row
            icon="log-out-outline"
            label={busy === 'logout' ? 'Logging out...' : 'Log out'}
            onPress={() => run('logout', signOut)}
          />
          <Row
            icon="phone-portrait-outline"
            label={busy === 'everywhere' ? 'Logging out...' : 'Log out of all devices'}
            onPress={() => run('everywhere', signOutEverywhere)}
          />
          <Row icon="trash-outline" label="Delete account" danger onPress={() => setDeleteStep(1)} />
        </Section>
        {error && <Text style={[typography.caption, styles.error]}>{error}</Text>}
      </ScrollView>

      <Sheet visible={deleteStep > 0} onClose={closeDelete}>
        {deleteStep === 1 && (
          <>
            <Text style={typography.subtitle}>Delete your account?</Text>
            <Text style={typography.bodyMuted}>
              This permanently deletes your profile, photos, preferences, matches and conversations. People you talked
              to will no longer see your messages. This cannot be undone.
            </Text>
            <Button label="Continue" onPress={() => setDeleteStep(2)} />
            <Button label="Keep my account" variant="text" onPress={closeDelete} />
          </>
        )}
        {deleteStep === 2 && (
          <>
            <Text style={typography.subtitle}>Are you sure?</Text>
            <Text style={typography.bodyMuted}>{`Type ${CONFIRM_WORD} to permanently delete your account.`}</Text>
            <TextField
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={CONFIRM_WORD}
              accessibilityLabel={`Type ${CONFIRM_WORD} to confirm`}
            />
            {deleteError && <Text style={[typography.caption, styles.error]}>{deleteError}</Text>}
            <Pressable
              onPress={confirmDelete}
              disabled={confirmText.trim().toUpperCase() !== CONFIRM_WORD || deleting}
              style={({ pressed }) => [
                styles.deleteButton,
                (confirmText.trim().toUpperCase() !== CONFIRM_WORD || deleting) && styles.disabled,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Delete my account permanently"
            >
              <Text style={[typography.button, { color: colors.text }]}>
                {deleting ? 'Deleting...' : 'Delete my account'}
              </Text>
            </Pressable>
            <Button label="Cancel" variant="text" onPress={closeDelete} disabled={deleting} />
          </>
        )}
      </Sheet>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[typography.caption, styles.sectionTitle]}>{title.toUpperCase()}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  detail,
  danger,
  onPress,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  const color = danger ? colors.rose : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
    >
      <Ionicons name={icon} size={22} color={danger ? colors.rose : colors.accent} />
      <Text style={[typography.body, styles.flex, { color }]}>{label}</Text>
      {detail ? (
        <Text style={typography.caption}>{detail}</Text>
      ) : (
        onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  me: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    letterSpacing: 1,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceRaised,
  },
  rowPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  error: {
    color: colors.rose,
    textAlign: 'center',
  },
  deleteButton: {
    minHeight: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.rose,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
});
