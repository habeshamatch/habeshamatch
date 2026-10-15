import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, typography } from '@/lib/theme';

// Placeholder for tabs that are built in later prompts.
export function ComingSoon({ title, message }: { title: string; message: string }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={typography.title}>{title}</Text>
        <Text style={[typography.bodyMuted, styles.center]}>{message}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  center: {
    textAlign: 'center',
  },
});
