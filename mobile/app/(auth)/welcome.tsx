import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TibebBand } from '@/components/TibebBand';
import { APP_NAME } from '@/lib/brand';
import { colors, fonts, radius, spacing, typography } from '@/lib/theme';

export default function Welcome() {
  return (
    <SafeAreaView style={styles.container}>
      <TibebBand />
      <View style={styles.hero}>
        <View style={styles.coin}>
          <Text style={styles.coinText}>{APP_NAME.slice(0, 1)}</Text>
        </View>
        <Text style={[typography.display, styles.center]}>{APP_NAME}</Text>
        <Text style={[typography.bodyMuted, styles.center]}>
          Meet Eritrean and Ethiopian singles who are ready for something real.
        </Text>
      </View>

      <View style={styles.actions}>
        {/* Email sign in creates the account on first use, so both buttons start the same flow. */}
        <Button label="Get started" onPress={() => router.push('/email')} />
        <Button label="I already have an account" variant="secondary" onPress={() => router.push('/email')} />
        <Text style={[typography.caption, styles.center]}>18+ only. Built for serious relationships.</Text>
        <TibebBand />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  coin: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    borderWidth: 3,
    borderColor: colors.goldIcon,
    marginBottom: spacing.sm,
  },
  coinText: {
    fontFamily: fonts.heading,
    fontSize: 44,
    lineHeight: 52,
    color: colors.text,
  },
  center: {
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
  },
});
