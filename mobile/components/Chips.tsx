import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Option } from '@/lib/profileOptions';
import { colors, radius, spacing, typography } from '@/lib/theme';

type Props<T extends string> = {
  options: Option<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  multiple?: boolean;
  label: string; // for screen readers
};

// Pill-shaped choices. Single select by default; multiple for things like languages.
export function Chips<T extends string>({ options, selected, onToggle, multiple = false, label }: Props<T>) {
  return (
    <View style={styles.wrap} accessibilityRole={multiple ? undefined : 'radiogroup'} accessibilityLabel={label}>
      {options.map((o) => {
        const isOn = selected.includes(o.value);
        return (
          <Pressable
            key={o.value}
            onPress={() => onToggle(o.value)}
            style={({ pressed }) => [styles.chip, isOn && styles.chipOn, pressed && styles.pressed]}
            accessibilityRole={multiple ? 'checkbox' : 'radio'}
            accessibilityState={multiple ? { checked: isOn } : { selected: isOn }}
          >
            <Text style={[typography.body, isOn && styles.textOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceRaised,
  },
  chipOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  textOn: {
    color: colors.background,
    fontFamily: typography.button.fontFamily,
  },
  pressed: {
    opacity: 0.85,
  },
});
