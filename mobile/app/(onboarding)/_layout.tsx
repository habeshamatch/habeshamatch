import { Stack } from 'expo-router';

import { isPhoneVerified } from '@/lib/auth';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function OnboardingLayout() {
  const { session } = useSession();
  const phoneVerified = isPhoneVerified(session?.user);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Phone verification comes first and cannot be skipped: until the number is confirmed,
          these are the only onboarding screens that exist. Once confirmed they are never shown again. */}
      <Stack.Protected guard={!phoneVerified}>
        <Stack.Screen name="phone" />
        <Stack.Screen name="phone-code" />
      </Stack.Protected>
      <Stack.Protected guard={phoneVerified}>
        <Stack.Screen name="start" />
      </Stack.Protected>
    </Stack>
  );
}
