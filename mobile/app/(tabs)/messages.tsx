import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { fetchMyLimits } from '@/lib/chats';
import { friendlyError } from '@/lib/errors';
import { fetchLikesCount } from '@/lib/likes';
import { fetchInbox, shortTime, type InboxItem } from '@/lib/messages';
import { colors, radius, spacing, typography } from '@/lib/theme';

// Conversations, newest activity first. Kept live by the subscription in the tabs layout.
export default function Messages() {
  const inbox = useQuery({ queryKey: ['inbox'], queryFn: fetchInbox });
  const likes = useQuery({ queryKey: ['likes-count'], queryFn: fetchLikesCount });
  const limits = useQuery({ queryKey: ['my-limits'], queryFn: fetchMyLimits });

  // Refresh when the tab comes back into view (e.g. someone started a chat with you or liked you).
  useFocusEffect(
    useCallback(() => {
      inbox.refetch();
      likes.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only on focus
    }, []),
  );

  // New matches: chats where nobody has written yet. They sit in the row at the top and move
  // into the list below once the first message is sent.
  const newMatches = inbox.data?.filter((c) => !c.lastMessage) ?? [];
  const conversations = inbox.data?.filter((c) => !!c.lastMessage) ?? [];
  const likeCount = likes.data ?? 0;
  const isPremium = limits.data?.tier === 'premium';

  const title = <Text style={[typography.title, styles.title]}>Messages</Text>;
  const header = (
    <View>
      {title}
      {(newMatches.length > 0 || likeCount > 0) && (
        <View style={styles.matches}>
          <Text style={[typography.caption, styles.sectionTitle]}>NEW MATCHES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchRow}>
            {likeCount > 0 && (
              <LikedYouTile
                count={likeCount}
                onPress={() => router.push(isPremium ? '/liked-you' : '/paywall')}
              />
            )}
            {newMatches.map((m) => (
              <Pressable
                key={m.conversationId}
                onPress={() => router.push(`/chat/${m.conversationId}`)}
                style={styles.matchItem}
                accessibilityRole="button"
                accessibilityLabel={`New match: ${m.otherName}. Say hello`}
              >
                <View style={styles.matchRing}>
                  <Avatar
                    url={m.otherPhotoUrl}
                    cacheKey={m.otherPhotoPath ? `thumb:${m.otherPhotoPath}` : undefined}
                    name={m.otherName}
                    size={64}
                  />
                </View>
                <Text style={[typography.caption, styles.matchName]} numberOfLines={1}>
                  {m.otherName}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {conversations.length > 0 && <Text style={[typography.caption, styles.sectionTitle]}>CONVERSATIONS</Text>}
    </View>
  );

  if (inbox.isPending) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {title}
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      </SafeAreaView>
    );
  }
  if (inbox.isError && !inbox.data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {title}
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
        data={conversations}
        keyExtractor={(c) => c.conversationId}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <Row item={item} />}
        refreshControl={
          <RefreshControl
            refreshing={inbox.isRefetching}
            onRefresh={() => {
              inbox.refetch();
              likes.refetch();
            }}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          newMatches.length > 0 ? (
            <Text style={[typography.bodyMuted, styles.hint]}>Say hello to your new matches above.</Text>
          ) : (
          <View style={styles.empty}>
            <Text style={[typography.subtitle, styles.center]}>No conversations yet</Text>
            <Text style={[typography.bodyMuted, styles.center]}>
              When you message someone, or someone messages you, it will show up here.
            </Text>
            <Button label="Find people on Discover" variant="secondary" onPress={() => router.navigate('/discover')} />
          </View>
          )
        }
      />
    </SafeAreaView>
  );
}

// Teaser for people who liked you. Silhouettes, never blurred photos (blur can be undone).
function LikedYouTile({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.matchItem}
      accessibilityRole="button"
      accessibilityLabel={`${count} ${count === 1 ? 'person likes' : 'people like'} you. See who`}
    >
      <View style={[styles.matchRing, styles.likesRing]}>
        <View style={styles.likesCircle}>
          <Ionicons name="people" size={30} color={colors.textMuted} />
        </View>
        <View style={styles.likesBadge}>
          <Text style={styles.likesBadgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      </View>
      <Text style={[typography.caption, styles.matchName, { color: colors.accent }]} numberOfLines={1}>
        {count === 1 ? '1 like' : `${count} likes`}
      </Text>
    </Pressable>
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
  sectionTitle: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    letterSpacing: 1,
  },
  matches: {
    marginBottom: spacing.md,
  },
  matchRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  matchItem: {
    width: 72,
    alignItems: 'center',
    gap: spacing.xs,
  },
  matchRing: {
    padding: 2,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  matchName: {
    color: colors.text,
  },
  likesRing: {
    borderStyle: 'dashed',
  },
  likesCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  likesBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.rose,
  },
  likesBadgeText: {
    ...typography.caption,
    color: colors.text,
    fontFamily: typography.button.fontFamily,
  },
  hint: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
