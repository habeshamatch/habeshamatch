import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { fetchMyLimits } from '@/lib/chats';
import { friendlyError } from '@/lib/errors';
import { pushStatus, registerForPush, type PushStatus } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing, typography } from '@/lib/theme';

type Setting = 'notify_messages' | 'notify_matches' | 'notify_picks';
type Settings = Record<Setting, boolean>;

const ROWS: { key: Setting; label: string; detail: string; premium?: boolean }[] = [
  { key: 'notify_messages', label: 'New messages', detail: 'When someone writes to you' },
  { key: 'notify_matches', label: 'New matches', detail: 'When someone you liked likes you back' },
  { key: 'notify_picks', label: "Today's picks", detail: 'Once a day, around 9 am', premium: true },
];

async function fetchSettings(userId: string): Promise<Settings> {
  const { data, error } = await supabase
    .from('profiles')
    .select('notify_messages, notify_matches, notify_picks')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// Profile > Notifications: which notifications to get. The phone's own permission comes first;
// the switches decide what the database sends (it checks them before every notification).
export default function NotificationSettings() {
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['notify-settings', userId], queryFn: () => fetchSettings(userId), enabled: !!userId });
  const limits = useQuery({ queryKey: ['my-limits'], queryFn: fetchMyLimits });
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Checked again on return from the phone's Settings app.
  useFocusEffect(
    useCallback(() => {
      pushStatus().then(setStatus);
    }, []),
  );

  const toggle = async (key: Setting, value: boolean) => {
    setError(null);
    const queryKey = ['notify-settings', userId];
    queryClient.setQueryData<Settings>(queryKey, (s) => (s ? { ...s, [key]: value } : s));
    const change: Partial<Settings> = { [key]: value };
    const { error: e } = await supabase.from('profiles').update(change).eq('id', userId);
    if (e) {
      setError(friendlyError(e));
      queryClient.invalidateQueries({ queryKey });
    }
  };

  const turnOn = async () => {
    setError(null);
    try {
      setStatus(await registerForPush(true));
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  const isPremium = limits.data?.tier === 'premium';

  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12} style={styles.back}>
        <Text style={[typography.button, { color: colors.accent }]}>Back</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.title}>Notifications</Text>

        {status === 'denied' && (
          <View style={styles.notice}>
            <Text style={typography.body}>Notifications are turned off for this app on your phone.</Text>
            <Button label="Open phone settings" variant="secondary" onPress={() => Linking.openSettings()} />
          </View>
        )}
        {status === 'undetermined' && (
          <View style={styles.notice}>
            <Text style={typography.body}>Get notified about messages, matches and your daily picks.</Text>
            <Button label="Turn on notifications" onPress={turnOn} />
          </View>
        )}
        {status === 'unavailable' && (
          <Text style={typography.bodyMuted}>Notifications only work on a real phone.</Text>
        )}

        <View style={styles.card}>
          {ROWS.map((r, i) => (
            <View key={r.key} style={[styles.row, i > 0 && styles.divider]}>
              <View style={styles.flex}>
                <Text style={typography.body}>{r.label}</Text>
                <Text style={typography.caption}>
                  {r.premium && !isPremium ? `${r.detail}. Premium.` : r.detail}
                </Text>
              </View>
              <Switch
                value={settings.data?.[r.key] ?? true}
                onValueChange={(v) => toggle(r.key, v)}
                disabled={!settings.data}
                trackColor={{ true: colors.accent, false: colors.surfaceRaised }}
                accessibilityLabel={r.label}
              />
            </View>
          ))}
        </View>
        {error && <Text style={[typography.caption, styles.error]}>{error}</Text>}
      </ScrollView>
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
    padding: spacing.lg,
    gap: spacing.md,
  },
  notice: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceRaised,
  },
  flex: {
    flex: 1,
  },
  error: {
    color: colors.rose,
  },
});
