import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_NAME } from '@/lib/brand';
import { colors, spacing, typography } from '@/lib/theme';

// The blue band at the top of the main tabs: the app name in small gold capitals and the screen
// title in gold, with an optional control on the right. It reaches up under the status bar.
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.band, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.titles} accessibilityRole="header" accessibilityLabel={title}>
        <Text style={typography.eyebrow}>{APP_NAME.toUpperCase()}</Text>
        <Text style={[typography.title, styles.title]}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.brand,
  },
  titles: {
    flexShrink: 1,
    gap: 2,
  },
  title: {
    color: colors.brandGold,
  },
});
