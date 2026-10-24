import Ionicons from '@expo/vector-icons/Ionicons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ProfileTile } from '@/components/ProfileTile';
import { Segmented } from '@/components/Segmented';
import { fetchMyLimits } from '@/lib/chats';
import { countMyMustHaves, DISCOVER_PAGE_SIZE, fetchMeetsMyCriteria } from '@/lib/discover';
import { friendlyError } from '@/lib/errors';
import { fetchSuggested } from '@/lib/premium';
import { useSession } from '@/lib/session';
import { colors, spacing, typography } from '@/lib/theme';

const COLUMNS = 2;
const GAP = spacing.md;

type Section = 'criteria' | 'suggested';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'criteria', label: 'Meets my criteria' },
  { value: 'suggested', label: 'Suggested' },
];

const SUGGESTED_EXPLAINER =
  "These people are looking for someone like you, but don't match all your must-haves.";

// Meets My Criteria: people who pass both sides' must-haves, best nice-to-have matches first.
// Suggested (Premium): you meet their must-haves, they don't meet all of yours.
export default function Discover() {
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const { width } = useWindowDimensions();
  const tileWidth = Math.floor((width - spacing.lg * 2 - GAP) / COLUMNS);
  const [section, setSection] = useState<Section>('criteria');

  const limits = useQuery({ queryKey: ['my-limits'], queryFn: fetchMyLimits });
  const isPremium = limits.data?.tier === 'premium';
  const showTeaser = section === 'suggested' && !!limits.data && !isPremium;

  const query = useInfiniteQuery({
    queryKey: [section === 'criteria' ? 'meets-my-criteria' : 'suggested', userId],
    queryFn: ({ pageParam }) => (section === 'criteria' ? fetchMeetsMyCriteria(pageParam) : fetchSuggested(pageParam)),
    initialPageParam: 0,
    // A full page means there may be more; ask for the next one from the next offset.
    getNextPageParam: (last, pages) => (last.length === DISCOVER_PAGE_SIZE ? pages.length * DISCOVER_PAGE_SIZE : undefined),
    // Suggested is Premium only: everyone else sees what it is and the paywall instead.
    enabled: !!userId && (section === 'criteria' || isPremium),
  });
  const cards = query.data?.pages.flat() ?? [];

  const mustHaves = useQuery({
    queryKey: ['must-have-count', userId],
    queryFn: () => countMyMustHaves(userId),
    enabled: !!userId && section === 'criteria' && query.isSuccess && cards.length === 0,
  });

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  }, [query]);

  const header = (
    <View style={styles.header}>
      <Text style={typography.title}>Discover</Text>
      <Segmented options={SECTIONS} value={section} onChange={setSection} />
      <Text style={typography.bodyMuted}>
        {section === 'criteria' ? 'People who meet your criteria, best matches first.' : SUGGESTED_EXPLAINER}
      </Text>
    </View>
  );

  if (showTeaser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.list}>{header}</View>
        <View style={styles.empty}>
          <Ionicons name="sparkles-outline" size={48} color={colors.accent} />
          <Text style={[typography.subtitle, styles.center]}>Suggested is a Premium feature</Text>
          <Text style={[typography.bodyMuted, styles.center]}>
            {"See people who would welcome a message from you, even if they miss one of your must-haves. You decide whether to make an exception."}
          </Text>
          <Button label="See Premium" onPress={() => router.push('/paywall')} />
        </View>
      </SafeAreaView>
    );
  }

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
          section === 'suggested' ? (
            <View style={styles.empty}>
              <Text style={[typography.subtitle, styles.center]}>No suggestions right now</Text>
              <Text style={[typography.bodyMuted, styles.center]}>
                Everyone who is looking for someone like you also meets your must-haves, so they are all under Meets my
                criteria. New members join every day.
              </Text>
            </View>
          ) : (
          <View style={styles.empty}>
            <Text style={[typography.subtitle, styles.center]}>No one here yet</Text>
            <Text style={[typography.bodyMuted, styles.center]}>
              {mustHaves.data
                ? `Nobody currently meets all ${mustHaves.data} of your must-haves. Turning some of them into nice-to-haves will show you more people, ranked by how well they match.`
                : 'Nobody new meets your criteria right now. New members join every day, so check back soon, or widen your age range or preferences.'}
            </Text>
            <Button label="Edit preferences" variant="secondary" onPress={() => router.push('/preferences')} />
          </View>
          )
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
