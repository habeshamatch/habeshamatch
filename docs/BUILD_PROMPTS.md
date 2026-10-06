# HabeshaMatch: build prompts for Claude Code

Paste these one at a time, in order. Do not start the next prompt until the current step works on your phone (via Expo Go or a development build) and is committed. If something breaks, tell Claude Code exactly what you see before moving on.

Each prompt assumes Claude Code has read `CLAUDE.md`.

---

## Phase 0: Foundation

### Prompt 0.1: Scaffold the app
```
Read CLAUDE.md. Create the Expo app in mobile/ with TypeScript, expo-router, and the folder structure from CLAUDE.md. Add mobile/lib/theme.ts with the design tokens, load Playfair Display and Inter fonts, and build a simple themed welcome screen so I can confirm it runs on my phone with Expo Go. Explain how to run it.
```

### Prompt 0.2: Database
```
Link this repo to my Supabase project. Apply the migration in supabase/migrations to my LOCAL Supabase first, run supabase/tests/rules_smoke_test.sql and show me the results, then reset the local database. Then push the migration to the remote project, enable Realtime on the messages table, and generate mobile/types/database.ts. Create mobile/lib/supabase.ts with the client using expo-secure-store for session storage.
```

### Prompt 0.3: Seed data
```
Create supabase/seed.sql with 40 realistic fake profiles (mixed genders, ages 22-45, Eritrean and Ethiopian origin, residences across CA, US, GB, DE, SE, AU, ET, ER, UG, KE), with preferences, approved placeholder photos, and some swipes. Local development only. Make sure local-tier residents have matching phone prefixes.
```

---

## Phase 1: Auth and onboarding

### Prompt 1.1: Phone auth
```
Build the phone sign-in flow: welcome screen, phone entry with country picker, OTP entry with resend timer. Use Supabase phone auth. Offer "Send via WhatsApp" as an alternative channel if my Supabase/Twilio setup supports it; check the current Supabase docs before implementing. Handle errors with friendly messages.
```

### Prompt 1.2: Profile wizard
```
Build onboarding as a step-by-step wizard: (1) name, date of birth, gender; (2) origin, height (cm or ft/in input, stored in cm), religion, languages, relationship intent; (3) current city, permanent residence country, open to relocating, open to long distance; (4) bio. Show a clear explanation on the residence step that it affects pricing and can only change every 30 days. Map database errors (must_be_18, local_residence_requires_local_phone) to friendly messages via lib/errors.ts.
```

### Prompt 1.3: Photos
```
Build photo upload: up to 6 photos, reorder, delete. Compress on device to max 1080px at ~70% JPEG before uploading to a private Supabase Storage bucket named "photos" under {user_id}/. Write storage policies so users can only write to their own folder and can read approved photos of other users. Show a "pending review" badge on photos not yet approved. Require at least one photo to finish onboarding.
```

### Prompt 1.4: Preferences
```
Build preference setup: seeking gender and age range (always required), then for each optional attribute (religion, origin, languages, relationship intent, height range, diaspora or home-based, countries) let the user pick values and mark it as "Must have" or "Nice to have". Save to preference_core and preference_items. Make it editable later from the profile tab.
```

---

## Phase 2: Discovery and messaging

### Prompt 2.1: Meets My Criteria
```
Build the Discover tab using get_meets_my_criteria with infinite scroll. Profile cards show primary photo thumbnail, name, age, city, blue tick if verified, and match percentage. Tapping opens profile/[id] using get_profile. Include a helpful empty state that suggests loosening "Must have" preferences, with a button to the preferences screen.
```

### Prompt 2.2: Starting chats and limits
```
On the profile screen, add a Message button that calls start_conversation. Show the user's remaining new chats today from get_my_limits (free users see "3 of 5 left", local and premium see nothing). On daily_new_chat_limit_reached show a sheet explaining the limit with an upgrade option. On premium_required open the paywall.
```

### Prompt 2.3: Messaging
```
Build the Messages tab with get_my_conversations and the chat screen. Use Supabase Realtime to receive new messages live, send via insert into messages, mark as read on open with mark_conversation_read, and paginate older messages. Text only, 2000 characters max. Keep it fast on slow connections.
```

