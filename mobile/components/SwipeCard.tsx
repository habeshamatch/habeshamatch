import { Image } from 'expo-image';
import { forwardRef, useImperativeHandle } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { VerifiedBadge } from '@/components/VerifiedBadge';
import { placeLabel } from '@/lib/profileLabels';
import type { SwipeCard as Card } from '@/lib/swipe';
import { colors, radius, spacing, typography } from '@/lib/theme';

export type SwipeDirection = 'like' | 'pass';
export type SwipeCardHandle = { swipe: (direction: SwipeDirection) => void };

type Props = {
  card: Card;
  active: boolean; // only the top card can be dragged
  onSwiped: (direction: SwipeDirection) => void;
  onOpenProfile: () => void;
};

const FLY_OUT_MS = 220;

// A full-size profile card. Drag right to like, left to pass, or use the buttons (via ref).
export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard(
  { card, active, onSwiped, onOpenProfile },
  ref,
) {
  const { width } = useWindowDimensions();
  const threshold = width * 0.3;
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const flyOut = (direction: SwipeDirection) => {
    'worklet';
    const to = (direction === 'like' ? 1 : -1) * width * 1.5;
    x.value = withTiming(to, { duration: FLY_OUT_MS }, (finished) => {
      if (finished) scheduleOnRN(onSwiped, direction);
    });
  };

  useImperativeHandle(ref, () => ({ swipe: (direction) => flyOut(direction) }));

  const pan = Gesture.Pan()
    .enabled(active)
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd((e) => {
      if (Math.abs(x.value) > threshold || Math.abs(e.velocityX) > 900) {
        flyOut(x.value > 0 || e.velocityX > 900 ? 'like' : 'pass');
      } else {
        x.value = withSpring(0);
        y.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value * 0.3 },
      { rotate: `${interpolate(x.value, [-width, 0, width], [-12, 0, 12], Extrapolation.CLAMP)}deg` },
    ],
  }));
  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, threshold], [0, 1], Extrapolation.CLAMP),
  }));
  const nopeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-threshold, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const place = placeLabel(card.city, card.countryCode);

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]}>
        {card.photoUrl ? (
          <Image
            source={{ uri: card.photoUrl, cacheKey: card.photoPath ?? undefined }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.noPhoto]}>
            <Text style={typography.display}>{card.name.slice(0, 1)}</Text>
          </View>
        )}

        <Animated.View style={[styles.stamp, styles.likeStamp, likeStyle]} pointerEvents="none">
          <Text style={[styles.stampText, { color: colors.accent }]}>LIKE</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.nopeStamp, nopeStyle]} pointerEvents="none">
          <Text style={[styles.stampText, { color: colors.rose }]}>NOPE</Text>
        </Animated.View>

        <Pressable
          onPress={onOpenProfile}
          style={styles.info}
          accessibilityRole="button"
          accessibilityLabel={`${card.name}, ${card.age ?? ''}${place ? `, ${place}` : ''}. View full profile`}
        >
          <View style={styles.nameRow}>
            <Text style={[typography.title, styles.name]} numberOfLines={1}>
              {card.name}
              {card.age !== null ? `, ${card.age}` : ''}
            </Text>
            {card.verified && <VerifiedBadge size={22} />}
          </View>
          {place && <Text style={typography.body}>{place}</Text>}
          <Text style={[typography.caption, styles.more]}>Tap for full profile</Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  card: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
  },
  noPhoto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stamp: {
    position: 'absolute',
    top: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 3,
    borderRadius: radius.sm,
  },
  likeStamp: {
    left: spacing.lg,
    borderColor: colors.accent,
    transform: [{ rotate: '-12deg' }],
  },
  nopeStamp: {
    right: spacing.lg,
    borderColor: colors.rose,
    transform: [{ rotate: '12deg' }],
  },
  stampText: {
    ...typography.title,
    letterSpacing: 2,
  },
  info: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    gap: 2,
    backgroundColor: colors.overlay,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
  },
  more: {
    marginTop: spacing.xs,
  },
});
