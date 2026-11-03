import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_NAME } from '@/lib/brand';
import { colors, fonts, radius, spacing } from '@/lib/theme';

// The top of the main tabs: a gold coin with the app's initial, the screen title in navy serif
// capitals, an optional control on the right, and a thin gold line underneath.
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.band, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.left} accessibilityRole="header" accessibilityLabel={`${APP_NAME}, ${title}`}>
        <View style={styles.coin}>
          <Text style={styles.coinText}>{APP_NAME.slice(0, 1)}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {title.toUpperCase()}
        </Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGold,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexShrink: 1,
  },
  coin: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: colors.goldIcon,
  },
  coinText: {
    fontFamily: fonts.heading,
    fontSize: 20,
    lineHeight: 24,
    color: colors.text,
  },
  title: {
    flexShrink: 1,
    fontFamily: fonts.heading,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: 1,
    color: colors.text,
  },
});
