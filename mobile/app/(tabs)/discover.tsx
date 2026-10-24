import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ProfileTile } from '@/components/ProfileTile';
import { Segmented } from '@/components/Segmented';
import { countMyMustHaves, DISCOVER_PAGE_SIZE, fetchMeetsMyCriteria, type DiscoverSort } from '@/lib/discover';
import { friendlyError } from '@/lib/errors';
import { useSession } from '@/lib/session';
import { colors, spacing, typography } from '@/lib/theme';

const COLUMNS = 2;
const GAP = spacing.md;

const SORTS: { value: DiscoverSort; label: string }[] = [
  { value: 'best', label: 'Best match' },
  { value: 'active', label: 'Active today' },
  { value: 'near', label: 'Near me' },
];

const SORT_INTRO: Record<DiscoverSort, string> = {
  best: 'People who meet your criteria, best matches first.',
  active: 'People who were on HabeshaMatch today come first.',
  near: 'People in your city first, then your country, then the rest.',
};

// Meets My Criteria: people who pass both sides' must-haves. Nobody is hidden for being away a
// while; they just come later in the list.
export default function Discover() {
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const { width } = useWindowDimensions();
  const tileWidth = Math.floor((width - spacing.lg * 2 - GAP) / COLUMNS);
  const [sort, setSort] = useState<DiscoverSort>('best');

  const query = useInfiniteQuery({
    queryKey: ['meets-my-criteria', userId, sort],
    queryFn: ({ pageParam }) => fetchMeetsMyCriteria(pageParam, sort),
    initialPageParam: 0,
    // A full page means there may be more; ask for the next one from the next offset.
    getNextPageParam: (last, pages) => (last.length === DISCOVER_PAGE_SIZE ? pages.length * DISCOVER_PAGE_SIZE : undefined),
    enabled: !!userId,
    // Switching the sort keeps the current list on screen until the new order arrives.
    placeholderData: (previous) => previous,
  });
  const cards = query.data?.pages.flat() ?? [];

  const mustHaves = useQuery({
    queryKey: ['must-have-count', userId],
    queryFn: () => countMyMustHaves(userId),
    enabled: !!userId && query.isSuccess && cards.length === 0,
  });

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  }, [query]);

  const header = (
    <View style={styles.header}>
      <Text style={typography.title}>Discover</Text>
      <Segmented options={SORTS} value={sort} onChange={setSort} />
      <Text style={typography.bodyMuted}>{SORT_INTRO[sort]}</Text>
    </View>
  );

  if (query.isPending) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.list}>{header}</View>
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      </SafeAreaView>
    );
  }

  if (query.isError && cards.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.list}>{header}</View>
        <View style={styles.empty}>
          <Text style={[typography.body, styles.center]}>{friendlyError(query.error)}</Text>
          <Button label="Try again" variant="secondary" onPress={() => query.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        key={sort} // a new sort starts at the top
        data={cards}
        keyExtractor={(c) => c.id}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <ProfileTile card={item} width={tileWidth} onPress={() => router.push(`/profile/${item.id}`)} />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => {
              query.refetch();
            }}
            tintColor={colors.accent}
          />
        }
        ListFooterComponent={
          query.isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={styles.footer} /> : undefined
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[typography.subtitle, styles.center]}>No one here yet</Text>
            <Text style={[typography.bodyMuted, styles.center]}>
              {mustHaves.data
                ? `Nobody currently meets all ${mustHaves.data} of your must-haves. Turning some of them into nice-to-haves will show you more people, ranked by how well they match.`
                : 'Nobody new meets your criteria right now. New members join every day, so check back soon, or widen your age range or preferences.'}
            </Text>
            <Button label="Edit preferences" variant="secondary" onPress={() => router.push('/preferences')} />
          </View>
        }
        initialNumToRender={6}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
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
    paddingHorizontal: spacing.md,
  },
  center: {
    textAlign: 'center',
  },
});
