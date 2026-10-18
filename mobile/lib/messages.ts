import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { signPhotoUrls } from '@/lib/photos';
import { supabase } from '@/lib/supabase';
import type { Enums, Tables } from '@/types/database';

export const MESSAGE_MAX = 2000; // mirrors the messages.body check constraint
export const MESSAGE_PAGE_SIZE = 30;

export type Message = Pick<Tables<'messages'>, 'id' | 'sender_id' | 'body' | 'created_at' | 'read_at'>;

export type InboxItem = {
  conversationId: string;
  otherUserId: string;
  otherName: string;
  otherVerified: boolean;
  otherPhotoPath: string | null;
  otherPhotoUrl: string | null; // thumbnail
  origin: Enums<'convo_origin_t'>;
  lastMessage: string | null;
  lastMessageAt: string;
  unread: number;
};

// Conversations, newest activity first. Blocked people are already left out by the database.
export async function fetchInbox(): Promise<InboxItem[]> {
  const { data, error } = await supabase.rpc('get_my_conversations');
  if (error) throw error;
  const urls = await signPhotoUrls(
    data.map((c) => c.other_photo_path).filter((p): p is string => !!p),
    'thumb',
  );
  return data.map((c) => ({
    conversationId: c.conversation_id,
    otherUserId: c.other_user_id,
    otherName: c.other_name,
    otherVerified: c.other_verified,
    otherPhotoPath: c.other_photo_path,
    otherPhotoUrl: c.other_photo_path ? (urls.get(c.other_photo_path) ?? null) : null,
    origin: c.origin,
    lastMessage: c.last_message,
    lastMessageAt: c.last_message_at,
    unread: c.unread_count,
  }));
}

// One page of messages, newest first. Pass the oldest loaded time to get the page before it.
export async function fetchMessages(conversationId: string, before?: string): Promise<Message[]> {
  let q = supabase
    .from('messages')
    .select('id, sender_id, body, created_at, read_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);
  if (before) q = q.lt('created_at', before);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// The app picks the id so the live echo of its own message is recognised and not shown twice.
export async function sendMessage(id: string, conversationId: string, senderId: string, body: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ id, conversation_id: conversationId, sender_id: senderId, body })
    .select('id, sender_id, body, created_at, read_at')
    .single();
  if (error) throw error;
  return data;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', { p_conversation: conversationId });
  if (error) throw error;
}

type MessageChange = RealtimePostgresChangesPayload<Tables<'messages'>>;

// Live new messages and read receipts. Row level security decides what each person receives,
// so only the two participants of a conversation ever get its messages.
// onReady fires once the channel is connected (and after a reconnect). Realtime can take a few
// seconds to start delivering after that, so callers refetch then to catch anything missed.
export function subscribeToMessages(
  channelName: string,
  onChange: (change: MessageChange) => void,
  conversationId?: string,
  onReady?: () => void,
): () => void {
  const filter = conversationId ? `conversation_id=eq.${conversationId}` : undefined;
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter }, onChange)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter }, onChange)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') onReady?.();
    });
  return () => {
    supabase.removeChannel(channel);
  };
}

// "14:05", "Yesterday", "Mon", or "12 Oct" for the inbox list.
export function shortTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (d.getTime() >= startOfToday) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (d.getTime() >= startOfToday - day) return 'Yesterday';
  if (d.getTime() >= startOfToday - 6 * day) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
