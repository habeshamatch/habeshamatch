import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { SafetyMenu } from '@/components/SafetyMenu';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { friendlyError } from '@/lib/errors';
import {
  fetchInbox,
  fetchMessages,
  markConversationRead,
  MESSAGE_MAX,
  MESSAGE_PAGE_SIZE,
  sendMessage,
  subscribeToMessages,
  type Message,
} from '@/lib/messages';
import { useSession } from '@/lib/session';
import { colors, radius, spacing, typography } from '@/lib/theme';

type Pending = { id: string; body: string; status: 'sending' | 'failed'; created_at: string };
type Row = (Message & { pending?: undefined }) | (Pending & { pending: true });
type Pages = InfiniteData<Message[], string | undefined>;

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const myId = session?.user.id ?? '';
  const queryClient = useQueryClient();
  const messagesKey = useMemo(() => ['messages', conversationId], [conversationId]);

  const [text, setText] = useState('');
  const [pending, setPending] = useState<Pending[]>([]);

  // Who we are talking to (from the cached inbox when possible).
  const inbox = useQuery({ queryKey: ['inbox'], queryFn: fetchInbox });
  const other = inbox.data?.find((c) => c.conversationId === conversationId);

  const messages = useInfiniteQuery({
    queryKey: messagesKey,
    queryFn: ({ pageParam }) => fetchMessages(conversationId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.length === MESSAGE_PAGE_SIZE ? last[last.length - 1].created_at : undefined),
    enabled: !!conversationId,
  });

  // Add or update one message in the cached pages (newest page first).
  const upsertMessage = useCallback(
    (m: Message) => {
      queryClient.setQueryData<Pages>(messagesKey, (data) => {
        if (!data) return data;
        const exists = data.pages.some((p) => p.some((x) => x.id === m.id));
        if (exists) {
          return { ...data, pages: data.pages.map((p) => p.map((x) => (x.id === m.id ? { ...x, ...m } : x))) };
        }
        const [first = [], ...rest] = data.pages;
        return { ...data, pages: [[m, ...first], ...rest] };
      });
      setPending((list) => list.filter((p) => p.id !== m.id));
    },
    [queryClient, messagesKey],
  );

  const markRead = useCallback(() => {
    markConversationRead(conversationId)
      .then(() => queryClient.invalidateQueries({ queryKey: ['inbox'] }))
      .catch(() => {}); // not critical; retried on the next message or visit
  }, [conversationId, queryClient]);

  // Mark as read on open, then listen for new messages and read receipts in this conversation.
  useEffect(() => {
    if (!conversationId) return;
    markRead();
    return subscribeToMessages(
      `chat:${conversationId}`,
      (change) => {
        if (change.eventType !== 'INSERT' && change.eventType !== 'UPDATE') return;
        const m = change.new;
        upsertMessage({ id: m.id, sender_id: m.sender_id, body: m.body, created_at: m.created_at, read_at: m.read_at });
        if (change.eventType === 'INSERT' && m.sender_id !== myId) markRead();
      },
      conversationId,
      // Connected (or reconnected): catch up on anything sent while the connection was starting.
      () => queryClient.invalidateQueries({ queryKey: messagesKey }),
    );
  }, [conversationId, myId, markRead, upsertMessage, queryClient, messagesKey]);

  // Back from the background: catch up and mark read.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: messagesKey });
        markRead();
      }
    });
    return () => sub.remove();
  }, [queryClient, messagesKey, markRead]);

  const send = async (id: string, body: string) => {
    setPending((list) => {
      const rest = list.filter((p) => p.id !== id);
      return [...rest, { id, body, status: 'sending', created_at: new Date().toISOString() }];
    });
    try {
      upsertMessage(await sendMessage(id, conversationId, myId, body));
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    } catch (e) {
      // 23505: it actually arrived earlier (e.g. the reply was lost on a slow connection).
      if ((e as { code?: string }).code === '23505') {
        setPending((list) => list.filter((p) => p.id !== id));
        queryClient.invalidateQueries({ queryKey: messagesKey });
        return;
      }
      setPending((list) => list.map((p) => (p.id === id ? { ...p, status: 'failed' } : p)));
    }
  };

  const onSend = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    send(randomUUID(), body);
  };

  const loaded = messages.data?.pages.flat() ?? [];

  // Safety net: the inbox subscription is long-lived, so if it knows about a newer message than
  // this screen has, fetch again.
  const newestLoaded = loaded[0]?.created_at;
  const inboxLatest = other?.lastMessageAt;
  useEffect(() => {
    if (other?.lastMessage && inboxLatest && newestLoaded && new Date(inboxLatest) > new Date(newestLoaded)) {
      queryClient.invalidateQueries({ queryKey: messagesKey });
    }
  }, [inboxLatest, newestLoaded, other?.lastMessage, queryClient, messagesKey]);
  // Inverted list: newest first. Unsent messages sit at the very bottom (newest end).
  const rows: Row[] = [
    ...[...pending].reverse().map((p) => ({ ...p, pending: true as const })),
    ...loaded.filter((m) => !pending.some((p) => p.id === m.id)),
  ];
  const lastMineReadId = loaded.find((m) => m.sender_id === myId)?.read_at
    ? loaded.find((m) => m.sender_id === myId)?.id
    : undefined;

  const header = (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
        <Text style={[typography.button, { color: colors.accent }]}>Back</Text>
      </Pressable>
      {other && (
        <Pressable
          onPress={() => router.push(`/profile/${other.otherUserId}`)}
          style={styles.who}
          accessibilityRole="button"
          accessibilityLabel={`${other.otherName}. View profile`}
        >
          <Avatar
            url={other.otherPhotoUrl}
            cacheKey={other.otherPhotoPath ? `thumb:${other.otherPhotoPath}` : undefined}
            name={other.otherName}
            size={36}
          />
          <Text style={[typography.body, styles.whoName]} numberOfLines={1}>
            {other.otherName}
          </Text>
          {other.otherVerified && <VerifiedBadge size={14} />}
        </Pressable>
      )}
      {other && <SafetyMenu userId={other.otherUserId} name={other.otherName} onBlocked={() => router.dismissAll()} />}
    </View>
  );

  if (inbox.isSuccess && !other) {
    return (
      <SafeAreaView style={styles.container}>
        {header}
        <View style={styles.center}>
          <Text style={[typography.body, styles.centerText]}>This conversation is no longer available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {header}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {messages.isPending ? (
          <ActivityIndicator color={colors.accent} style={styles.loading} />
        ) : messages.isError && loaded.length === 0 ? (
          <View style={styles.center}>
            <Text style={[typography.body, styles.centerText]}>{friendlyError(messages.error)}</Text>
            <Button label="Try again" variant="secondary" onPress={() => messages.refetch()} />
          </View>
        ) : (
          <FlatList
            inverted
            data={rows}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            onEndReached={() => {
              if (messages.hasNextPage && !messages.isFetchingNextPage) messages.fetchNextPage();
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              messages.isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={styles.older} /> : undefined
            }
            ListEmptyComponent={
              <Text style={[typography.bodyMuted, styles.emptyText]}>
                {other ? `Say hello to ${other.otherName}.` : 'Say hello.'}
              </Text>
            }
            renderItem={({ item }) => (
              <Bubble
                row={item}
                mine={item.pending ? true : item.sender_id === myId}
                seen={!item.pending && item.id === lastMineReadId}
                onRetry={() => item.pending && send(item.id, item.body)}
              />
            )}
          />
        )}

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={MESSAGE_MAX}
            style={styles.input}
            accessibilityLabel="Message"
          />
          <Button label="Send" onPress={onSend} disabled={!text.trim()} />
        </View>
        {text.length > MESSAGE_MAX - 200 && (
          <Text style={[typography.caption, styles.counter]}>
            {text.length} / {MESSAGE_MAX}
          </Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ row, mine, seen, onRetry }: { row: Row; mine: boolean; seen: boolean; onRetry: () => void }) {
  const failed = row.pending && row.status === 'failed';
  const time = new Date(row.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return (
    <View style={[styles.bubbleWrap, mine ? styles.right : styles.left]}>
      <Pressable
        onPress={failed ? onRetry : undefined}
        disabled={!failed}
        style={[styles.bubble, mine ? styles.mine : styles.theirs, failed && styles.failed]}
        accessibilityLabel={failed ? 'Not sent. Tap to try again' : undefined}
      >
        <Text style={[typography.body, mine && styles.mineText]}>{row.body}</Text>
      </Pressable>
      <Text style={[typography.caption, styles.meta]}>
        {row.pending ? (row.status === 'sending' ? 'Sending...' : 'Not sent. Tap to try again') : seen ? `${time} · Seen` : time}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceRaised,
  },
  who: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  whoName: {
    fontFamily: typography.button.fontFamily,
    flexShrink: 1,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  centerText: {
    textAlign: 'center',
  },
  list: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  older: {
    marginVertical: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: spacing.xl,
    transform: [{ scaleY: -1 }], // the list is inverted
  },
  bubbleWrap: {
    maxWidth: '80%',
    marginVertical: 2,
  },
  left: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  right: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  mine: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: radius.sm,
  },
  theirs: {
    backgroundColor: colors.surfaceRaised,
    borderBottomLeftRadius: radius.sm,
  },
  mineText: {
    color: colors.background,
  },
  failed: {
    opacity: 0.6,
    borderWidth: 1,
    borderColor: colors.rose,
  },
  meta: {
    fontSize: 11,
    marginTop: 2,
    marginHorizontal: spacing.xs,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceRaised,
  },
  input: {
    ...typography.body,
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  counter: {
    textAlign: 'right',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
});
