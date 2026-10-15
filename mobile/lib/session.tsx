import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

// 'loading' until we know; 'error' if the check failed (e.g. offline) and should be retried.
export type ProfileStatus = 'loading' | 'missing' | 'exists' | 'error';

type SessionState = {
  session: Session | null;
  loading: boolean; // true until the stored session has been read on launch
  profileStatus: ProfileStatus;
  photoCount: number; // the user's own photos, any moderation status
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionState>({
  session: null,
  loading: true,
  profileStatus: 'loading',
  photoCount: 0,
  refreshProfile: async () => {},
});

type ProfileState = { status: ProfileStatus; photoCount: number };

// Onboarding progress from the server: does the profile row exist, and how many photos are there.
async function fetchProfileState(userId: string): Promise<ProfileState> {
  const [profile, photos] = await Promise.all([
    supabase.from('profiles').select('id').eq('id', userId).maybeSingle(),
    supabase.from('photos').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  if (profile.error || photos.error) return { status: 'error', photoCount: 0 };
  return { status: profile.data ? 'exists' : 'missing', photoCount: photos.count ?? 0 };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileState, setProfileState] = useState<ProfileState>({ status: 'loading', photoCount: 0 });
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
    setProfileState(await fetchProfileState(userId));
  }, [userId]);

  // The stored session is trusted offline, so confirm with the server that the account still exists.
  // If it was deleted (or the session revoked), sign out on this device only and start fresh.
  useEffect(() => {
    if (!userId) return;
    supabase.auth.getUser().then(({ error }) => {
      if (error && (error.status === 401 || error.status === 403 || error.code === 'user_not_found')) {
        supabase.auth.signOut({ scope: 'local' });
      }
    });
  }, [userId]);

  // Check whether this account already has a profile whenever the signed-in user changes.
  useEffect(() => {
    if (!userId) {
      setProfileState({ status: 'loading', photoCount: 0 });
      return;
    }
    let cancelled = false;
    setProfileState({ status: 'loading', photoCount: 0 });
    fetchProfileState(userId).then((state) => {
      if (!cancelled) setProfileState(state);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <SessionContext.Provider
      value={{
        session,
        loading,
        profileStatus: profileState.status,
        photoCount: profileState.photoCount,
        refreshProfile,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
