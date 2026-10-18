// Deletes the CALLER's account, permanently (App Store requirement: in-app account deletion).
//   1. removes their files from Storage ({user_id}/... in each bucket)
//   2. deletes their auth user, which cascades to the profile and every row that references it
//      (photos, preferences, swipes, conversations, messages, blocks, reports they made, ...)
// The platform verifies the caller's JWT (verify_jwt = true) and withSupabase gives us their id.
// The admin client is only ever used with that id, never with input from the request body.
import { withSupabase } from 'npm:@supabase/server@1';

const BUCKETS = ['photos', 'verifications'];
const PAGE = 1000;

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const userId = ctx.userClaims?.id;
    if (!userId) return Response.json({ error: 'not_authenticated' }, { status: 401 });
    const admin = ctx.supabaseAdmin;

    for (const bucket of BUCKETS) {
      for (;;) {
        const { data, error } = await admin.storage.from(bucket).list(userId, { limit: PAGE });
        if (error) break; // bucket missing (e.g. verifications not created yet) or empty folder
        if (!data || data.length === 0) break;
        const { error: removeError } = await admin.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
        if (removeError) return Response.json({ error: 'storage_cleanup_failed' }, { status: 500 });
        if (data.length < PAGE) break;
      }
    }

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return Response.json({ error: 'delete_failed' }, { status: 500 });
    return Response.json({ deleted: true });
  }),
};
