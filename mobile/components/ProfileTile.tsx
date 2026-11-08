import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { VerifiedBadge } from '@/components/VerifiedBadge';
import type { ProfileCard } from '@/lib/discover';
import { interestLabel } from '@/lib/interests';
import { placeLabel } from '@/lib/profileLabels';
import { colors, radius, spacing, typography } from '@/lib/theme';

type Props = { card: ProfileCard; width: number; onPress: () => void; onDismiss?: () => void };

// Grid card on Discover and For you: a white card edged in thin gold with the photo set inside,
// match percentage, name, age, blue tick, place and their first two interests.
// With onDismiss, a small ✕ in the corner removes the person in one tap (Suggested).
const PHOTO_INSET = spacing.sm;
export function ProfileTile({ card, width, onPress, onDismiss }: Props) {
  const place = placeLabel(card.city, card.countryCode);
  const photoWidth = width - PHOTO_INSET * 2 - 2; // inside the card's padding and gold edge
  const interests = card.interests.slice(0, 2);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${card.name}, ${card.age ?? ''}${card.verified ? ', verified' : ''}${
        place ? `, ${place}` : ''
      }${card.matchPercent !== null ? `, ${card.matchPercent} percent match` : ''}`}
    >
      <View style={[styles.photo, { height: photoWidth * 1.25 }]}>
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
            <Ionicons name="close" size={16} color={colors.onPhoto} />
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
        {interests.length > 0 && (
          <View style={styles.chips}>
            {interests.map((code, i) => (
              <View key={code} style={[styles.chip, i % 2 === 0 ? styles.chipGold : styles.chipBlue]}>
                <Text style={[styles.chipText, i % 2 === 0 ? styles.chipGoldText : styles.chipBlueText]} numberOfLines={1}>
                  {interestLabel(code)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    padding: PHOTO_INSET,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderGold,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.85,
  },
  photo: {
    borderRadius: radius.md,
    overflow: 'hidden',
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
    backgroundColor: colors.overlay, // a quiet see-through pill on the photo
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
    color: colors.onPhoto,
    fontFamily: typography.button.fontFamily,
  },
  info: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chip: {
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  chipGold: {
    backgroundColor: colors.goldSoft,
  },
  chipBlue: {
    backgroundColor: colors.accentSoft,
  },
  chipText: {
    ...typography.caption,
    fontSize: 12,
    fontFamily: typography.button.fontFamily,
  },
  chipGoldText: {
    color: colors.goldText,
  },
  chipBlueText: {
    color: colors.text,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    flexShrink: 1,
    fontFamily: typography.button.fontFamily,
    fontSize: 17,
  },
});
