import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { MatchModal, type Match } from '@/components/MatchModal';
import { RoundButton } from '@/components/RoundButton';
import { SwipeCard, type SwipeCardHandle, type SwipeDirection } from '@/components/SwipeCard';
import { nextLimitReset } from '@/lib/chats';
import type { ProfileCard } from '@/lib/discover';
import { errorCode, friendlyError, isPremiumRequired } from '@/lib/errors';
import { fetchLikesReceived } from '@/lib/likes';
import { recordSwipe } from '@/lib/swipe';
import { colors, spacing, typography } from '@/lib/theme';

// Premium: people who liked you and you have not swiped on yet, as a card stack.
// Swiping right always makes a match (they already liked you). Swipes count toward the daily limit.
export default function LikedYou() {
  const queryClient = useQueryClient();
  const topCard = useRef<SwipeCardHandle>(null);
  const likes = useQuery({ queryKey: ['likes-received'], queryFn: () => fetchLikesReceived('full') });
  const [swipedIds, setSwipedIds] = useState<string[]>([]);
  const [match, setMatch] = useState<Match | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const cards: ProfileCard[] = (likes.data ?? []).filter((c) => !swipedIds.includes(c.id));

  const onSwiped = async (direction: SwipeDirection) => {
    const card = cards[0];
    if (!card) return;
    setSwipedIds((ids) => [...ids, card.id]);
    setNotice(null);
    try {
      const result = await recordSwipe(card.id, direction);
      if (result.matched && result.conversationId) {
        setMatch({ name: card.name, photoUrl: card.photoUrl, conversationId: result.conversationId });
      }
    } catch (e) {
      if (errorCode(e) === 'daily_swipe_limit_reached') {
        setSwipedIds((ids) => ids.filter((id) => id !== card.id)); // not recorded: keep them for later
        setLimitReached(true);
      } else if (errorCode(e) !== 'not_permitted') {
        setNotice(friendlyError(e));
      }
    } finally {
      for (const queryKey of [['likes-count'], ['inbox'], ['my-limits']]) queryClient.invalidateQueries({ queryKey });
    }
  };

  const back = (
    <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12} style={styles.back}>
      <Text style={[typography.button, { color: colors.accent }]}>Back</Text>
    </Pressable>
  );

  let body;
  if (likes.isPending) {
    body = <ActivityIndicator color={colors.accent} style={styles.loading} />;
  } else if (likes.isError) {
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
  } else if (limitReached) {
    const resetTime = nextLimitReset().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    body = (
      <View style={styles.message}>
        <Text style={[typography.subtitle, styles.center]}>{"That's all your swipes for today"}</Text>
        <Text style={[typography.bodyMuted, styles.center]}>
          {`Come back after ${resetTime}. They will still be here.`}
        </Text>
      </View>
    );
  } else if (cards.length === 0) {
    body = (
      <View style={styles.message}>
        <Text style={[typography.subtitle, styles.center]}>{"You're all caught up"}</Text>
        <Text style={[typography.bodyMuted, styles.center]}>New likes will show up here.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  } else {
    body = (
      <>
        <View style={styles.deck}>
          {cards
            .slice(0, 2)
            .reverse()
            .map((card, i, shown) => {
              const isTop = i === shown.length - 1;
              return (
                <View key={card.id} style={[StyleSheet.absoluteFill, !isTop && styles.behind]}>
                  <SwipeCard
                    ref={isTop ? topCard : undefined}
                    card={card}
                    active={isTop}
                    onSwiped={onSwiped}
                    onOpenProfile={() => router.push(`/profile/${card.id}`)}
                  />
                </View>
              );
            })}
        </View>
        <View style={styles.buttons}>
          <RoundButton icon="close" color={colors.rose} label="Pass" onPress={() => topCard.current?.swipe('pass')} />
          <RoundButton icon="heart" color={colors.accent} label="Like back" onPress={() => topCard.current?.swipe('like')} />
        </View>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {back}
      <View style={styles.header}>
        <Text style={typography.title}>Liked you</Text>
        {cards.length > 0 && !limitReached && (
          <Text style={typography.caption}>{`${cards.length} ${cards.length === 1 ? 'person' : 'people'}`}</Text>
        )}
      </View>
      {cards.length > 0 && !limitReached && (
        <Text style={[typography.bodyMuted, styles.sub]}>They already like you. Swipe right to match.</Text>
      )}
      {notice && <Text style={[typography.caption, styles.notice]}>{notice}</Text>}
      {body}
      <MatchModal match={match} onClose={() => setMatch(null)} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  sub: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  notice: {
    color: colors.rose,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  deck: {
    flex: 1,
    marginHorizontal: spacing.lg,
  },
  behind: {
    transform: [{ scale: 0.95 }, { translateY: 10 }],
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl,
    paddingVertical: spacing.lg,
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  center: {
    textAlign: 'center',
  },
});
