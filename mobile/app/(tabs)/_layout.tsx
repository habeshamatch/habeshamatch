import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colors, fonts } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IconName; color: ColorValue; size: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}

// Main app, shown once onboarding is complete.
export default function TabsLayout() {
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
        name="messages"
        options={{ title: 'Messages', tabBarIcon: (p) => <TabIcon name="chatbubbles-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: (p) => <TabIcon name="person-outline" {...p} /> }}
      />
    </Tabs>
  );
}
