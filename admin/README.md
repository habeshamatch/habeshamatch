# HabeshaMatch admin panel

Next.js app for moderators: photo approvals, reports, users, verifications and a dashboard.
Same Supabase project as the mobile app. See CLAUDE.md and docs/ADMIN.md.

## Run locally

```
cd ~/Projects/habeshamatch/admin
npm run dev
```

Open http://localhost:3000 and sign in with an admin email (local codes arrive at
http://127.0.0.1:54324). Make an email an admin locally with
`node supabase/scripts/make-admin.mjs you@example.com`.

`admin/.env.local` (git ignored) points at the local Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<from `supabase status`>
SUPABASE_SECRET_KEY=<from `supabase status`>   # server only, never in the browser or the app
```
