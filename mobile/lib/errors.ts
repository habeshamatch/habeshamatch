// Turns errors from Supabase (database rules and auth) into friendly messages.
// Database functions raise stable codes as the error message (see CLAUDE.md);
// Supabase Auth returns its own codes on AuthError.code.

const DATABASE_MESSAGES = {
  premium_required: 'This is a Premium feature.',
  daily_new_chat_limit_reached:
    "You've started all your new conversations for today. You can still reply to anyone, and more open up tomorrow.",
  daily_swipe_limit_reached: "You're out of swipes for today. Come back tomorrow for more.",
  not_permitted: "This isn't available for this profile.",
  must_be_18: 'You must be 18 or older to use HabeshaMatch.',
  local_residence_requires_local_phone:
    'To choose this country of residence, please sign in with a phone number from that country.',
  // The cooldown length lives in app_config, so it is not repeated here.
  residence_change_cooldown: 'You changed your country of residence recently. You can change it again later.',
  protected_field: "This detail can't be changed from the app.",
  cannot_undo_match: "You can't undo a swipe that already became a match.",
  account_not_active: 'Your account is not active. Please contact support.',
  not_authenticated: 'Please sign in again.',
  phone_not_verified: 'Please verify your phone number before setting up your profile.',
} as const;

const AUTH_MESSAGES: Record<string, string> = {
  otp_expired: "That code didn't work. Check the code or ask for a new one.",
  invalid_credentials: "That code didn't work. Check the code or ask for a new one.",
  over_email_send_rate_limit: 'Too many codes requested. Please wait a few minutes and try again.',
  over_sms_send_rate_limit: 'Too many codes requested. Please wait a minute and try again.',
  over_request_rate_limit: 'Too many attempts. Please wait a minute and try again.',
  email_address_invalid: "That email address doesn't look right. Check it and try again.",
  email_address_not_authorized: "We can't send email to that address yet. Please try another one.",
  sms_send_failed: "We couldn't send a code to that number. Check the number and try again.",
  phone_exists: 'This phone number is already linked to another HabeshaMatch account.',
  phone_provider_disabled: 'Phone verification is not available right now. Please try again later.',
  signup_disabled: 'New sign ups are paused right now. Please try again later.',
  validation_failed: "That doesn't look right. Check it and try again.",
  session_expired: 'Your session expired. Please sign in again.',
  session_not_found: 'Your session expired. Please sign in again.',
  request_timeout: 'That took too long. Check your connection and try again.',
};

export type DatabaseErrorCode = keyof typeof DATABASE_MESSAGES;

const FALLBACK = 'Something went wrong. Please try again.';
const OFFLINE = "You seem to be offline. Check your connection and try again.";
const EMAIL_SEND_FAILED = "We couldn't send your code right now. Please try again in a few minutes.";

// The stable code behind an error, if there is one.
export function errorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const e = error as { code?: unknown; message?: unknown };
  if (typeof e.message === 'string' && e.message in DATABASE_MESSAGES) return e.message;
  if (typeof e.code === 'string' && e.code in AUTH_MESSAGES) return e.code;
  return null;
}

// True when the error should open the paywall instead of showing a message.
export function isPremiumRequired(error: unknown): boolean {
  return errorCode(error) === 'premium_required';
}

export function friendlyError(error: unknown): string {
  const code = errorCode(error);
  if (code && code in DATABASE_MESSAGES) return DATABASE_MESSAGES[code as DatabaseErrorCode];
  if (code) return AUTH_MESSAGES[code];
  const message = error instanceof Error ? error.message : String(error ?? '');
  // Supabase Auth could not hand the email to the SMTP provider (Resend). Has no error code.
  if (/error sending .*email/i.test(message)) return EMAIL_SEND_FAILED;
  if (/network request failed|failed to fetch|network/i.test(message)) return OFFLINE;
  if (__DEV__) console.warn('Unmapped error:', error);
  return FALLBACK;
}
