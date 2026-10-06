import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { colors, radius, spacing, typography } from '@/lib/theme';

type Variant = 'primary' | 'secondary';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
};

export function Button({ label, variant = 'primary', ...rest }: Props) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
      ]}
      {...rest}
    >
      <Text style={[typography.button, { color: isPrimary ? colors.background : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surfaceRaised,
  },
  pressed: {
    opacity: 0.85,
  },
});
