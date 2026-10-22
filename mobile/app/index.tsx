import { Redirect } from 'expo-router';

import { isPhoneVerified } from '@/lib/auth';
import { useSession } from '@/lib/session';
import { MIN_PHOTOS } from '@/lib/verification';

// Entry route. Sends people to the right step based on server state, so closing the app mid-way
// always resumes at the same step: sign in, phone, profile, photos (2+), selfie, preferences,
// review, then the main tabs once an admin has approved them.
export default function Index() {
  const { session, profileStatus, photoCount, hasPreferences, approved, accountStatus, verification } = useSession();
  if (!session) return <Redirect href="/welcome" />;
  if (!isPhoneVerified(session.user)) return <Redirect href="/phone" />;
  if (profileStatus !== 'exists') return <Redirect href="/profile-setup" />;

  if (approved) return <Redirect href={hasPreferences ? '/discover' : '/preferences'} />;

  // Not approved yet (or suspended / banned: the review screen explains).
  if (accountStatus !== 'active') return <Redirect href="/review" />;
  if (photoCount < MIN_PHOTOS) return <Redirect href="/photos" />;
  if (verification.status === 'none') return <Redirect href="/selfie" />;
  if (!hasPreferences && verification.status === 'pending') return <Redirect href="/preferences" />;
  return <Redirect href="/review" />;
}
