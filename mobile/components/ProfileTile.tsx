import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { VerifiedBadge } from '@/components/VerifiedBadge';
import type { ProfileCard } from '@/lib/discover';
import { placeLabel } from '@/lib/profileLabels';
import { colors, radius, spacing, typography } from '@/lib/theme';

type Props = { card: ProfileCard; width: number; onPress: () => void; onDismiss?: () => void };

// Grid card on Discover: thumbnail, name, age, place, blue tick, match percentage.
// With onDismiss, a small ✕ in the corner removes the person in one tap (Suggested).
export function ProfileTile({ card, width, onPress, onDismiss }: Props) {
  const place = placeLabel(card.city, card.countryCode);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${card.name}, ${card.age ?? ''}${card.verified ? ', verified' : ''}${
        place ? `, ${place}` : ''
      }${card.matchPercent !== null ? `, ${card.matchPercent} percent match` : ''}`}
    >
      <View style={[styles.photo, { height: width * 1.3 }]}>
        {card.photoUrl ? (
          <Image
            source={{ uri: card.photoUrl, cacheKey: card.photoPath ? `thumb:${card.photoPath}` : undefined }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
            recyclingKey={card.id}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.initials]}>
            <Text style={typography.display}>{card.name.slice(0, 1)}</Text>
          </View>
        )}
        {card.matchPercent !== null && (
          <View style={styles.match}>
            <Text style={styles.matchText}>{card.matchPercent}% match</Text>
          </View>
        )}
        {onDismiss && (
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Not for me: remove ${card.name} from Suggested`}
            hitSlop={10}
          >
            <Ionicons name="close" size={16} color={colors.text} />
          </Pressable>
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[typography.body, styles.name]} numberOfLines={1}>
            {card.name}
            {card.age !== null ? `, ${card.age}` : ''}
          </Text>
          {card.verified && <VerifiedBadge />}
        </View>
        {place && (
          <Text style={typography.caption} numberOfLines={1}>
            {place}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.85,
  },
  photo: {
    backgroundColor: colors.surfaceRaised,
  },
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  match: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  dismiss: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  matchText: {
    ...typography.caption,
    color: colors.background,
    fontFamily: typography.button.fontFamily,
  },
  info: {
    padding: spacing.sm,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    flexShrink: 1,
    fontFamily: typography.button.fontFamily,
  },
});
