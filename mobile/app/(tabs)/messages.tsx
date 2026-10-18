import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { friendlyError } from '@/lib/errors';
import { fetchInbox, shortTime, type InboxItem } from '@/lib/messages';
import { colors, radius, spacing, typography } from '@/lib/theme';

// Conversations, newest activity first. Kept live by the subscription in the tabs layout.
export default function Messages() {
  const inbox = useQuery({ queryKey: ['inbox'], queryFn: fetchInbox });

  // Refresh when the tab comes back into view (e.g. someone started a chat with you).
  useFocusEffect(
    useCallback(() => {
      inbox.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only on focus
    }, []),
  );

  const header = <Text style={[typography.title, styles.title]}>Messages</Text>;

  if (inbox.isPending) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      </SafeAreaView>
    );
  }
  if (inbox.isError && !inbox.data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <View style={styles.empty}>
          <Text style={[typography.body, styles.center]}>{friendlyError(inbox.error)}</Text>
          <Button label="Try again" variant="secondary" onPress={() => inbox.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={inbox.data}
        keyExtractor={(c) => c.conversationId}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <Row item={item} />}
        refreshControl={
          <RefreshControl refreshing={inbox.isRefetching} onRefresh={() => inbox.refetch()} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[typography.subtitle, styles.center]}>No conversations yet</Text>
            <Text style={[typography.bodyMuted, styles.center]}>
              When you message someone, or someone messages you, it will show up here.
            </Text>
            <Button label="Find people on Discover" variant="secondary" onPress={() => router.navigate('/discover')} />
          </View>
        }
      />
    </SafeAreaView>
  );
}

function Row({ item }: { item: InboxItem }) {
  const unread = item.unread > 0;
  return (
    <Pressable
      onPress={() => router.push(`/chat/${item.conversationId}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.otherName}${unread ? `, ${item.unread} unread` : ''}. ${item.lastMessage ?? 'No messages yet'}`}
    >
      <Avatar
        url={item.otherPhotoUrl}
        cacheKey={item.otherPhotoPath ? `thumb:${item.otherPhotoPath}` : undefined}
        name={item.otherName}
        size={52}
      />
      <View style={styles.rowText}>
        <View style={styles.rowTop}>
          <View style={styles.nameRow}>
            <Text style={[typography.body, styles.name]} numberOfLines={1}>
              {item.otherName}
            </Text>
            {item.otherVerified && <VerifiedBadge size={14} />}
          </View>
          <Text style={[typography.caption, unread && { color: colors.accent }]}>{shortTime(item.lastMessageAt)}</Text>
        </View>
        <View style={styles.rowTop}>
          <Text style={[unread ? typography.body : typography.bodyMuted, styles.preview]} numberOfLines={1}>
            {item.lastMessage ?? (item.origin === 'swipe_match' ? 'You matched! Say hello.' : 'Say hello.')}
          </Text>
          {unread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unread > 99 ? '99+' : item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  center: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  name: {
    fontFamily: typography.button.fontFamily,
    flexShrink: 1,
  },
  preview: {
    flex: 1,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  badgeText: {
    ...typography.caption,
    color: colors.background,
    fontFamily: typography.button.fontFamily,
  },
});
