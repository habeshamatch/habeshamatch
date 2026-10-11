import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

// Matches Supabase Auth's default minimum time between codes to the same email or number.
export const RESEND_SECONDS = 60;

// ---- Sign in (email code). Google and Apple will be added alongside this. ----

// Sends a 6 digit code by email. Creates the account on first sign in.
export async function sendEmailCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
}

// Checks the email code. On success the session listener moves the user on.
export async function verifyEmailCode(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ---- One-time phone verification (onboarding, not a sign in method). ----
// Links the number to the signed-in account as a pending phone change and texts a code.
// Calling it again re-sends the code. Phone sign in is disabled in Supabase Auth, so the
// generic resend endpoint is not available for phone codes.
export async function sendPhoneVerificationCode(phone: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ phone });
  if (error) throw error;
}

// Confirms the code. Sets auth.users.phone, which the database checks for local-tier residence.
export async function verifyPhoneCode(phone: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'phone_change' });
  if (error) throw error;
}

export function isPhoneVerified(user: User | null | undefined): boolean {
  return !!user?.phone && !!user.phone_confirmed_at;
}
