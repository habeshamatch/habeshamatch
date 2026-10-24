import Ionicons from '@expo/vector-icons/Ionicons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { MultiSelectSheet } from '@/components/MultiSelectSheet';
import { COUNTRY_NAMES } from '@/lib/countryNames';
import { countMyMustHaves, DISCOVER_PAGE_SIZE, fetchDiscoverCountries, fetchMeetsMyCriteria } from '@/lib/discover';
import { friendlyError } from '@/lib/errors';
import { useSession } from '@/lib/session';
import { colors, radius, spacing, typography } from '@/lib/theme';

const COLUMNS = 2;
const GAP = spacing.md;

// Meets My Criteria: people who pass both sides' must-haves. Nobody is hidden for being away a
// while; they just come later in the list. The country filter narrows the list for now without
// changing the member's preferences (it resets when the app restarts).
export default function Discover() {
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const { width } = useWindowDimensions();
  const tileWidth = Math.floor((width - spacing.lg * 2 - GAP) / COLUMNS);
  const [countries, setCountries] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const countryKey = [...countries].sort().join(',');

  const query = useInfiniteQuery({
    queryKey: ['meets-my-criteria', userId, countryKey],
    queryFn: ({ pageParam }) => fetchMeetsMyCriteria(pageParam, countries),
    initialPageParam: 0,
    // A full page means there may be more; ask for the next one from the next offset.
    getNextPageParam: (last, pages) => (last.length === DISCOVER_PAGE_SIZE ? pages.length * DISCOVER_PAGE_SIZE : undefined),
    enabled: !!userId,
    // Changing the filter keeps the current list on screen until the new one arrives.
    placeholderData: (previous) => previous,
  });
  const cards = query.data?.pages.flat() ?? [];

  // The countries on offer are the ones your matches actually live in, with how many.
  const available = useQuery({
    queryKey: ['meets-my-criteria', 'countries', userId],
    queryFn: fetchDiscoverCountries,
    enabled: !!userId,
  });
  const filterSections = useMemo(
    () => [
      {
        title: 'Where they live',
        items: (available.data ?? []).map((c) => ({
          value: c.code,
          label: `${COUNTRY_NAMES[c.code] ?? c.code} (${c.people})`,
        })),
      },
    ],
    [available.data],
  );
  const filterLabel = countries.map((c) => COUNTRY_NAMES[c] ?? c).join(', ');

  const mustHaves = useQuery({
    queryKey: ['must-have-count', userId],
    queryFn: () => countMyMustHaves(userId),
    enabled: !!userId && query.isSuccess && cards.length === 0 && countries.length === 0,
  });

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  }, [query]);

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={typography.title}>Discover</Text>
        {(available.data?.length ?? 0) > 1 || countries.length > 0 ? (
          <Pressable
            onPress={() => setFilterOpen(true)}
            style={[styles.filterButton, countries.length > 0 && styles.filterOn]}
            accessibilityRole="button"
            accessibilityLabel={countries.length ? `Filter, ${countries.length} countries chosen` : 'Filter by country'}
            hitSlop={8}
          >
            <Ionicons name="options-outline" size={18} color={countries.length ? colors.background : colors.accent} />
            <Text style={[typography.caption, styles.filterText, countries.length > 0 && styles.filterTextOn]}>
              {countries.length ? `Filter · ${countries.length}` : 'Filter'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {countries.length > 0 ? (
        <View style={styles.filterRow}>
          <Text style={[typography.bodyMuted, styles.flex]} numberOfLines={2}>
            {`Showing people in ${filterLabel}.`}
          </Text>
          <Pressable onPress={() => setCountries([])} accessibilityRole="button" hitSlop={8}>
            <Text style={[typography.caption, styles.clear]}>Clear</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={typography.bodyMuted}>People who meet your criteria, best matches first.</Text>
      )}
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
        key={countryKey} // a new filter starts at the top
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
              available.refetch();
            }}
            tintColor={colors.accent}
          />
        }
        ListFooterComponent={
          query.isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={styles.footer} /> : undefined
        }
        ListEmptyComponent={
          countries.length > 0 ? (
            <View style={styles.empty}>
              <Text style={[typography.subtitle, styles.center]}>Nobody new in those countries</Text>
              <Text style={[typography.bodyMuted, styles.center]}>Try other countries, or clear the filter.</Text>
              <Button label="Clear filter" variant="secondary" onPress={() => setCountries([])} />
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
      <MultiSelectSheet
        visible={filterOpen}
        title="Filter by country"
        searchPlaceholder="Search countries"
        sections={filterSections}
        selected={countries}
        onChange={setCountries}
        onClose={() => setFilterOpen(false)}
        max={Math.max(filterSections[0].items.length, 1)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  filterOn: {
    backgroundColor: colors.accent,
  },
  filterText: {
    color: colors.accent,
  },
  filterTextOn: {
    color: colors.background,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  clear: {
    color: colors.accent,
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
