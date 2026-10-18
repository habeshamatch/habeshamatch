# Admin panel

Next.js app in `admin/` for moderators. Same Supabase project as the app. Only accounts listed in
the `admins` table can use it; every page and action checks this on the server, and every decision
is logged in `moderation_actions`.

| Page | What it does |
|---|---|
| Dashboard | Members, active members, tier split, sign-ups and messages per day, queue sizes |
| New members | Every new member: compare the live selfie (and the pose they were asked for) with their photos. Approve gives the blue tick and approves their photos (at least 2 good ones needed); Reject needs a reason the member sees, and you can mark individual photos as the problem. Nobody can see or meet a member until approved |
| New photos | Photos that already approved members add later; new members' photos are reviewed under New members |
| Reports | Open reports by category; see both members and their messages; dismiss, warn, suspend or ban |
| Users | Search by name, email, phone or id; profile, photos, reports, history; warn, suspend, ban, reactivate, delete |

## Run it on your Mac

1. Local Supabase running (`supabase start`).
2. `admin/.env.local` exists (see `admin/README.md`).
3. Make yourself an admin locally (once after each `supabase db reset`):
   `node supabase/scripts/make-admin.mjs matchhabesha@gmail.com`
4. `cd admin && npm run dev`, open http://localhost:3000, sign in. Local codes: http://127.0.0.1:54324

## Add an admin on the LIVE project

1. Supabase dashboard > Authentication > Users > **Add user** > **Create new user**: enter the email,
   tick **Auto Confirm User**, leave the password empty. (Skip if the email already has an account.)
2. Add it to the admins table (SQL Editor, or ask Claude Code, which asks first):
   ```sql
   insert into admins (user_id)
   select id from auth.users where email = 'matchhabesha@gmail.com'
   on conflict do nothing;
   ```
3. To remove an admin: `delete from admins where user_id = (select id from auth.users where email = '...');`

## Put it online (Vercel)

1. vercel.com > **Continue with GitHub** (the account that owns this repo). Turn on two-factor login
   for GitHub and Vercel: they control the admin panel.
2. **Add New > Project**, pick `habeshamatch`, set **Root Directory** to `admin`, Framework Next.js.
3. **Environment Variables** (Production):
   | Name | Value | Where to find it |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://ysxbjtkkumdhofzlysdw.supabase.co` | Supabase > Project Settings > API |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Supabase > Project Settings > API Keys |
   | `SUPABASE_SECRET_KEY` | `sb_secret_...` | Supabase > Project Settings > API Keys > Secret keys. **Paste it only into Vercel.** Never in code, chat, or the mobile app. |
4. **Deploy.** Vercel gives you an address like `habeshamatch-admin.vercel.app`.
5. Optional own address: Vercel project > Settings > Domains > add `admin.habeshamatch.app`, then add the
   DNS record Vercel shows at your domain provider.
6. Sign in with your admin email. The code arrives from hello@habeshamatch.app.

The admin panel never prerenders or caches pages (it is per admin and always live), and search
engines are told not to index it.
