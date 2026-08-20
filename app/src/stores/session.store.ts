import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type CallerRole = 'employee' | 'manager';

const SECURE_STORE_KEY = 'shift-tracker-session';

interface PersistedSession {
  accessToken: string;
  role: CallerRole;
  profileId: string;
  locationId: string;
}

export interface SessionState {
  accessToken: string | null;
  role: CallerRole | null;
  profileId: string | null;
  locationId: string | null;
  /** True once `hydrate()` has resolved — the root layout waits on this before deciding where to route, so it never redirects to (auth) just because SecureStore hasn't been read yet. */
  hydrated: boolean;
  setSession: (session: PersistedSession) => void;
  clearSession: () => void;
  hydrate: () => Promise<void>;
}

/**
 * Session persistence uses `expo-secure-store` (Keychain on iOS, Keystore-backed
 * EncryptedSharedPreferences on Android) rather than AsyncStorage, since an access token is a
 * credential — it belongs in the platform's secure storage, not plain-text storage that's
 * also used for arbitrary cache data (constitution: Security First applies to what the client
 * holds locally too, not only to server-side checks).
 */
export const useSessionStore = create<SessionState>((set, get) => ({
  accessToken: null,
  role: null,
  profileId: null,
  locationId: null,
  hydrated: false,

  setSession: (session) => {
    set({ ...session, hydrated: true });
    SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(session)).catch(() => {
      // Best-effort persistence: if the secure store write fails, the session still works for
      // the current app run, it just won't survive a restart. Nothing to surface to the user.
    });
  },

  clearSession: () => {
    set({ accessToken: null, role: null, profileId: null, locationId: null, hydrated: true });
    SecureStore.deleteItemAsync(SECURE_STORE_KEY).catch(() => {});
  },

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await SecureStore.getItemAsync(SECURE_STORE_KEY);
      if (raw) {
        const session = JSON.parse(raw) as PersistedSession;
        set({ ...session, hydrated: true });
        return;
      }
    } catch {
      // Corrupt or inaccessible entry — fall through to an unauthenticated state rather than
      // throwing during app boot.
    }
    set({ hydrated: true });
  },
}));
