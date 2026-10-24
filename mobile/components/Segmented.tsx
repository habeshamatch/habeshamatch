import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/lib/theme';

type Option<T extends string> = { value: T; label: string; badge?: number };

// Two or three side-by-side choices, one selected (e.g. Discover's sections). An option can
// carry a count badge, like an unread count.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.option, selected && styles.selected]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={o.badge ? `${o.label}, ${o.badge}` : o.label}
          >
            <View style={styles.content}>
              <Text style={[typography.caption, styles.label, selected && styles.labelSelected]}>{o.label}</Text>
              {!!o.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{o.badge > 99 ? '99+' : o.badge}</Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  selected: {
    backgroundColor: colors.surfaceRaised,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.rose,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
    fontFamily: typography.button.fontFamily,
  },
  labelSelected: {
    color: colors.accent,
  },
});
