import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { colors, spacing, typography } from '@/lib/theme';

// Placeholder. Prompt 2.3 builds messaging (Realtime, sending, read receipts) here.
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const convo = useQuery({
    queryKey: ['conversation-summary', id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_conversations');
      if (error) throw error;
      return data.find((c) => c.conversation_id === id) ?? null;
    },
    enabled: !!id,
  });

  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12} style={styles.back}>
        <Text style={[typography.button, { color: colors.accent }]}>Back</Text>
      </Pressable>
      <View style={styles.content}>
        <Text style={typography.title}>{convo.data?.other_name ?? 'Your conversation'}</Text>
        <Text style={[typography.bodyMuted, styles.center]}>
          Your chat is ready. Messaging is coming in the next update.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  back: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
