# HabeshaMatch: setup and MCP reference

A step-by-step walkthrough of creating these accounts comes separately. This file is the checklist and reference.

## Accounts

| Service | Needed for | When | Cost |
|---|---|---|---|
| GitHub | Code repository | Day 1 | Free |
| Supabase | Database, auth, chat, storage | Day 1 | Free in development, Pro ($25/month) before launch |
| Expo (EAS) | Builds and store submission | Day 1 | Free tier |
| Twilio | SMS and WhatsApp OTP | Phase 1 | Pay per message |
| RevenueCat | Subscriptions | Phase 4 | Free until meaningful revenue, then a small percentage |
| Apple Developer | iOS builds with payments, App Store | Phase 4 | $99/year |
| Google Play Console | Android, Play Store | Phase 4 | $25 one time |
| Vercel | Admin panel hosting | Phase 6 | Free tier |

## Local tools

- Node.js (LTS)
- Git
- Claude Code
- Supabase CLI
- Docker Desktop (runs local Supabase)
- EAS CLI (`npm install -g eas-cli`)
- Expo Go app on your phone

## MCP servers for Claude Code

| Server | Why |
|---|---|
| Supabase | Lets Claude Code inspect tables, run SQL, read logs and manage edge functions on your project |
| GitHub | Issues, pull requests, repository management (Claude Code can also use the `gh` CLI directly) |
| Context7 | Pulls current library documentation (Expo, Supabase, RevenueCat) so code matches today's APIs |

Install commands change over time; check each provider's current Claude Code instructions. Typical form:

```
claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<your-project-ref>"
claude mcp add --transport http context7 https://mcp.context7.com/mcp
```

Safety: connect the Supabase MCP to your development project only. Never point it at production with write access.

## Environment variables

Mobile app (`mobile/.env`, public values only):
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_REVENUECAT_IOS_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=
```

Supabase secrets (`supabase secrets set ...`, never in the app):
```
REVENUECAT_WEBHOOK_AUTH=
EXPO_ACCESS_TOKEN=
```
Twilio credentials are entered in the Supabase dashboard under Auth providers.

Admin panel (Vercel environment variables, server side only):
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Add `.env` to `.gitignore` before the first commit.
