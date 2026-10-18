import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { SwipeCard, type SwipeCardHandle, type SwipeDirection } from '@/components/SwipeCard';
import { fetchMyLimits, nextLimitReset } from '@/lib/chats';
import { errorCode, friendlyError } from '@/lib/errors';
import { fetchMyPhotos } from '@/lib/photos';
import { useSession } from '@/lib/session';
import { fetchSwipeDeck, recordSwipe, type SwipeCard as Card } from '@/lib/swipe';
import { colors, radius, spacing, typography } from '@/lib/theme';

const REFILL_AT = 5; // fetch more cards when this few are left

type Match = { card: Card; conversationId: string };

export default function Swipe() {
  const { session } = useSession();
  const myId = session?.user.id ?? '';
  const queryClient = useQueryClient();
  const topCard = useRef<SwipeCardHandle>(null);

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false); // the server has no more cards right now
  const [limitReached, setLimitReached] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const swiped = useRef(new Set<string>()); // never show a card twice in this session
  const fetching = useRef(false);

  const limits = useQuery({ queryKey: ['my-limits'], queryFn: fetchMyLimits });
  const myPhotos = useQuery({ queryKey: ['my-photos', myId], queryFn: () => fetchMyPhotos(myId), enabled: !!match });

  const refill = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const fresh = await fetchSwipeDeck();
      setCards((current) => {
        const seen = new Set([...current.map((c) => c.id), ...swiped.current]);
        const added = fresh.filter((c) => !seen.has(c.id));
        setExhausted(added.length === 0);
        return [...current, ...added];
      });
      setLoadError(null);
    } catch (e) {
      setLoadError(friendlyError(e));
    } finally {
      fetching.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refill();
  }, [refill]);

  useEffect(() => {
    if (!loading && !exhausted && cards.length < REFILL_AT) refill();
  }, [cards.length, loading, exhausted, refill]);

  const used = limits.data?.swipesUsed ?? 0;
  const allowed = limits.data?.swipesLimit ?? 0;
  const outOfSwipes = limitReached || (!!limits.data && used >= allowed);

  const onSwiped = async (direction: SwipeDirection) => {
    const card = cards[0];
    if (!card) return;
    swiped.current.add(card.id);
    setCards((current) => current.slice(1)); // move on immediately; the server call follows
    setNotice(null);
    queryClient.setQueryData(['my-limits'], (l: typeof limits.data) => (l ? { ...l, swipesUsed: l.swipesUsed + 1 } : l));
    try {
      const result = await recordSwipe(card.id, direction);
      if (result.matched && result.conversationId) {
        setMatch({ card, conversationId: result.conversationId });
        queryClient.invalidateQueries({ queryKey: ['inbox'] });
      }
    } catch (e) {
      if (errorCode(e) === 'daily_swipe_limit_reached') {
        // Not recorded: give the card back for another day.
        swiped.current.delete(card.id);
        setCards((current) => [card, ...current]);
        setLimitReached(true);
      } else if (errorCode(e) !== 'not_permitted') {
        setNotice(friendlyError(e));
      }
    } finally {
      queryClient.invalidateQueries({ queryKey: ['my-limits'] });
      queryClient.invalidateQueries({ queryKey: ['likes-count'] }); // swiping on someone removes them from Liked you
    }
  };

  const resetTime = nextLimitReset().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const isFree = limits.data?.tier === 'free';

  let body: React.ReactNode;
  if (loading || limits.isPending) {
    body = <ActivityIndicator color={colors.accent} style={styles.loading} />;
  } else if (outOfSwipes) {
    body = (
      <View style={styles.message}>
        <Ionicons name="moon-outline" size={48} color={colors.accent} />
        <Text style={[typography.subtitle, styles.center]}>{"That's all your swipes for today"}</Text>
        <Text style={[typography.bodyMuted, styles.center]}>
          {`Come back after ${resetTime} for ${allowed} more. Discover is always open in the meantime.`}
        </Text>
        {isFree && (
          <>
            <Text style={[typography.bodyMuted, styles.center]}>Premium members get more swipes every day.</Text>
            <Button label="See Premium" variant="secondary" onPress={() => router.push('/paywall')} />
          </>
        )}
      </View>
    );
  } else if (loadError && cards.length === 0) {
    body = (
      <View style={styles.message}>
        <Text style={[typography.body, styles.center]}>{loadError}</Text>
        <Button label="Try again" variant="secondary" onPress={refill} />
      </View>
    );
  } else if (cards.length === 0) {
    body = (
      <View style={styles.message}>
        <Ionicons name="sparkles-outline" size={48} color={colors.accent} />
        <Text style={[typography.subtitle, styles.center]}>{"You've seen everyone for now"}</Text>
        <Text style={[typography.bodyMuted, styles.center]}>
          New members join every day. Check back later, or browse people who meet your criteria on Discover.
        </Text>
        <Button
          label="Check again"
          variant="secondary"
          onPress={() => {
            setExhausted(false);
            setLoading(true);
            refill();
          }}
        />
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
          <RoundButton icon="heart" color={colors.accent} label="Like" onPress={() => topCard.current?.swipe('like')} />
        </View>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.title}>Swipe</Text>
        {limits.data && !outOfSwipes && (
          <Text style={typography.caption}>{`${Math.max(allowed - used, 0)} swipes left today`}</Text>
        )}
      </View>
      {notice && <Text style={[typography.caption, styles.notice]}>{notice}</Text>}
      {body}

      <Modal visible={!!match} animationType="fade" transparent onRequestClose={() => setMatch(null)}>
        <View style={styles.matchBackdrop}>
          {match && (
            <View style={styles.matchBox}>
              <Text style={[typography.display, styles.center, { color: colors.accent }]}>{"It's a match!"}</Text>
              <Text style={[typography.body, styles.center]}>{`You and ${match.card.name} liked each other.`}</Text>
              <View style={styles.pair}>
                <Avatar url={myPhotos.data?.[0]?.url ?? null} name="You" size={96} />
                <Ionicons name="heart" size={32} color={colors.rose} />
                <Avatar url={match.card.photoUrl} name={match.card.name} size={96} />
              </View>
              <Text style={[typography.caption, styles.center]}>
                This chat does not use one of your daily new chats.
              </Text>
              <Button
                label="Send a message"
                onPress={() => {
                  const id = match.conversationId;
                  setMatch(null);
                  router.push(`/chat/${id}`);
                }}
              />
              <Button label="Keep swiping" variant="text" onPress={() => setMatch(null)} />
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function RoundButton({
  icon,
  color,
  label,
  onPress,
}: {
  icon: 'close' | 'heart';
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.round, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
    >
      <Ionicons name={icon} size={32} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
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
  round: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceRaised,
  },
  pressed: {
    opacity: 0.8,
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
  matchBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.overlay,
  },
  matchBox: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
});
