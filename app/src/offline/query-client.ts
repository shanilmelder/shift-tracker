import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import NetInfo from '@react-native-community/netinfo';

/**
 * Implements the constitution's Offline Resilience principle for schedule viewing and
 * clock-in/out (research.md #6): TanStack Query is the single source of truth for server
 * state, so its own persistence + offline-mutation support is reused rather than building a
 * bespoke sync engine (Simplicity Over Cleverness).
 *
 * - Reads: the last-synced cache persists to AsyncStorage, so a just-opened, offline app still
 *   renders the last-known schedule instead of a blank/error screen.
 * - Writes: mutations made while offline queue via TanStack Query's `MutationCache` and replay
 *   in original order once `onlineManager` reports connectivity restored. Each mutation that
 *   needs it (clock-in/out) carries a client-generated idempotency key (see
 *   `src/offline/idempotency.ts`) so a retried mutation is never double-applied server-side.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24, // keep a day of cache for offline viewing
      retry: 2,
    },
    mutations: {
      retry: 3,
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'shift-tracker-query-cache',
});

/**
 * Wires TanStack Query's online/offline detection to the device's actual network state, so
 * queued mutations replay as soon as connectivity returns (FR-040) rather than only on the
 * next manual refresh. `onlineManager.setEventListener` itself manages the lifecycle of the
 * listener it's given (including tearing down a previous one if called again) — it does not
 * return an unsubscribe function to its caller, so this is meant to be called once for the
 * app's lifetime, not per-effect-cleanup.
 */
export function registerOnlineManager(): void {
  onlineManager.setEventListener((setOnline) => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected));
    });
    return unsubscribe;
  });
}
