import { supabase } from '@/lib/supabase';

export type OtpChannel = 'sms' | 'whatsapp';

// WhatsApp codes need Twilio (or Twilio Verify) with an approved WhatsApp sender configured in
// Supabase Auth. Turn this on in mobile/.env once that is set up.
export const whatsappEnabled = process.env.EXPO_PUBLIC_WHATSAPP_OTP_ENABLED === 'true';

// Matches Supabase Auth's default minimum time between codes for the same number.
export const RESEND_SECONDS = 60;

// Sends a 6 digit code. Creates the account on first sign in.
export async function sendCode(phone: string, channel: OtpChannel): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { channel } });
  if (error) throw error;
}

// Checks the code. On success Supabase stores the session and the app moves on automatically.
export async function verifyCode(phone: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
