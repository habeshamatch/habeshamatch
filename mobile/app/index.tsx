import { Redirect } from 'expo-router';

import { isPhoneVerified } from '@/lib/auth';
import { useSession } from '@/lib/session';

// Entry route. Sends people to the right step based on server state, so closing the app
// mid-way always resumes at the same step: sign in, phone verification, profile, photos, preferences.
export default function Index() {
  const { session, profileStatus, photoCount } = useSession();
  if (!session) return <Redirect href="/welcome" />;
  if (!isPhoneVerified(session.user)) return <Redirect href="/phone" />;
  if (profileStatus !== 'exists') return <Redirect href="/profile" />;
  if (photoCount === 0) return <Redirect href="/photos" />;
  return <Redirect href="/preferences" />;
}
