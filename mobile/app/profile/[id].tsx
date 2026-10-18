import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { SafetyMenu } from '@/components/SafetyMenu';
import { Sheet } from '@/components/Sheet';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { fetchMyLimits, findConversationWith, nextLimitReset, startConversation } from '@/lib/chats';
import { fetchProfile } from '@/lib/discover';
import { errorCode, friendlyError, isPremiumRequired } from '@/lib/errors';
import {
  heightLabel,
  intentLabel,
  languagesLabel,
  originLabel,
  placeLabel,
  religionLabel,
} from '@/lib/profileLabels';
import { useSession } from '@/lib/session';
import { colors, radius, spacing, typography } from '@/lib/theme';

// Someone's public profile. Only what get_profile returns is shown (age, never date of birth).
export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [limitSheet, setLimitSheet] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const { session } = useSession();
  const myId = session?.user.id ?? '';
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: ['profile', id], queryFn: () => fetchProfile(id), enabled: !!id });
  const existing = useQuery({
    queryKey: ['conversation-with', id],
    queryFn: () => findConversationWith(myId, id),
    enabled: !!id && !!myId,
  });
  const limits = useQuery({ queryKey: ['my-limits'], queryFn: fetchMyLimits });

  const message = useMutation({
    mutationFn: () => startConversation(id),
    onSuccess: (conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['my-limits'] });
      queryClient.setQueryData(['conversation-with', id], conversationId);
      router.push(`/chat/${conversationId}`);
    },
    onError: (e) => {
      if (isPremiumRequired(e)) router.push('/paywall');
      else if (errorCode(e) === 'daily_new_chat_limit_reached') {
        queryClient.invalidateQueries({ queryKey: ['my-limits'] });
        setLimitSheet(true);
      } else setMessageError(friendlyError(e));
    },
  });

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
  const hasChat = !!existing.data;
  const l = limits.data;
  const chatsLeft = l ? Math.max(l.newChatsLimit - l.newChatsUsed, 0) : null;
  const resetTime = nextLimitReset().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        {back}
        <View style={styles.menu}>
          <SafetyMenu userId={p.id} name={p.name} onBlocked={() => router.dismissAll()} />
        </View>
      </View>
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

      <View style={styles.footer}>
        {messageError && (
          <Text style={[typography.caption, styles.error]} accessibilityLiveRegion="polite">
            {messageError}
          </Text>
        )}
        <Button
          label={hasChat ? 'Open chat' : `Message ${p.name}`}
          onPress={() => {
            setMessageError(null);
            message.mutate();
          }}
          loading={message.isPending}
          disabled={existing.isPending}
        />
        {!hasChat && l?.showChatLimit && chatsLeft !== null && (
          <Text style={[typography.caption, styles.center]}>
            {chatsLeft} of {l.newChatsLimit} new chats left today. Replies are always free.
          </Text>
        )}
      </View>

      <Sheet visible={limitSheet} onClose={() => setLimitSheet(false)}>
        <Text style={typography.subtitle}>{"You've used today's new chats"}</Text>
        <Text style={typography.bodyMuted}>
          {`Free members can start ${l?.newChatsLimit ?? 'a few'} new conversations a day. You can still reply to anyone who messages you. New chats open again at ${resetTime}.`}
        </Text>
        <Text style={typography.bodyMuted}>Premium members are not held to the free daily limit on new chats.</Text>
        <Button
          label="See Premium"
          onPress={() => {
            setLimitSheet(false);
            router.push('/paywall');
          }}
        />
        <Button label="Not now" variant="text" onPress={() => setLimitSheet(false)} />
      </Sheet>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menu: {
    paddingHorizontal: spacing.lg,
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
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceRaised,
    backgroundColor: colors.background,
  },
  error: {
    color: colors.rose,
    textAlign: 'center',
  },
});
