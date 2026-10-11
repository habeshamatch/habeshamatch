import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

// 'loading' until we know; 'error' if the check failed (e.g. offline) and should be retried.
export type ProfileStatus = 'loading' | 'missing' | 'exists' | 'error';

type SessionState = {
  session: Session | null;
  loading: boolean; // true until the stored session has been read on launch
  profileStatus: ProfileStatus;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionState>({
  session: null,
  loading: true,
  profileStatus: 'loading',
  refreshProfile: async () => {},
});

async function fetchProfileStatus(userId: string): Promise<ProfileStatus> {
  const { data, error } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (error) return 'error';
  return data ? 'exists' : 'missing';
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('loading');
  const userId = session?.user.id;

  useEffect(() => {
    // Fires once with the stored session (INITIAL_SESSION), then on every sign in, refresh and sign out.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Re-check after creating the profile. Keeps the current status until the answer arrives, so the
  // screen does not blank out while loading.
  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    setProfileStatus(await fetchProfileStatus(userId));
  }, [userId]);

  // Check whether this account already has a profile whenever the signed-in user changes.
  useEffect(() => {
    if (!userId) {
      setProfileStatus('loading');
      return;
    }
    let cancelled = false;
    setProfileStatus('loading');
    fetchProfileStatus(userId).then((status) => {
      if (!cancelled) setProfileStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <SessionContext.Provider value={{ session, loading, profileStatus, refreshProfile }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
