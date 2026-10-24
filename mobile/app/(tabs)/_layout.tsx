import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { useEffect, type ComponentProps } from 'react';
import { AppState, type ColorValue } from 'react-native';

import { fetchLikesCount } from '@/lib/likes';
import { fetchInbox, subscribeToMessages } from '@/lib/messages';
import { useSession } from '@/lib/session';
import { colors, fonts } from '@/lib/theme';

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
  // For you is badged only with people who liked you (not the Suggested total), so it means
  // something new is waiting.
  const likes = useQuery({ queryKey: ['likes-count'], queryFn: fetchLikesCount, enabled: !!userId });
  const likeCount = likes.data ?? 0;

  // One live subscription for the whole app: any new or read message refreshes the inbox and badge.
  useEffect(() => {
    if (!userId) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['inbox'] });
    const refreshLikes = () => queryClient.invalidateQueries({ queryKey: ['likes-count'] });
    const unsubscribe = subscribeToMessages(`inbox:${userId}`, refresh, undefined, refresh);
    // Back from the background: messages may have arrived while the app was asleep.
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        refresh();
        refreshLikes();
      }
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, [userId, queryClient]);

  return (
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
          tabBarBadge: likeCount > 0 ? (likeCount > 99 ? '99+' : likeCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.rose, color: colors.text },
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: (p) => <TabIcon name="chatbubbles-outline" {...p} />,
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.background },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: (p) => <TabIcon name="person-outline" {...p} /> }}
      />
    </Tabs>
  );
}
