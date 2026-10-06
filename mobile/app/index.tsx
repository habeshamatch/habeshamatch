import { Redirect } from 'expo-router';

import { useSession } from '@/lib/session';

// Entry route: signed-in users go to onboarding (later: tabs once their profile exists).
export default function Index() {
  const { session } = useSession();
  return <Redirect href={session ? '/start' : '/welcome'} />;
}
