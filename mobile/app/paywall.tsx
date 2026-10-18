import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { colors, spacing, typography } from '@/lib/theme';

// Placeholder. Prompt 4.1 builds the real paywall with RevenueCat (prices come from the stores).
// Benefits mirror CLAUDE.md; amounts are not repeated here because limits live in app_config.
const BENEFITS: { icon: ComponentProps<typeof Ionicons>['name']; text: string }[] = [
  { icon: 'chatbubbles-outline', text: 'Start new conversations without the free daily limit' },
  { icon: 'heart-outline', text: 'See everyone who liked you' },
  { icon: 'sparkles-outline', text: 'Suggested: people looking for someone like you' },
  { icon: 'today-outline', text: 'Daily picks chosen for you' },
  { icon: 'albums-outline', text: 'More swipes every day' },
  { icon: 'arrow-undo-outline', text: 'Undo your last swipe' },
];

export default function Paywall() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.display}>Premium</Text>
        <Text style={typography.bodyMuted}>Meet more people, faster.</Text>
        <View style={styles.list}>
          {BENEFITS.map((b) => (
            <View key={b.text} style={styles.row}>
              <Ionicons name={b.icon} size={22} color={colors.accent} />
              <Text style={[typography.body, styles.flex]}>{b.text}</Text>
            </View>
          ))}
        </View>
        <Text style={[typography.caption, styles.note]}>
          Premium is coming soon. Your blue tick stays free, and nobody can see who pays.
        </Text>
      </ScrollView>
      <View style={styles.footer}>
        <Button label="Close" variant="secondary" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  note: {
    marginTop: spacing.lg,
  },
  footer: {
    padding: spacing.lg,
  },
});
