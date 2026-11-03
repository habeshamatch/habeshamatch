import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { getCalendars } from 'expo-localization';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { secureStorage } from '@/lib/secureStorage';
import { supabase } from '@/lib/supabase';

// Push notifications. The database decides who gets what (blocks, settings) and sends through
// the send-push edge function; the app only registers this phone, asks permission, and opens
// the right screen when a notification is tapped.
//   data.type: 'message' | 'match' (with conversation_id) | 'picks'

const TOKEN_KEY = 'push_token';
const ASKED_KEY = 'push_asked';

// The chat on screen right now: its new messages need no banner, they appear live.
let openChat: string | null = null;
export const setOpenChat = (conversationId: string | null) => {
  openChat = conversationId;
};

Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    const data = n.request.content.data as { type?: string; conversation_id?: string } | undefined;
    const inThatChat = data?.type === 'message' && !!data.conversation_id && data.conversation_id === openChat;
    return { shouldShowBanner: !inThatChat, shouldShowList: !inThatChat, shouldPlaySound: !inThatChat, shouldSetBadge: false };
  },
});

export type PushStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export async function pushStatus(): Promise<PushStatus> {
  if (!Device.isDevice) return 'unavailable';
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

// Whether we already showed our own "turn on notifications" prompt (so we ask only once).
export async function alreadyAsked(): Promise<boolean> {
  try {
    return (await secureStorage.getItem(ASKED_KEY)) === '1';
  } catch {
    return false;
  }
}
export async function markAsked(): Promise<void> {
  try {
    await secureStorage.setItem(ASKED_KEY, '1');
  } catch {
    // ignore
  }
}

// Registers this phone for the signed-in member. With `ask`, shows the system permission prompt
// if it has not been answered yet. Safe to call on every launch (the token can change).
export async function registerForPush(ask: boolean): Promise<PushStatus> {
  let status = await pushStatus();
  if (status === 'unavailable') return status;
  if (status === 'undetermined' && ask) {
    const res = await Notifications.requestPermissionsAsync();
    status = res.status === 'granted' ? 'granted' : res.status === 'denied' ? 'denied' : 'undetermined';
  }
  if (status !== 'granted') return status;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    p_time_zone: getCalendars()[0]?.timeZone ?? undefined, // for "your picks are ready" at 9 am local
  });
  if (error) throw error;
  try {
    await secureStorage.setItem(TOKEN_KEY, token);
  } catch {
    // only needed to unregister on sign out
  }
  return status;
}

// On sign out: this phone stops getting the member's notifications. Must run while still signed in.
export async function unregisterPush(): Promise<void> {
  try {
    const token = await secureStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await supabase.rpc('unregister_push_token', { p_token: token });
    await secureStorage.removeItem(TOKEN_KEY);
  } catch {
    // Never block signing out. A leftover token moves to whoever signs in on this phone next.
  }
}

// Where a tapped notification should take the member.
export function routeFor(data: unknown): string | null {
  const d = data as { type?: string; conversation_id?: string } | undefined;
  if ((d?.type === 'message' || d?.type === 'match') && d.conversation_id) return `/chat/${d.conversation_id}`;
  if (d?.type === 'picks') return '/for-you';
  return null;
}
