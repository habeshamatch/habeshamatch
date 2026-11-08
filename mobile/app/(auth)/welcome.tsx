import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { APP_NAME } from '@/lib/brand';
import { colors, spacing, typography } from '@/lib/theme';

// The brand artwork (two kabas under an arch, with the name) fills the screen; its lower part is
// plain velvet, where the buttons sit.
const ARTWORK = require('@/assets/brand/welcome-source.jpeg');

export default function Welcome() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Image
        source={ARTWORK}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top"
        accessibilityLabel={`${APP_NAME}: two embroidered kabas under a gold arch`}
      />
      <SafeAreaView style={styles.content} edges={['bottom']}>
        <Text style={[typography.body, styles.tagline]}>
          Meet Eritrean and Ethiopian singles who are ready for something real.
        </Text>
        {/* Email sign in creates the account on first use, so both buttons start the same flow. */}
        <Button label="Get started" variant="gold" onPress={() => router.push('/email')} />
        <Button label="I already have an account" variant="secondary" onPress={() => router.push('/email')} />
        <Text style={[typography.caption, styles.small]}>18+ only. Built for serious relationships.</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brand,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  tagline: {
    color: colors.onPhoto,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  small: {
    color: colors.onBrandMuted,
    textAlign: 'center',
  },
});
