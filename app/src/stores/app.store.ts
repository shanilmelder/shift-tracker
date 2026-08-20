import { create } from 'zustand';

export type SyncStatus = 'online' | 'offline' | 'syncing';

export interface AppState {
  syncStatus: SyncStatus;
  pendingMutationCount: number;
  setSyncStatus: (status: SyncStatus) => void;
  setPendingMutationCount: (count: number) => void;
}

/**
 * Cross-cutting local UI state that changes independently of any server data — most notably
 * the sync-status banner shown while offline mutations (clock-in/out, etc.) are queued. Kept
 * in Zustand rather than React Context per research.md #5, since this value can change
 * frequently (ticking during a queue flush) and Context would re-render a much larger subtree
 * than necessary on every change.
 */
export const useAppStore = create<AppState>((set) => ({
  syncStatus: 'online',
  pendingMutationCount: 0,
  setSyncStatus: (status) => set({ syncStatus: status }),
  setPendingMutationCount: (count) => set({ pendingMutationCount: count }),
}));
