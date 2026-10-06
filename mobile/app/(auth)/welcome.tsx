import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { checkSupabaseConnection } from '@/lib/supabase';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function Welcome() {
  // Dev-only check that the app can reach Supabase. Not shown in production builds.
  const [connected, setConnected] = useState<boolean | null>(null);
  useEffect(() => {
    if (__DEV__) checkSupabaseConnection().then(setConnected);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <View style={styles.markInner} />
        </View>
        <Text style={[typography.display, styles.center]}>HabeshaMatch</Text>
        <View style={styles.divider} />
        <Text style={[typography.bodyMuted, styles.center]}>
          Meet Eritrean and Ethiopian singles who are ready for something real.
        </Text>
      </View>

      <View style={styles.actions}>
        {/* Phone sign-in is wired up in Prompt 1.1. */}
        <Button label="Get started" />
        <Button label="I already have an account" variant="secondary" />
        <Text style={[typography.caption, styles.center]}>18+ only. Built for serious relationships.</Text>
        {__DEV__ && (
          <Text style={[typography.caption, styles.center]}>
            Supabase: {connected === null ? 'checking...' : connected ? 'connected' : 'not reachable'}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  markInner: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.rose,
  },
  divider: {
    width: 48,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accentSoft,
  },
  center: {
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
  },
});
