import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { useFonts } from 'expo-font';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { queryClient, asyncStoragePersister, registerOnlineManager } from '../src/offline/query-client';
import { useAppStore } from '../src/stores/app.store';
import { useSessionStore } from '../src/stores/session.store';
import { registerForPushNotifications } from '../src/notifications/register';
import { connectRealtimeStream } from '../src/offline/realtime-client';

/**
 * Root layout: wires the offline-aware query client, tracks connectivity into the
 * sync-status store, and enforces role-based routing — an unauthenticated caller is always
 * redirected to (auth), and an authenticated one is redirected out of (auth) into whichever
 * of (employee)/(manager) matches their role (constitution: Two-Role Clarity — the router
 * itself, not just each screen, understands there are exactly two roles).
 */
export default function RootLayout(): React.JSX.Element {
  const router = useRouter();
  const segments = useSegments();
  const { accessToken, role, hydrated, hydrate } = useSessionStore();
  const setSyncStatus = useAppStore((state) => state.setSyncStatus);
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    // Restores a persisted session from expo-secure-store (see session.store.ts) before the
    // first routing decision is made, so a returning user isn't bounced to (auth) just
    // because storage hasn't been read yet.
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    // Registers the online/offline listener with TanStack Query's onlineManager once for the
    // app's lifetime (see query-client.ts — it manages its own listener lifecycle internally
    // and doesn't hand back an unsubscribe function).
    registerOnlineManager();
    const unsubscribeConnectivity = NetInfo.addEventListener((state) => {
      setSyncStatus(state.isConnected ? 'online' : 'offline');
    });
    return unsubscribeConnectivity;
  }, [setSyncStatus]);

  useEffect(() => {
    if (!hydrated) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!accessToken && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }
    if (accessToken && inAuthGroup) {
      router.replace(role === 'manager' ? '/(manager)/dashboard' : '/(employee)/schedule');
    }
  }, [hydrated, accessToken, role, segments, router]);

  useEffect(() => {
    if (!accessToken) return;
    registerForPushNotifications().catch(() => {
      // Non-fatal: the user simply won't get push notifications this session. Nothing to
      // surface — permission may have been declined, which is a valid choice.
    });
    const unsubscribeRealtime = connectRealtimeStream(accessToken, queryClient);
    return unsubscribeRealtime;
  }, [accessToken]);

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
        {!hydrated || !fontsLoaded ? null : <Slot />}
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
