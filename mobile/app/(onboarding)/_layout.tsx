import { Stack } from 'expo-router';

import { isPhoneVerified } from '@/lib/auth';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function OnboardingLayout() {
  const { session, profileStatus, photoCount } = useSession();
  const phoneVerified = isPhoneVerified(session?.user);
  const hasProfile = profileStatus === 'exists';
  const hasPhoto = photoCount > 0;

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
        <Stack.Screen name="profile-setup" />
      </Stack.Protected>
      {/* 3. Photos: at least one is required to go on. Stays available to add more. */}
      <Stack.Protected guard={phoneVerified && hasProfile}>
        <Stack.Screen name="photos" />
      </Stack.Protected>
      {/* 4. Preferences, only once there is a photo. Photos and preferences stay available after
          onboarding so the Profile tab can open them for editing. */}
      <Stack.Protected guard={phoneVerified && hasProfile && hasPhoto}>
        <Stack.Screen name="preferences" />
      </Stack.Protected>
    </Stack>
  );
}
