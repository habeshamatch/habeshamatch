import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { signOut } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { formatForDisplay } from '@/lib/phone';
import { useSession } from '@/lib/session';
import { spacing, typography } from '@/lib/theme';

// Placeholder after sign in. Prompt 1.2 replaces this with the profile wizard.
export default function OnboardingStart() {
  const { session } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phone = session?.user.phone ? formatForDisplay(`+${session.user.phone}`) : '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={typography.title}>{"You're signed in"}</Text>
        <Text style={typography.bodyMuted}>Signed in as {phone}. Setting up your profile comes next.</Text>
        {error && <Text style={typography.caption}>{error}</Text>}
      </View>
      <Button
        label="Sign out"
        variant="secondary"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await signOut();
          } catch (e) {
            setError(friendlyError(e));
            setBusy(false);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
});
