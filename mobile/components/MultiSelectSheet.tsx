import { useMemo, useState } from 'react';
import { Modal, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { colors, radius, spacing, typography } from '@/lib/theme';

export type SelectItem = { value: string; label: string };
export type SelectSection = { title: string; items: SelectItem[] };

type Props = {
  visible: boolean;
  title: string;
  searchPlaceholder: string;
  sections: SelectSection[];
  selected: string[];
  onChange: (values: string[]) => void;
  onClose: () => void;
  max: number;
};

// Full-screen searchable multi-select with sections (languages, countries).
export function MultiSelectSheet({
  visible,
  title,
  searchPlaceholder,
  sections,
  selected,
  onChange,
  onClose,
  max,
}: Props) {
  const [query, setQuery] = useState('');
  const atMax = selected.length >= max;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sections
      .map((s) => ({ title: s.title, data: q ? s.items.filter((i) => i.label.toLowerCase().includes(q)) : s.items }))
      .filter((s) => s.data.length > 0);
  }, [query, sections]);

  const toggle = (value: string) => {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else if (!atMax) onChange([...selected, value]);
  };

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={typography.subtitle}>{title}</Text>
          <Text style={typography.caption}>
            {selected.length} of {max} chosen
          </Text>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        <SectionList
          sections={filtered}
          keyExtractor={(i, index) => `${i.value}-${index}`}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          initialNumToRender={25}
          renderSectionHeader={({ section }) =>
            section.title ? (
              <Text style={[typography.caption, styles.sectionTitle]}>{section.title.toUpperCase()}</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const isOn = selected.includes(item.value);
            const disabled = !isOn && atMax;
            return (
              <Pressable
                onPress={() => toggle(item.value)}
                disabled={disabled}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed, disabled && styles.disabled]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isOn, disabled }}
              >
                <Text style={[typography.body, styles.name]}>{item.label}</Text>
                <View style={[styles.check, isOn && styles.checkOn]}>
                  {isOn && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={[typography.bodyMuted, styles.empty]}>No matches</Text>}
        />
        <View style={styles.footer}>
          {atMax && (
            <Text style={[typography.caption, styles.center]}>
              You can choose up to {max}. Remove one to add another.
            </Text>
          )}
          <Button label="Done" onPress={close} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  search: {
    ...typography.body,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  disabled: {
    opacity: 0.4,
  },
  name: {
    flex: 1,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkMark: {
    color: colors.background,
    fontFamily: typography.button.fontFamily,
    fontSize: 14,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
});
