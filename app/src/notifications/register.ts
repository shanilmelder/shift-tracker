import * as Notifications from 'expo-notifications';
import { apiRequest } from '../api/client';

/**
 * FR-022: registers this device's Expo push token with the API. Called once the session is
 * established (see app/_layout.tsx) — the API is the only thing that ever calls the Expo push
 * service; this just tells it which token belongs to which signed-in profile.
 */
export async function registerForPushNotifications(): Promise<void> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return; // user declined — nothing to register

  const tokenResponse = await Notifications.getExpoPushTokenAsync();
  await apiRequest<void>('/devices', { method: 'POST', body: { expoPushToken: tokenResponse.data } });
}
