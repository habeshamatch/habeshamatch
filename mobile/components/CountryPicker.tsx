import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { otherCountries, pinnedCountries, type Country } from '@/lib/phone';
import { colors, radius, spacing, typography } from '@/lib/theme';

type Props = {
  visible: boolean;
  selected: Country;
  onSelect: (country: Country) => void;
  onClose: () => void;
  title?: string;
  showDialCode?: boolean; // false when picking a country of residence rather than a phone prefix
};

export function CountryPicker({
  visible,
  selected,
  onSelect,
  onClose,
  title = 'Choose your country',
  showDialCode = true,
}: Props) {
  const [query, setQuery] = useState('');

  const data = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, '');
    if (!q) return [...pinnedCountries, ...otherCountries];
    return [...pinnedCountries, ...otherCountries].filter(
      (c) =>
        c.name.toLowerCase().includes(q) || (showDialCode && c.dialCode.startsWith(q)) || c.code.toLowerCase() === q,
    );
  }, [query, showDialCode]);

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={typography.subtitle}>{title}</Text>
          <Pressable onPress={close} accessibilityRole="button" hitSlop={12}>
            <Text style={[typography.button, { color: colors.accent }]}>Close</Text>
          </Pressable>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={showDialCode ? 'Search country or code' : 'Search country'}
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        <FlatList
          data={data}
          keyExtractor={(c) => c.code}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => {
                onSelect(item);
                close();
              }}
              style={({ pressed }) => [
                styles.row,
                !query && index === pinnedCountries.length - 1 && styles.pinnedDivider,
                pressed && styles.rowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={showDialCode ? `${item.name}, plus ${item.dialCode}` : item.name}
            >
              <Text style={styles.flag}>{item.flag}</Text>
              <Text style={[typography.body, styles.name]} numberOfLines={1}>
                {item.name}
              </Text>
              {showDialCode ? (
                <Text style={[typography.bodyMuted, item.code === selected.code && styles.selected]}>
                  +{item.dialCode}
                </Text>
              ) : (
                item.code === selected.code && <Text style={[typography.body, styles.selected]}>✓</Text>
              )}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={[typography.bodyMuted, styles.empty]}>No matching country</Text>}
        />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  pinnedDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceRaised,
  },
  flag: {
    fontSize: 22,
  },
  name: {
    flex: 1,
  },
  selected: {
    color: colors.accent,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
