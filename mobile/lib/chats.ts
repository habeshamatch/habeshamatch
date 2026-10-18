import { supabase } from '@/lib/supabase';
import type { Enums } from '@/types/database';

export type MyLimits = {
  tier: Enums<'tier_t'>;
  newChatsUsed: number;
  newChatsLimit: number;
  showChatLimit: boolean; // only free (abroad) members see their daily count
  swipesUsed: number;
  swipesLimit: number;
};

// Today's usage and allowances. Limits live in app_config; never hardcode them in the app.
export async function fetchMyLimits(): Promise<MyLimits> {
  const { data, error } = await supabase.rpc('get_my_limits');
  if (error) throw error;
  const d = data as Record<string, unknown>;
  return {
    tier: d.tier as Enums<'tier_t'>,
    newChatsUsed: Number(d.new_chats_used),
    newChatsLimit: Number(d.new_chats_limit),
    showChatLimit: d.show_chat_limit === true,
    swipesUsed: Number(d.swipes_used),
    swipesLimit: Number(d.swipes_limit),
  };
}

// Starts a conversation, or returns the existing one. The database enforces every rule
// (their must-haves, blocks, premium for Suggested, the daily limit) and raises stable codes.
export async function startConversation(targetId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_conversation', { p_target: targetId });
  if (error) throw error;
  return data;
}

// The existing conversation with someone, if any (opening it never uses a new chat).
export async function findConversationWith(myId: string, otherId: string): Promise<string | null> {
  const [a, b] = myId < otherId ? [myId, otherId] : [otherId, myId];
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_a', a)
    .eq('user_b', b)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

// Daily limits reset at midnight in the database's time zone (UTC). Shown in the user's own time.
export function nextLimitReset(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}
