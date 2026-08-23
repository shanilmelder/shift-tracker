import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type CallerRole = 'employee' | 'manager';

const SECURE_STORE_KEY = 'shift-tracker-session';

interface PersistedSession {
  accessToken: string;
  role: CallerRole;
  profileId: string;
  locationId: string;
  /** Signed in, but still on a manager-issued temporary password: the router sends them to the
   * change-password screen and the API refuses everything else until it is cleared. */
  mustChangePassword: boolean;
}

export interface SessionState {
  accessToken: string | null;
  role: CallerRole | null;
  profileId: string | null;
  locationId: string | null;
  mustChangePassword: boolean;
  /** True once `hydrate()` has resolved — the root layout waits on this before deciding where to route, so it never redirects to (auth) just because SecureStore hasn't been read yet. */
  hydrated: boolean;
  setSession: (session: PersistedSession) => void;
  /** Called once the user has chosen their own password, lifting the routing block. */
  clearPasswordChangeRequirement: () => void;
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
  mustChangePassword: false,
  hydrated: false,

  setSession: (session) => {
    set({ ...session, hydrated: true });
    SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(session)).catch(() => {
      // Best-effort persistence: if the secure store write fails, the session still works for
      // the current app run, it just won't survive a restart. Nothing to surface to the user.
    });
  },

  clearPasswordChangeRequirement: () => {
    set({ mustChangePassword: false });
    const { accessToken, role, profileId, locationId } = get();
    if (!accessToken || !role || !profileId || !locationId) return;
    // Re-persisted so a restart doesn't resurrect the requirement and trap the user on the
    // change screen with a password they have already replaced.
    SecureStore.setItemAsync(
      SECURE_STORE_KEY,
      JSON.stringify({ accessToken, role, profileId, locationId, mustChangePassword: false }),
    ).catch(() => {});
  },

  clearSession: () => {
    set({ accessToken: null, role: null, profileId: null, locationId: null, mustChangePassword: false, hydrated: true });
    SecureStore.deleteItemAsync(SECURE_STORE_KEY).catch(() => {});
  },

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await SecureStore.getItemAsync(SECURE_STORE_KEY);
      if (raw) {
        const session = JSON.parse(raw) as PersistedSession;
        // Defaulted rather than trusted: a session persisted before this field existed has no
        // value for it, and `undefined` would read as "no change needed".
        set({ ...session, mustChangePassword: session.mustChangePassword ?? false, hydrated: true });
        return;
      }
    } catch {
      // Corrupt or inaccessible entry — fall through to an unauthenticated state rather than
      // throwing during app boot.
    }
    set({ hydrated: true });
  },
}));
