import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { signOut } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { spacing, typography } from '@/lib/theme';

// Placeholder after the profile is created. Prompt 1.3 replaces this with photo upload.
export default function PhotosPlaceholder() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={typography.title}>Your profile is saved</Text>
        <Text style={typography.bodyMuted}>Next you will add your photos. That step is coming soon.</Text>
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
