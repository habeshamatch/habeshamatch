import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { fetchProfile } from '@/lib/discover';
import { friendlyError } from '@/lib/errors';
import {
  heightLabel,
  intentLabel,
  languagesLabel,
  originLabel,
  placeLabel,
  religionLabel,
} from '@/lib/profileLabels';
import { colors, radius, spacing, typography } from '@/lib/theme';

// Someone's public profile. Only what get_profile returns is shown (age, never date of birth).
export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const [photoIndex, setPhotoIndex] = useState(0);

  const query = useQuery({ queryKey: ['profile', id], queryFn: () => fetchProfile(id), enabled: !!id });

  const back = (
    <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12} style={styles.back}>
      <Text style={[typography.button, { color: colors.accent }]}>Back</Text>
    </Pressable>
  );

  if (query.isPending) {
    return (
      <SafeAreaView style={styles.container}>
        {back}
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      </SafeAreaView>
    );
  }
  if (query.isError) {
    return (
      <SafeAreaView style={styles.container}>
        {back}
        <View style={styles.message}>
          <Text style={[typography.body, styles.center]}>{friendlyError(query.error)}</Text>
          <Button label="Try again" variant="secondary" onPress={() => query.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  const p = query.data;
  const photoHeight = width * 1.25;
  const onPhotoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  const details: [string, string | null][] = [
    ['Lives in', placeLabel(p.city, p.countryCode)],
    ['Origin', originLabel(p.origin)],
    ['Height', heightLabel(p.heightCm)],
    ['Religion', religionLabel(p.religion)],
    ['Languages', p.languages.length ? languagesLabel(p.languages) : null],
    ['Looking for', intentLabel(p.intent)],
    ['Open to relocating', p.openToRelocating ? 'Yes' : 'No'],
    ['Open to long distance', p.openToLongDistance ? 'Yes' : 'No'],
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {back}
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ height: photoHeight }}>
          {p.photoUrls.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onPhotoScroll}
              accessibilityLabel={`${p.photoUrls.length} photos. Swipe to see more`}
            >
              {p.photoUrls.map((url, i) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  style={{ width, height: photoHeight }}
                  contentFit="cover"
                  transition={150}
                  accessibilityLabel={`Photo ${i + 1} of ${p.photoUrls.length}`}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.noPhoto, { height: photoHeight }]}>
              <Text style={typography.display}>{p.name.slice(0, 1)}</Text>
            </View>
          )}
          {p.photoUrls.length > 1 && (
            <View style={styles.dots}>
              {p.photoUrls.map((url, i) => (
                <View key={url} style={[styles.dot, i === photoIndex && styles.dotOn]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={typography.title}>
              {p.name}
              {p.age !== null ? `, ${p.age}` : ''}
            </Text>
            {p.verified && <VerifiedBadge size={22} />}
          </View>
          {p.matchPercent !== null && (
            <Text style={[typography.body, { color: colors.accent }]}>
              {p.matchPercent}% of your nice-to-haves
            </Text>
          )}

          {p.bio ? <Text style={[typography.body, styles.bio]}>{p.bio}</Text> : null}

          <View style={styles.details}>
            {details
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <View key={label} style={styles.detailRow}>
                  <Text style={typography.bodyMuted}>{label}</Text>
                  <Text style={[typography.body, styles.detailValue]}>{value}</Text>
                </View>
              ))}
          </View>
        </View>
      </ScrollView>
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
  loading: {
    marginTop: spacing.xxl,
  },
  message: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  center: {
    textAlign: 'center',
  },
  scroll: {
    paddingBottom: spacing.xxl,
  },
  noPhoto: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.textMuted,
  },
  dotOn: {
    backgroundColor: colors.text,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bio: {
    marginTop: spacing.sm,
  },
  details: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceRaised,
  },
  detailValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
