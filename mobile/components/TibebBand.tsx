import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { colors } from '@/lib/theme';

// A woven border like the tibeb on a habesha kemis: a thin gold line, a row of diamonds in gold
// and navy, and another thin gold line. Gold and navy only, never flag colours. Fills whatever
// width it is given. Purely decorative, so screen readers skip it.
const SIZE = 10; // diamond width before rotating
const STEP = 16; // distance between diamond centres
const PATTERN = [colors.gold, colors.accent, colors.goldIcon, colors.accent];

export function TibebBand({ style }: { style?: object }) {
  const [width, setWidth] = useState(0);
  const count = Math.max(0, Math.floor(width / STEP));
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View
      style={[styles.band, style]}
      onLayout={onLayout}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.line} />
      <View style={styles.row}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={[styles.diamond, { backgroundColor: PATTERN[i % PATTERN.length] }]} />
        ))}
      </View>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    alignSelf: 'stretch',
    gap: 5,
  },
  line: {
    height: 2,
    backgroundColor: colors.goldIcon,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    height: SIZE + 4,
    overflow: 'hidden',
  },
  diamond: {
    width: SIZE,
    height: SIZE,
    transform: [{ rotate: '45deg' }],
  },
});
