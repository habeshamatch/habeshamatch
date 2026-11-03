import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router, Tabs } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { AppState, Text, type ColorValue } from 'react-native';

import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';

import { fetchForYouBadge, loadForYouSeen } from '@/lib/forYou';
import { fetchInbox, subscribeToMessages } from '@/lib/messages';
import { alreadyAsked, markAsked, pushStatus, registerForPush, routeFor } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { colors, fonts, typography } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IconName; color: ColorValue; size: number }) {
  // The tab bar always passes a string; ColorValue also allows numbers, which Ionicons does not.
  return <Ionicons name={name} color={typeof color === 'string' ? color : undefined} size={size} />;
}

// Main app, shown once onboarding is complete.
export default function TabsLayout() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const inbox = useQuery({ queryKey: ['inbox'], queryFn: fetchInbox, enabled: !!userId });
  const unread = inbox.data?.reduce((sum, c) => sum + c.unread, 0) ?? 0;
  // For you is badged with what is new since the member last opened it (new likes, people new to
  // Suggested, today's picks until opened), so the badge always means something new is waiting.
  const seen = useQuery({ queryKey: ['for-you-seen', userId], queryFn: () => loadForYouSeen(userId ?? ''), enabled: !!userId });
  const forYou = useQuery({
    queryKey: ['for-you-badge', userId, seen.data?.at, seen.data?.picksDate],
    queryFn: () => fetchForYouBadge(seen.data!),
    enabled: !!userId && !!seen.data,
  });
  const forYouCount = forYou.data ?? 0;

  // One live subscription for the whole app: any new or read message refreshes the inbox and badge.
  useEffect(() => {
    if (!userId) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['inbox'] });
    const refreshForYou = () => {
      queryClient.invalidateQueries({ queryKey: ['likes-count'] });
      queryClient.invalidateQueries({ queryKey: ['for-you-badge'] });
    };
    const unsubscribe = subscribeToMessages(`inbox:${userId}`, refresh, undefined, refresh);
    // Back from the background: messages may have arrived while the app was asleep.
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        refresh();
        refreshForYou();
      }
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, [userId, queryClient]);

  // Notifications: keep this phone registered (the token can change); ask once, with our own
  // short explanation first, so the one-time system prompt is not wasted.
  const [askOpen, setAskOpen] = useState(false);
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const status = await pushStatus();
      if (status === 'granted') registerForPush(false).catch(() => {});
      else if (status === 'undetermined' && !(await alreadyAsked())) setAskOpen(true);
    })();
  }, [userId]);
  const answerAsk = async (turnOn: boolean) => {
    setAskOpen(false);
    await markAsked();
    if (turnOn) registerForPush(true).catch(() => {});
  };

  // A tapped notification opens its chat, or For you for today's picks (also when it started the app).
  const tapped = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!tapped || tapped.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const route = routeFor(tapped.notification.request.content.data);
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
    if (route) router.push(route as Parameters<typeof router.push>[0]);
  }, [tapped]);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.background },
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.surfaceRaised },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontFamily: fonts.bodyMedium },
        }}
      >
        <Tabs.Screen
          name="discover"
          options={{ title: 'Discover', tabBarIcon: (p) => <TabIcon name="compass-outline" {...p} /> }}
        />
        <Tabs.Screen
          name="swipe"
          options={{ title: 'Swipe', tabBarIcon: (p) => <TabIcon name="heart-outline" {...p} /> }}
        />
        <Tabs.Screen
          name="for-you"
          options={{
            title: 'For you',
            tabBarIcon: (p) => <TabIcon name="sparkles-outline" {...p} />,
            tabBarBadge: forYouCount > 0 ? (forYouCount > 99 ? '99+' : forYouCount) : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.rose, color: colors.onAccent },
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: (p) => <TabIcon name="chatbubbles-outline" {...p} />,
            tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.rose, color: colors.onAccent },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: 'Profile', tabBarIcon: (p) => <TabIcon name="person-outline" {...p} /> }}
        />
      </Tabs>
      <Sheet visible={askOpen} onClose={() => answerAsk(false)}>
        <Text style={typography.subtitle}>{"Don't miss a message"}</Text>
        <Text style={typography.bodyMuted}>
          Get a notification when someone writes to you, when you match, and when your daily picks are ready. You can
          change this any time in Profile.
        </Text>
        <Button label="Turn on notifications" onPress={() => answerAsk(true)} />
        <Button label="Not now" variant="text" onPress={() => answerAsk(false)} />
      </Sheet>
    </>
  );
}
