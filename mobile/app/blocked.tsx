import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { friendlyError } from '@/lib/errors';
import { fetchBlocked, PEOPLE_QUERY_KEYS, unblockUser, type BlockedUser } from '@/lib/safety';
import { useSession } from '@/lib/session';
import { colors, spacing, typography } from '@/lib/theme';

// People you have blocked, with Unblock. Only first names: their profiles stay hidden while blocked.
export default function BlockedScreen() {
  const { session } = useSession();
  const myId = session?.user.id ?? '';
  const queryClient = useQueryClient();
  const blocked = useQuery({ queryKey: ['blocked'], queryFn: fetchBlocked });
  const [confirm, setConfirm] = useState<BlockedUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unblock = async (person: BlockedUser) => {
    setBusy(true);
    setError(null);
    try {
      await unblockUser(myId, person.userId);
      await Promise.all(PEOPLE_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      setConfirm(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12} style={styles.back}>
        <Text style={[typography.button, { color: colors.accent }]}>Back</Text>
      </Pressable>
      <Text style={[typography.title, styles.title]}>Blocked people</Text>

      {blocked.isPending ? (
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      ) : blocked.isError ? (
        <View style={styles.empty}>
          <Text style={[typography.body, styles.center]}>{friendlyError(blocked.error)}</Text>
          <Button label="Try again" variant="secondary" onPress={() => blocked.refetch()} />
        </View>
      ) : (
        <FlatList
          data={blocked.data}
          keyExtractor={(b) => b.userId}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[typography.bodyMuted, styles.center]}>You have not blocked anyone.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Avatar url={null} name={item.name} size={44} />
              <View style={styles.flex}>
                <Text style={typography.body}>{item.name}</Text>
                <Text style={typography.caption}>
                  Blocked {new Date(item.blockedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Button label="Unblock" variant="secondary" onPress={() => setConfirm(item)} />
            </View>
          )}
        />
      )}

      <Sheet visible={!!confirm} onClose={() => setConfirm(null)}>
        {confirm && (
          <>
            <Text style={typography.subtitle}>{`Unblock ${confirm.name}?`}</Text>
            <Text style={typography.bodyMuted}>
              {`You may see each other again on HabeshaMatch, and any earlier conversation comes back. ${confirm.name} is not told.`}
            </Text>
            {error && <Text style={[typography.caption, styles.error]}>{error}</Text>}
            <Button label="Unblock" onPress={() => unblock(confirm)} loading={busy} />
            <Button label="Cancel" variant="text" onPress={() => setConfirm(null)} />
          </>
        )}
      </Sheet>
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
  title: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  center: {
    textAlign: 'center',
  },
  error: {
    color: colors.rose,
  },
});
