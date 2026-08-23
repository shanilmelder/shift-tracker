import EventSource from 'react-native-sse';
import type { QueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../api/client';
import { shiftsChanged, swapsChanged, timeOffChanged, openShiftsChanged } from '../queries/invalidation';

/** Mirrors contracts/realtime-events.md's event name list — the type parameter to
 * EventSource<E> is what makes `addEventListener` accept these custom names below. */
type RealtimeEventName =
  | 'shift.assigned'
  | 'shift.changed'
  | 'shift.cancelled'
  | 'shift.deleted'
  | 'swap.status_changed'
  | 'time_off.status_changed'
  | 'open_shift.posted'
  | 'open_shift.claimed'
  | 'open_shift.confirmed'
  | 'announcement.new';

/**
 * Per contracts/realtime-events.md: connects to the API's SSE stream and, on each event,
 * invalidates the matching TanStack Query cache key so the affected screen re-fetches via its
 * normal REST call — there is exactly one code path that turns "server data" into "what's on
 * screen," whether the app just launched or just received a live event (no separate
 * realtime-only deserialization path to keep in sync with the REST responses).
 *
 * Uses `react-native-sse` rather than the DOM `EventSource` (not available in React Native)
 * or a hand-rolled `fetch` stream reader (React Native's fetch doesn't reliably support
 * streaming response bodies across all runtimes) — a well-supported, purpose-built library
 * over custom infrastructure, per the constitution's Simplicity Over Cleverness principle.
 */
export function connectRealtimeStream(accessToken: string, queryClient: QueryClient): () => void {
  const es = new EventSource<RealtimeEventName>(`${API_BASE_URL}/v1/realtime/stream`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Routed through the same helpers the mutations use (src/queries/invalidation.ts), so a
  // change arriving over the stream refreshes exactly what a locally-made one would. These
  // used to name one narrow key each — 'swap.status_changed' refreshed only the employee's own
  // swap list, for instance, leaving the manager's queue and the dashboard stale.
  es.addEventListener('shift.assigned', () => shiftsChanged(queryClient));
  es.addEventListener('shift.changed', () => shiftsChanged(queryClient));
  es.addEventListener('shift.cancelled', () => shiftsChanged(queryClient));
  es.addEventListener('shift.deleted', () => shiftsChanged(queryClient));
  es.addEventListener('swap.status_changed', () => swapsChanged(queryClient));
  es.addEventListener('time_off.status_changed', () => timeOffChanged(queryClient));
  es.addEventListener('open_shift.posted', () => openShiftsChanged(queryClient));
  es.addEventListener('open_shift.claimed', () => openShiftsChanged(queryClient));
  es.addEventListener('open_shift.confirmed', () => openShiftsChanged(queryClient));
  es.addEventListener('announcement.new', () => void queryClient.invalidateQueries({ queryKey: ['announcements'] }));

  return () => es.close();
}
