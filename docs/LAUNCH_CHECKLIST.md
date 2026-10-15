# HabeshaMatch: before launch checklist

Items that are deliberately postponed. Each one blocks real users, not development.

## SMS (phone verification)

Currently: Twilio is switched OFF on the remote project, so phone verification cannot be completed there (not even with test numbers). It works on local Supabase.

- [ ] Decide the provider. Recommended: **Twilio Verify** (no phone number to manage, per-country sender rules handled, fraud protection against SMS pumping, about $0.05 per successful verification plus the SMS).
- [ ] Twilio Console > Verify > Services > create "HabeshaMatch", SMS channel on. Copy the Verify Service SID (starts with `VA`).
  - If plain Twilio instead: Messaging > Services > create a Messaging Service with a sender; its SID starts with `MG`.
- [ ] Supabase dashboard > Authentication > Sign In / Providers > Phone: choose the provider, enter Account SID, Auth Token and the Service SID. Credentials live in the dashboard only, never in the repo.
- [ ] Make sure local matches: `supabase/config.toml` currently uses `[auth.sms.twilio_verify]`. Switch it if the remote uses plain Twilio.
- [ ] Check SMS delivery to Eritrea (+291) with Twilio support or their coverage page. Local-tier residents of Eritrea need a +291 number.
- [ ] Also confirm delivery to Ethiopia (+251), Uganda (+256), Kenya (+254), Sudan (+249), Angola (+244).
- [ ] Remove or replace the test numbers in `supabase/remote-auth/supabase/config.toml` `[auth.sms.test_otp]` before launch, then push.

## Phone confirmations (security)

- [ ] Supabase dashboard > Authentication > Sign In / Providers > Phone: **"Enable phone confirmations" must be ON.** When it was off, `updateUser({ phone })` marked any number as verified with no code (found 2026-10-11 and 2026-10-14), which bypasses the local-tier phone rule. Set it in the dashboard only: the Supabase CLI writes this setting inverted for the remote project, so it is no longer in `supabase/remote-auth`.
- [ ] After Twilio is on, retest: a new account entering a test number must see the code screen, and `auth.users.phone_change_sent_at` must be set.

## Email

- [ ] Buy a domain (for example habeshamatch.com). Also needed for the App Store and Play Store privacy policy and support URLs, and the Google sign in consent screen.
- [ ] Verify the domain in Resend (DNS records), ideally a subdomain such as `mail.habeshamatch.com`.
- [ ] Supabase dashboard > Authentication > Emails > SMTP Settings: change the sender from `onboarding@resend.dev` to an address on the domain. Until then Resend only delivers to the Resend account's own email.

## Database

- [ ] Push migration `20261007000000_require_verified_phone.sql` to the remote project (`supabase db push`, with the owner's go-ahead).

## Sign in with Google and Apple

- [ ] Apple Developer account ($99/year): App ID with Sign in with Apple, then Supabase Apple provider with the App ID in Client IDs.
- [ ] Google Cloud: Web, iOS and Android OAuth client IDs (Android needs the EAS and Play signing SHA-1s), then Supabase Google provider (Web client ID first, Skip nonce check on for iOS).
- [ ] Development build (EAS) for native Google sign in.
