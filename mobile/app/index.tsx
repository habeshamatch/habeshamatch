import { Redirect } from 'expo-router';

import { isPhoneVerified } from '@/lib/auth';
import { useSession } from '@/lib/session';

// Entry route. Sends people to the right step based on server state, so closing the app
// mid-way always resumes at the same step: sign in, then phone verification, then profile setup.
export default function Index() {
  const { session } = useSession();
  if (!session) return <Redirect href="/welcome" />;
  if (!isPhoneVerified(session.user)) return <Redirect href="/phone" />;
  return <Redirect href="/start" />;
}
