import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { MatchModal, type Match } from '@/components/MatchModal';
import { RoundButton } from '@/components/RoundButton';
import { SwipeCard, type SwipeCardHandle, type SwipeDirection } from '@/components/SwipeCard';
import { fetchMyLimits, nextLimitReset } from '@/lib/chats';
import { errorCode, friendlyError } from '@/lib/errors';
import { undoLastSwipe } from '@/lib/premium';
import { fetchSwipeDeck, recordSwipe, type SwipeCard as Card } from '@/lib/swipe';
import { colors, spacing, typography } from '@/lib/theme';

const REFILL_AT = 5; // fetch more cards when this few are left

export default function Swipe() {
  const queryClient = useQueryClient();
  const topCard = useRef<SwipeCardHandle>(null);

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false); // the server has no more cards right now
  const [limitReached, setLimitReached] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastSwiped, setLastSwiped] = useState<Card | null>(null); // what Undo brings back (Premium)
  const [undoing, setUndoing] = useState(false);
  const swiped = useRef(new Set<string>()); // never show a card twice in this session
  const fetching = useRef(false);

  const limits = useQuery({ queryKey: ['my-limits'], queryFn: fetchMyLimits });

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
  const isPremium = limits.data?.tier === 'premium';

  const onSwiped = async (direction: SwipeDirection) => {
    const card = cards[0];
    if (!card) return;
    swiped.current.add(card.id);
    setCards((current) => current.slice(1)); // move on immediately; the server call follows
    setNotice(null);
    setLastSwiped(null); // until this swipe is saved
    queryClient.setQueryData(['my-limits'], (l: typeof limits.data) => (l ? { ...l, swipesUsed: l.swipesUsed + 1 } : l));
    try {
      const result = await recordSwipe(card.id, direction);
      if (result.matched && result.conversationId) {
        setMatch({ name: card.name, photoUrl: card.photoUrl, conversationId: result.conversationId });
        queryClient.invalidateQueries({ queryKey: ['inbox'] });
      } else {
        setLastSwiped(card); // a match can't be undone
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

  // Premium: take back the last swipe and show that card again. Everyone else sees the paywall.
  const onUndo = async () => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    const card = lastSwiped;
    if (!card || undoing) return;
    setUndoing(true);
    setNotice(null);
    try {
      const undone = await undoLastSwipe();
      if (undone === card.id) {
        swiped.current.delete(card.id);
        setCards((current) => [card, ...current.filter((c) => c.id !== card.id)]);
        setLimitReached(false);
      }
      setLastSwiped(null); // one step back only
    } catch (e) {
      setNotice(friendlyError(e));
      setLastSwiped(null);
    } finally {
      setUndoing(false);
      queryClient.invalidateQueries({ queryKey: ['my-limits'] });
      queryClient.invalidateQueries({ queryKey: ['likes-count'] });
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
          <RoundButton
            small
            icon="arrow-undo"
            color={colors.accentSoft}
            label={isPremium ? 'Undo last swipe' : 'Undo last swipe (Premium)'}
            onPress={onUndo}
            disabled={isPremium && (!lastSwiped || undoing)}
          />
          <RoundButton icon="close" color={colors.rose} label="Pass" onPress={() => topCard.current?.swipe('pass')} />
          <RoundButton icon="heart" color={colors.accent} label="Like" onPress={() => topCard.current?.swipe('like')} />
          <View style={styles.balance} />
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

      <MatchModal match={match} onClose={() => setMatch(null)} />
    </SafeAreaView>
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
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.lg,
  },
  balance: {
    width: 48, // mirrors the undo button so ✕ and ♥ stay centred
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
