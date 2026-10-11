import { Stack } from 'expo-router';

import { isPhoneVerified } from '@/lib/auth';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function OnboardingLayout() {
  const { session, profileStatus } = useSession();
  const phoneVerified = isPhoneVerified(session?.user);
  const hasProfile = profileStatus === 'exists';

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Order is enforced by these guards and cannot be skipped. Each group only exists while it is
          the current step, so closing the app resumes at the same step and finished steps never return.
          1. Phone verification (required before the profile, see CLAUDE.md). */}
      <Stack.Protected guard={!phoneVerified}>
        <Stack.Screen name="phone" />
        <Stack.Screen name="phone-code" />
      </Stack.Protected>
      {/* 2. Profile wizard, until the profiles row exists. */}
      <Stack.Protected guard={phoneVerified && !hasProfile}>
        <Stack.Screen name="profile" />
      </Stack.Protected>
      {/* 3. Photos (Prompt 1.3). */}
      <Stack.Protected guard={phoneVerified && hasProfile}>
        <Stack.Screen name="photos" />
      </Stack.Protected>
    </Stack>
  );
}
