import Ionicons from '@expo/vector-icons/Ionicons';
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ProfileTile } from '@/components/ProfileTile';
import { Segmented } from '@/components/Segmented';
import { fetchMyLimits } from '@/lib/chats';
import { DISCOVER_PAGE_SIZE, type ProfileCard } from '@/lib/discover';
import { friendlyError } from '@/lib/errors';
import { loadForYouSeen, saveForYouSeen } from '@/lib/forYou';
import { fetchLikesCount, fetchLikesReceived } from '@/lib/likes';
import {
  dismissSuggestion,
  fetchDailyPicks,
  fetchSuggested,
  fetchSuggestedCount,
  undoDismissSuggestion,
} from '@/lib/premium';
import { useSession } from '@/lib/session';
import { colors, radius, spacing, typography } from '@/lib/theme';

const COLUMNS = 2;
const GAP = spacing.md;

type Section = 'likes' | 'picks' | 'suggested';

const INTRO: Record<Section, string> = {
  likes: 'They already like you. Like them back to match.',
  picks: 'A few people chosen for you every day: you fit each other, and you have not talked yet.',
  suggested: "These people are looking for someone like you, but don't match all your must-haves.",
};

const UNDO_SECONDS = 5;

// Everyone who might want you, in one place: who liked you, today's picks, and Suggested.
// All three lists are Premium. Everyone sees the counts (a number never says who), and a short
// explanation with the paywall instead of the people.
export default function ForYou() {
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const { width } = useWindowDimensions();
  const tileWidth = Math.floor((width - spacing.lg * 2 - GAP) / COLUMNS);
  const [section, setSection] = useState<Section>('likes');
  const queryClient = useQueryClient();

  const limits = useQuery({ queryKey: ['my-limits'], queryFn: fetchMyLimits });
  const isPremium = limits.data?.tier === 'premium';
  const likesCount = useQuery({ queryKey: ['likes-count'], queryFn: fetchLikesCount });
  // Total in Suggested (shown in the intro and on the paywall teaser) ...
  const suggestedCount = useQuery({
    queryKey: ['suggested-count', userId],
    queryFn: () => fetchSuggestedCount(),
    enabled: !!userId,
  });
  // ... and only the people new to it since the Suggested section was last opened (its badge).
  const seen = useQuery({ queryKey: ['for-you-seen', userId], queryFn: () => loadForYouSeen(userId), enabled: !!userId });
  const suggestedNew = useQuery({
    queryKey: ['suggested-new', userId, seen.data?.suggestedAt],
    queryFn: () => fetchSuggestedCount(seen.data?.suggestedAt),
    enabled: !!userId && !!seen.data,
  });

  const likes = useQuery({
    queryKey: ['likes-received', 'thumb'],
    queryFn: () => fetchLikesReceived('thumb'),
    enabled: isPremium,
  });
  const picks = useQuery({ queryKey: ['daily-picks'], queryFn: fetchDailyPicks, enabled: isPremium });
  const suggested = useInfiniteQuery({
    queryKey: ['suggested', userId],
    queryFn: ({ pageParam }) => fetchSuggested(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length === DISCOVER_PAGE_SIZE ? pages.length * DISCOVER_PAGE_SIZE : undefined),
    enabled: !!userId && isPremium && section === 'suggested',
  });

  // Opening the tab clears its badge; opening Suggested also clears Suggested's own badge.
  const markSeen = useCallback(
    (suggestedToo: boolean) => {
      if (!userId) return;
      saveForYouSeen(userId, suggestedToo).then((s) => {
        queryClient.setQueryData(['for-you-seen', userId], s);
        queryClient.setQueryData(['for-you-badge', userId, s.at, s.picksDate], 0);
        if (suggestedToo) queryClient.setQueryData(['suggested-new', userId, s.suggestedAt], 0);
      });
    },
    [userId, queryClient],
  );
  const chooseSection = (next: Section) => {
    setSection(next);
    if (next === 'suggested') markSeen(true);
  };

  // Back on the tab: someone may have liked you, or you may have started a chat with a pick.
  useFocusEffect(
    useCallback(() => {
      markSeen(section === 'suggested');
      likesCount.refetch();
      suggestedCount.refetch();
      if (isPremium) {
        likes.refetch();
        picks.refetch();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only on focus
    }, [isPremium, userId]),
  );

  // "Not for me": one tap removes someone from Suggested, with a few seconds to undo.
  const [removed, setRemoved] = useState<ProfileCard | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);
  const refreshSuggestedCounts = () => {
    queryClient.invalidateQueries({ queryKey: ['suggested-count'] });
    queryClient.invalidateQueries({ queryKey: ['suggested-new'] });
    queryClient.invalidateQueries({ queryKey: ['for-you-badge'] });
  };
  const dismiss = (card: ProfileCard) => {
    queryClient.setQueryData<InfiniteData<ProfileCard[]>>(['suggested', userId], (d) =>
      d ? { ...d, pages: d.pages.map((page) => page.filter((c) => c.id !== card.id)) } : d,
    );
    setRemoved(card);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setRemoved(null), UNDO_SECONDS * 1000);
    dismissSuggestion(card.id)
      .catch(() => queryClient.invalidateQueries({ queryKey: ['suggested'] })) // put them back if it failed
      .finally(refreshSuggestedCounts);
  };
  const undo = async () => {
    const card = removed;
    if (!card) return;
    setRemoved(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    try {
      await undoDismissSuggestion(card.id);
    } finally {
      queryClient.invalidateQueries({ queryKey: ['suggested'] });
      refreshSuggestedCounts();
    }
  };

  const refresh = () => {
    likesCount.refetch();
    suggestedCount.refetch();
    if (!isPremium) return;
    if (section === 'likes') likes.refetch();
    if (section === 'picks') picks.refetch();
    if (section === 'suggested') suggested.refetch();
  };

  const sections: { value: Section; label: string; badge?: number }[] = [
    { value: 'likes', label: 'Liked you', badge: likesCount.data },
    { value: 'picks', label: 'Picks', badge: isPremium ? picks.data?.length : undefined },
    { value: 'suggested', label: 'Suggested', badge: suggestedNew.data },
  ];
  const total = suggestedCount.data ?? 0;
  const intro =
    section === 'suggested' && isPremium && total > 0
      ? `${total > 99 ? '99+' : total} ${total === 1 ? 'person is' : 'people are'} looking for someone like you, but ${total === 1 ? "doesn't" : "don't"} match all your must-haves.`
      : INTRO[section];

  const header = (
    <View style={styles.header}>
      <Text style={typography.title}>For you</Text>
      <Segmented options={sections} value={section} onChange={chooseSection} />
      <Text style={typography.bodyMuted}>{intro}</Text>
      {isPremium && section === 'likes' && (likes.data?.length ?? 0) > 0 && (
        <Button label="Like back" onPress={() => router.push('/liked-you')} />
      )}
    </View>
  );

  if (limits.isPending) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.padded}>{header}</View>
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      </SafeAreaView>
    );
  }

  if (!isPremium) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.padded}>{header}</View>
        <Teaser section={section} likes={likesCount.data ?? 0} suggested={suggestedCount.data ?? 0} />
      </SafeAreaView>
    );
  }

  const current =
    section === 'likes'
      ? { data: likes.data, pending: likes.isPending, error: likes.error, refreshing: likes.isRefetching }
      : section === 'picks'
        ? { data: picks.data, pending: picks.isPending, error: picks.error, refreshing: picks.isRefetching }
        : {
            data: suggested.data?.pages.flat(),
            pending: suggested.isPending,
            error: suggested.error,
            refreshing: suggested.isRefetching && !suggested.isFetchingNextPage,
          };
  const cards: ProfileCard[] = current.data ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        // Remount per section so each list starts at the top.
        key={section}
        data={cards}
        keyExtractor={(c) => c.id}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.padded}
        ListHeaderComponent={header}
        renderItem={({ item }) =>
          section === 'suggested' ? (
            <ProfileTile
              card={item}
              width={tileWidth}
              onPress={() => router.push({ pathname: '/profile/[id]', params: { id: item.id, from: 'suggested' } })}
              onDismiss={() => dismiss(item)}
            />
          ) : (
            <ProfileTile card={item} width={tileWidth} onPress={() => router.push(`/profile/${item.id}`)} />
          )
        }
        onEndReached={() => {
          if (section === 'suggested' && suggested.hasNextPage && !suggested.isFetchingNextPage) suggested.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={current.refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        ListFooterComponent={
          section === 'suggested' && suggested.isFetchingNextPage ? (
            <ActivityIndicator color={colors.accent} style={styles.footer} />
          ) : undefined
        }
        ListEmptyComponent={
          current.pending ? (
            <ActivityIndicator color={colors.accent} style={styles.loading} />
          ) : current.error ? (
            <View style={styles.empty}>
              <Text style={[typography.body, styles.center]}>{friendlyError(current.error)}</Text>
              <Button label="Try again" variant="secondary" onPress={refresh} />
            </View>
          ) : (
            <Empty section={section} />
          )
        }
        initialNumToRender={6}
        windowSize={7}
      />
      {removed && (
        <View style={styles.undoBar} accessibilityLiveRegion="polite">
          <Text style={[typography.body, styles.flex]} numberOfLines={1}>
            {`${removed.name} removed from Suggested`}
          </Text>
          <Pressable onPress={undo} accessibilityRole="button" hitSlop={10}>
            <Text style={[typography.button, styles.undoText]}>Undo</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function Empty({ section }: { section: Section }) {
  const text: Record<Section, [string, string]> = {
    likes: ["No new likes yet", 'When someone likes you on Swipe, they will show up here.'],
    picks: ['No picks today', 'Nobody new fits you both ways right now. New members join every day.'],
    suggested: [
      'No suggestions right now',
      'Everyone who is looking for someone like you also meets your must-haves, so they are all on Discover.',
    ],
  };
  return (
    <View style={styles.empty}>
      <Text style={[typography.subtitle, styles.center]}>{text[section][0]}</Text>
      <Text style={[typography.bodyMuted, styles.center]}>{text[section][1]}</Text>
    </View>
  );
}

// Not Premium: what the section is, with the real number where there is one, and the paywall.
function Teaser({ section, likes, suggested }: { section: Section; likes: number; suggested: number }) {
  const n = (count: number) => (count > 99 ? '99+' : String(count));
  const content: Record<Section, { icon: ComponentProps<typeof Ionicons>['name']; title: string; body: string }> = {
    likes: {
      icon: 'people',
      title: likes > 0 ? `${n(likes)} ${likes === 1 ? 'person likes' : 'people like'} you` : 'See who likes you',
      body: 'With Premium you can see everyone who liked you and like them back to match straight away.',
    },
    picks: {
      icon: 'today-outline',
      title: 'Picks chosen for you every day',
      body: 'Premium members get a few people a day who fit them both ways and they have not talked to yet.',
    },
    suggested: {
      icon: 'sparkles-outline',
      title:
        suggested > 0
          ? `${n(suggested)} ${suggested === 1 ? 'person is' : 'people are'} looking for someone like you`
          : 'People looking for someone like you',
      body: 'See people who would welcome a message from you, even if they miss one of your must-haves. You decide whether to make an exception.',
    },
  };
  const c = content[section];
  return (
    <View style={styles.empty}>
      <Ionicons name={c.icon} size={48} color={colors.accent} />
      <Text style={[typography.subtitle, styles.center]}>{c.title}</Text>
      <Text style={[typography.bodyMuted, styles.center]}>{c.body}</Text>
      <Button label="See Premium" onPress={() => router.push('/paywall')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  footer: {
    marginVertical: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  center: {
    textAlign: 'center',
  },
  flex: {
    flex: 1,
  },
  undoBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
  },
  undoText: {
    color: colors.accent,
  },
});
