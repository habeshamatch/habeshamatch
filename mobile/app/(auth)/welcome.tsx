import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function Welcome() {
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
        {/* Email sign in creates the account on first use, so both buttons start the same flow. */}
        <Button label="Get started" onPress={() => router.push('/email')} />
        <Button label="I already have an account" variant="secondary" onPress={() => router.push('/email')} />
        <Text style={[typography.caption, styles.center]}>18+ only. Built for serious relationships.</Text>
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
