import { Stack } from 'expo-router';

import { isPhoneVerified } from '@/lib/auth';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';
import { MIN_PHOTOS } from '@/lib/verification';

export default function OnboardingLayout() {
  const { session, profileStatus, photoCount, approved, verification } = useSession();
  const phoneVerified = isPhoneVerified(session?.user);
  const hasProfile = profileStatus === 'exists';
  const submitted = verification.status === 'pending' || verification.status === 'approved';

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Order is enforced by these guards and cannot be skipped; closing the app resumes at the
          same step. The database enforces the same rules (approval_pending, two_photos_required).
          1. Phone verification (required before the profile, see CLAUDE.md). */}
      <Stack.Protected guard={!phoneVerified}>
        <Stack.Screen name="phone" />
        <Stack.Screen name="phone-code" />
      </Stack.Protected>
      {/* 2. Profile wizard, until the profiles row exists. */}
      <Stack.Protected guard={phoneVerified && !hasProfile}>
        <Stack.Screen name="profile-setup" />
      </Stack.Protected>
      {/* 3. Photos (at least 2). Stays available to edit photos later. */}
      <Stack.Protected guard={phoneVerified && hasProfile}>
        <Stack.Screen name="photos" />
      </Stack.Protected>
      {/* 4. Live selfie, sent with the photos for review, until approved. */}
      <Stack.Protected guard={phoneVerified && hasProfile && !approved && photoCount >= MIN_PHOTOS}>
        <Stack.Screen name="selfie" />
      </Stack.Protected>
      {/* 5. Preferences, once submitted for review (or approved). Also edited later from Profile. */}
      <Stack.Protected guard={phoneVerified && hasProfile && (approved || submitted)}>
        <Stack.Screen name="preferences" />
      </Stack.Protected>
      {/* 6. Under review / rejected / suspended, until approved. */}
      <Stack.Protected guard={phoneVerified && hasProfile && !approved}>
        <Stack.Screen name="review" />
      </Stack.Protected>
    </Stack>
  );
}
