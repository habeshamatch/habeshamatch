import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { signOut } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { spacing, typography } from '@/lib/theme';

// Prompt 5.3 adds full settings (edit profile, blocked users, notifications, delete account).
export default function ProfileTab() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={typography.title}>Profile</Text>
      <View style={styles.actions}>
        <Button label="Edit preferences" variant="secondary" onPress={() => router.push('/preferences')} />
        <Button label="Edit photos" variant="secondary" onPress={() => router.push('/photos')} />
        <Button label="Blocked people" variant="secondary" onPress={() => router.push('/blocked')} />
      </View>
      <View style={styles.bottom}>
        {error && <Text style={typography.caption}>{error}</Text>}
        <Button
          label="Sign out"
          variant="text"
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  actions: {
    gap: spacing.md,
  },
  bottom: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
