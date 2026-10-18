import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ProfileTile } from '@/components/ProfileTile';
import { friendlyError, isPremiumRequired } from '@/lib/errors';
import { fetchLikesReceived } from '@/lib/likes';
import { colors, spacing, typography } from '@/lib/theme';

const COLUMNS = 2;
const GAP = spacing.md;

// Premium: everyone who liked you and you have not swiped on yet. Like them back from their
// profile or the Swipe tab to match. (Prompt 3.2 adds swiping right here.)
export default function LikedYou() {
  const { width } = useWindowDimensions();
  const tileWidth = Math.floor((width - spacing.lg * 2 - GAP) / COLUMNS);
  const likes = useQuery({ queryKey: ['likes-received'], queryFn: fetchLikesReceived });

  const back = (
    <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12} style={styles.back}>
      <Text style={[typography.button, { color: colors.accent }]}>Back</Text>
    </Pressable>
  );

  let body;
  if (likes.isPending) body = <ActivityIndicator color={colors.accent} style={styles.loading} />;
  else if (likes.isError)
    body = (
      <View style={styles.message}>
        <Text style={[typography.body, styles.center]}>
          {isPremiumRequired(likes.error) ? 'Seeing who liked you is a Premium feature.' : friendlyError(likes.error)}
        </Text>
        {isPremiumRequired(likes.error) ? (
          <Button label="See Premium" onPress={() => router.replace('/paywall')} />
        ) : (
          <Button label="Try again" variant="secondary" onPress={() => likes.refetch()} />
        )}
      </View>
    );
  else
    body = (
      <FlatList
        data={likes.data}
        keyExtractor={(c) => c.id}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ProfileTile card={item} width={tileWidth} onPress={() => router.push(`/profile/${item.id}`)} />
        )}
        ListEmptyComponent={
          <Text style={[typography.bodyMuted, styles.center]}>No new likes right now. Check back soon.</Text>
        }
      />
    );

  return (
    <SafeAreaView style={styles.container}>
      {back}
      <Text style={[typography.title, styles.title]}>Liked you</Text>
      {body}
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
    paddingBottom: spacing.xl,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  message: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  center: {
    textAlign: 'center',
  },
});
