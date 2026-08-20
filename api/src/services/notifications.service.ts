import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { supabase } from '../data/supabase-client.js';
import { env } from '../config/env.js';

const expo = new Expo({ accessToken: env.EXPO_PUSH_ACCESS_TOKEN });

/**
 * FR-022: the API is the only thing that ever calls the Expo push API — devices register
 * their token via POST /v1/devices, and every domain event (shift assigned/changed, swap
 * approved/denied, time-off approved/denied) plus the scheduled reminder job triggers a push
 * through this one function, so there is exactly one push code path to test/maintain.
 */
export async function sendPushToProfile(profileId: string, title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  const { data: tokens, error } = await supabase.from('device_push_tokens').select('expo_push_token').eq('profile_id', profileId);
  if (error) throw error;

  const messages: ExpoPushMessage[] = (tokens ?? [])
    .map((row) => row.expo_push_token as string)
    .filter((token) => Expo.isExpoPushToken(token))
    .map((token) => ({ to: token, sound: 'default', title, body, data }));

  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    await expo.sendPushNotificationsAsync(chunk);
  }
}

export async function sendPushToProfiles(profileIds: string[], title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  await Promise.all(profileIds.map((id) => sendPushToProfile(id, title, body, data)));
}
