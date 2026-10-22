import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

// 'loading' until we know; 'error' if the check failed (e.g. offline) and should be retried.
export type ProfileStatus = 'loading' | 'missing' | 'exists' | 'error';

// The member's latest verification submission (selfie + photos reviewed by an admin).
export type Verification = { status: 'none' | 'pending' | 'approved' | 'rejected'; reason: string | null };

type SessionState = {
  session: Session | null;
  loading: boolean; // true until the stored session has been read on launch
  profileStatus: ProfileStatus;
  photoCount: number; // the user's own photos, any moderation status
  hasPreferences: boolean; // preference_core saved
  // Approved member: active, selfie verified by an admin, at least one approved photo. Mirrors
  // is_approved_member() in the database, which enforces it; only approved members use the tabs.
  approved: boolean;
  accountStatus: string | null; // 'active', 'suspended', 'banned'
  verification: Verification;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionState>({
  session: null,
  loading: true,
  profileStatus: 'loading',
  photoCount: 0,
  hasPreferences: false,
  approved: false,
  accountStatus: null,
  verification: { status: 'none', reason: null },
  refreshProfile: async () => {},
});

type ProfileState = {
  status: ProfileStatus;
  photoCount: number;
  hasPreferences: boolean;
  approved: boolean;
  accountStatus: string | null;
  verification: Verification;
};
const LOADING: ProfileState = {
  status: 'loading',
  photoCount: 0,
  hasPreferences: false,
  approved: false,
  accountStatus: null,
  verification: { status: 'none', reason: null },
};

// Onboarding and approval progress from the server.
async function fetchProfileState(userId: string): Promise<ProfileState> {
  const [profile, photos, approvedPhotos, prefs, latest] = await Promise.all([
    supabase.from('profiles').select('id, is_photo_verified, account_status').eq('id', userId).maybeSingle(),
    supabase.from('photos').select('id', { count: 'exact', head: true }).eq('user_id', userId).neq('moderation_status', 'rejected'),
    supabase.from('photos').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('moderation_status', 'approved'),
    supabase.from('preference_core').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase
      .from('verification_requests')
      .select('status, rejection_reason')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (profile.error || photos.error || approvedPhotos.error || prefs.error || latest.error) {
    return { ...LOADING, status: 'error' };
  }
  const p = profile.data;
  return {
    status: p ? 'exists' : 'missing',
    photoCount: photos.count ?? 0, // photos that are not rejected
    hasPreferences: !!prefs.data,
    approved: !!p && p.account_status === 'active' && p.is_photo_verified && (approvedPhotos.count ?? 0) > 0,
    accountStatus: p?.account_status ?? null,
    verification: latest.data
      ? { status: latest.data.status, reason: latest.data.rejection_reason }
      : { status: 'none', reason: null },
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileState, setProfileState] = useState<ProfileState>(LOADING);
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

  // Record activity (profiles.last_active_at) when the app opens or comes back, at most once an hour.
  // Used for "active members" in the admin dashboard.
  useEffect(() => {
    if (!userId || profileState.status !== 'exists') return;
    let last = 0;
    const ping = () => {
      if (Date.now() - last < 60 * 60 * 1000) return;
      last = Date.now();
      supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', userId).then(() => {});
    };
    ping();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') ping();
    });
    return () => sub.remove();
  }, [userId, profileState.status]);

  // Check whether this account already has a profile whenever the signed-in user changes.
  useEffect(() => {
    if (!userId) {
      setProfileState(LOADING);
      return;
    }
    let cancelled = false;
    setProfileState(LOADING);
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
        hasPreferences: profileState.hasPreferences,
        approved: profileState.approved,
        accountStatus: profileState.accountStatus,
        verification: profileState.verification,
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
