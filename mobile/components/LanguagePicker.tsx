import { useMemo, useState } from 'react';
import { Modal, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { LANGUAGE_GROUPS, MAX_LANGUAGES } from '@/lib/languages';
import { colors, radius, spacing, typography } from '@/lib/theme';

type Props = {
  visible: boolean;
  selected: string[];
  onChange: (codes: string[]) => void;
  onClose: () => void;
};

// Searchable multi-select of every language, grouped by region.
export function LanguagePicker({ visible, selected, onChange, onClose }: Props) {
  const [query, setQuery] = useState('');
  const atMax = selected.length >= MAX_LANGUAGES;

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LANGUAGE_GROUPS.map((g) => ({
      title: g.title,
      data: q ? g.languages.filter((l) => l.name.toLowerCase().includes(q)) : g.languages,
    })).filter((s) => s.data.length > 0);
  }, [query]);

  const toggle = (code: string) => {
    if (selected.includes(code)) onChange(selected.filter((c) => c !== code));
    else if (!atMax) onChange([...selected, code]);
  };

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={typography.subtitle}>Languages you speak</Text>
          <Text style={typography.caption}>
            {selected.length} of {MAX_LANGUAGES} chosen
          </Text>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search languages"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        <SectionList
          sections={sections}
          keyExtractor={(l) => l.code}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={[typography.caption, styles.sectionTitle]}>{section.title.toUpperCase()}</Text>
          )}
          renderItem={({ item }) => {
            const isOn = selected.includes(item.code);
            const disabled = !isOn && atMax;
            return (
              <Pressable
                onPress={() => toggle(item.code)}
                disabled={disabled}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed, disabled && styles.disabled]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isOn, disabled }}
              >
                <Text style={[typography.body, styles.name]}>{item.name}</Text>
                <View style={[styles.check, isOn && styles.checkOn]}>
                  {isOn && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={[typography.bodyMuted, styles.empty]}>No matching language</Text>}
        />
        <View style={styles.footer}>
          {atMax && (
            <Text style={[typography.caption, styles.center]}>
              You can choose up to {MAX_LANGUAGES}. Remove one to add another.
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
