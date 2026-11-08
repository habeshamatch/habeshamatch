import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/lib/theme';

const DIAMONDS = [6, 8, 11, 8, 6];

// A gold line with a row of diamonds, after the tibeb borders embroidered on a habesha kemis.
export function TibebDivider() {
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.line} />
      <View style={styles.diamonds}>
        {DIAMONDS.map((size, i) => (
          <View key={i} style={[styles.diamond, { width: size, height: size }]} />
        ))}
      </View>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: colors.borderGold,
  },
  diamonds: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  diamond: {
    backgroundColor: colors.goldIcon,
    transform: [{ rotate: '45deg' }],
  },
});