### Prompt 2.4: Block and report
```
Add a menu on every profile and chat with Block and Report. Report offers categories (fake profile, scam, harassment, spam, inappropriate photos, underage, other) plus optional details. Blocking removes the person everywhere immediately. Add a blocked users list in settings with unblock.
```

---

## Phase 3: Swipe section

### Prompt 3.1: Swipe deck
```
Build the Swipe tab: a card stack from get_swipe_deck with photo-first cards showing name, age, and city. Swipe right or left with gestures and buttons, calling record_swipe. On a match, show a celebration screen with "Send a message" that opens the chat. Show remaining swipes from get_my_limits and a friendly "come back tomorrow" state when the limit is reached.
```

### Prompt 3.2: Likes
```
Add a "Liked you" entry point showing get_likes_received_count. Free and local users see blurred placeholders and the count, tapping opens the paywall. Premium users see the full list from get_likes_received and can swipe on them.
```

---

## Phase 4: Premium

### Prompt 4.1: RevenueCat
```
Integrate RevenueCat (react-native-purchases) with an entitlement called "premium" and three packages (monthly, 3 months, 6 months). Build the paywall screen showing the premium benefits from CLAUDE.md. Do not show the paywall to local-tier users unless they hit a premium feature. Create a Supabase edge function revenuecat-webhook that verifies the webhook authorization header and updates profiles.is_premium and premium_expires_at using the service role. This requires a development build, not Expo Go; walk me through it.
```

### Prompt 4.2: Premium features
```
Build the Suggested section on the Discover tab (a second tab or segment) using get_suggested, with a short explanation: "These people are looking for someone like you, but don't match all your must-haves." Add undo last swipe for premium. Build daily picks: an edge function generate-daily-picks scheduled once a day that writes 5 picks per premium user into daily_picks (best soft score among mutual matches not yet messaged), and show them at the top of the Messages tab.
```

---

## Phase 5: Verification, notifications, account

### Prompt 5.1: Photo verification
```
Build the blue tick flow: user takes a live selfie (camera only, not gallery) mimicking a random pose shown on screen. Upload to a private "verifications" bucket and insert a verification_requests row. Show status (pending, approved, rejected). Free for everyone.
```

### Prompt 5.2: Push notifications
```
Set up Expo Notifications. Save push tokens to push_tokens. Create an edge function send-push triggered by database webhooks for new messages, new matches, and daily picks. Respect a notifications on/off setting.
```

### Prompt 5.3: Settings and account
```
Build the Profile tab settings: edit profile, edit preferences, blocked users, notification settings, log out, log out of all devices, privacy policy and terms links, and Delete account. Delete account calls an edge function delete-account that removes the user's storage files and deletes the auth user (cascading all rows). Confirm twice before deleting.
```

---

## Phase 6: Admin panel

### Prompt 6.1: Admin app
```
Create a Next.js app in admin/ using Supabase auth (email login) and the admins table for access. Pages: Dashboard (total and active users, free/local/premium split, signups per day/week/month, messages per day), Users (search, filter, view profile, suspend, ban, delete with reason, logged to moderation_actions), Reports queue (filter by status and category, view both users and recent messages, warn/suspend/ban/dismiss), Photo moderation queue (approve/reject pending photos), Verification queue (compare selfie with profile photos, approve/reject, sets is_photo_verified). Server-side actions only use the service role key; never expose it to the browser.
```

---

## Phase 7: Pre-launch

### Prompt 7.1: Hardening
```
Review the whole codebase for: secrets in the app bundle, missing error handling, screens without loading or empty states, images not compressed, queries without pagination, and any product rule implemented only on the client. Give me a list, then fix them in small commits.
```

### Prompt 7.2: Store readiness
```
Prepare for App Store and Google Play submission: app icons and splash in the brand colours, EAS build profiles for development, preview and production, privacy policy and terms pages (I will provide or approve the text), the data safety and privacy questionnaire answers based on what we collect, and a checklist of Apple's dating app requirements (report, block, moderation, account deletion, 18+). Walk me through submitting with EAS Submit.
```
