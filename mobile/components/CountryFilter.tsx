import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MultiSelectSheet } from '@/components/MultiSelectSheet';
import { COUNTRY_NAMES } from '@/lib/countryNames';
import { colors, radius, spacing, typography } from '@/lib/theme';

export type CountryCount = { code: string; people: number };

// Narrow a list of people to the countries they live in (Discover, Suggested). Only the
// countries actually in the list are offered, with how many people, so a choice is never empty.
// It never changes the member's preferences. Hidden when there is nothing to narrow.
export function CountryFilterButton({
  available,
  selected,
  onChange,
}: {
  available: CountryCount[] | undefined;
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const sections = useMemo(
    () => [
      {
        title: 'Where they live',
        items: (available ?? []).map((c) => ({
          value: c.code,
          label: `${COUNTRY_NAMES[c.code] ?? c.code} (${c.people})`,
        })),
      },
    ],
    [available],
  );
  if ((available?.length ?? 0) < 2 && selected.length === 0) return null;
  const on = selected.length > 0;
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.button, on && styles.buttonOn]}
        accessibilityRole="button"
        accessibilityLabel={on ? `Filter, ${selected.length} countries chosen` : 'Filter by country'}
        hitSlop={8}
      >
        <Ionicons name="options-outline" size={18} color={on ? colors.background : colors.accent} />
        <Text style={[typography.caption, styles.text, on && styles.textOn]}>
          {on ? `Filter · ${selected.length}` : 'Filter'}
        </Text>
      </Pressable>
      <MultiSelectSheet
        visible={open}
        title="Filter by country"
        searchPlaceholder="Search countries"
        sections={sections}
        selected={selected}
        onChange={onChange}
        onClose={() => setOpen(false)}
        max={Math.max(sections[0].items.length, 1)}
      />
    </>
  );
}

// "Showing people in Canada, Ethiopia." with Clear, shown while a filter is on.
export function CountryFilterSummary({ selected, onClear }: { selected: string[]; onClear: () => void }) {
  if (selected.length === 0) return null;
  return (
    <View style={styles.summary}>
      <Text style={[typography.bodyMuted, styles.flex]} numberOfLines={2}>
        {`Showing people in ${selected.map((c) => COUNTRY_NAMES[c] ?? c).join(', ')}.`}
      </Text>
      <Pressable onPress={onClear} accessibilityRole="button" hitSlop={8}>
        <Text style={[typography.caption, styles.clear]}>Clear</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  buttonOn: {
    backgroundColor: colors.accent,
  },
  text: {
    color: colors.accent,
  },
  textOn: {
    color: colors.background,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  clear: {
    color: colors.accent,
  },
});
