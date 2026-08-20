import EventSource from 'react-native-sse';
import type { QueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../api/client';

/** Mirrors contracts/realtime-events.md's event name list — the type parameter to
 * EventSource<E> is what makes `addEventListener` accept these custom names below. */
type RealtimeEventName =
  | 'shift.assigned'
  | 'shift.changed'
  | 'shift.cancelled'
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

  const invalidate = (queryKey: unknown[]) => void queryClient.invalidateQueries({ queryKey });

  es.addEventListener('shift.assigned', () => invalidate(['shifts', 'list']));
  es.addEventListener('shift.changed', (event) => {
    invalidate(['shifts', 'list']);
    const data = event.data ? (JSON.parse(event.data) as { shiftId: string }) : null;
    if (data) invalidate(['shifts', 'detail', data.shiftId]);
  });
  es.addEventListener('shift.cancelled', () => invalidate(['shifts', 'list']));
  es.addEventListener('swap.status_changed', () => invalidate(['swap-requests', 'mine']));
  es.addEventListener('time_off.status_changed', () => invalidate(['time-off-requests', 'mine']));
  es.addEventListener('open_shift.posted', () => invalidate(['open-shifts']));
  es.addEventListener('open_shift.claimed', () => invalidate(['open-shift-claims']));
  es.addEventListener('open_shift.confirmed', () => invalidate(['open-shifts']));
  es.addEventListener('announcement.new', () => invalidate(['announcements', 'mine']));

  return () => es.close();
}
