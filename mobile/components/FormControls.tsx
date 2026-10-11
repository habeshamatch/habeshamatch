import type { ReactNode } from 'react';
import { StyleSheet, Switch, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, typography } from '@/lib/theme';

// Small building blocks shared by the onboarding wizard.

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <View style={styles.labelWrap}>
      <Text style={[typography.body, styles.label]}>{children}</Text>
      {hint && <Text style={typography.caption}>{hint}</Text>}
    </View>
  );
}

export function TextField(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.textMuted} {...props} style={[styles.input, props.style]} />;
}

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.flex}>
        <Text style={typography.body}>{label}</Text>
        {hint && <Text style={typography.caption}>{hint}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceRaised, true: colors.accent }}
        thumbColor={colors.text}
        accessibilityLabel={label}
      />
    </View>
  );
}

export function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View
      style={styles.progress}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step + 1} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: step + 1 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.segment, i <= step && styles.segmentOn]} />
      ))}
    </View>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'error'; children: ReactNode }) {
  const border = tone === 'error' ? colors.rose : tone === 'warning' ? colors.accentSoft : colors.surfaceRaised;
  return (
    <View style={[styles.notice, { borderColor: border }]} accessibilityLiveRegion="polite">
      {typeof children === 'string' ? <Text style={typography.caption}>{children}</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  labelWrap: {
    gap: 2,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: typography.button.fontFamily,
  },
  input: {
    ...typography.body,
    fontSize: 17,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  progress: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceRaised,
  },
  segmentOn: {
    backgroundColor: colors.accent,
  },
  notice: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.surface,
    marginTop: spacing.md,
  },
});
