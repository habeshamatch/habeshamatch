import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { signOut } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { spacing, typography } from '@/lib/theme';

// Placeholder after photos. Prompt 1.4 replaces this with preference setup.
export default function PreferencesPlaceholder() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={typography.title}>Your photos are added</Text>
        <Text style={typography.bodyMuted}>
          Next you will tell us who you are looking for. That step is coming soon.
        </Text>
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
