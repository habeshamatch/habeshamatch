import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/lib/theme';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
};

// A value with − and + buttons. Used for age and height ranges.
export function Stepper({ label, value, min, max, step = 1, format = String, onChange }: Props) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  return (
    <View style={styles.wrap} accessibilityRole="adjustable" accessibilityLabel={`${label}: ${format(value)}`}>
      <Text style={typography.caption}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          onPress={dec}
          disabled={value <= min}
          style={[styles.button, value <= min && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          hitSlop={6}
        >
          <Text style={styles.sign}>−</Text>
        </Pressable>
        <Text style={[typography.subtitle, styles.value]}>{format(value)}</Text>
        <Pressable
          onPress={inc}
          disabled={value >= max}
          style={[styles.button, value >= max && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          hitSlop={6}
        >
          <Text style={styles.sign}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  disabled: {
    opacity: 0.4,
  },
  sign: {
    ...typography.subtitle,
    color: colors.accent,
  },
  value: {
    minWidth: 64,
    textAlign: 'center',
  },
});
