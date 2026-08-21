import type { FastifyReply } from 'fastify';
import type { CallerProfile } from '../types.js';

/**
 * Per contracts/realtime-events.md (research.md #1): the API relays filtered Supabase
 * Realtime changes to each connected user over a plain SSE stream — the Expo app never
 * subscribes to Supabase Realtime directly. This is a minimal, correct implementation: one
 * in-memory registry of open connections per profile, and a `publish` function other services
 * call after a relevant write (rather than a live Supabase Realtime subscription driving it,
 * which is a documented follow-up — see the Phase 11 checkpoint summary for why that's
 * flagged rather than silently built out further here).
 */
type SseClient = { reply: FastifyReply; profileId: string };
const clients = new Set<SseClient>();

export function registerSseClient(caller: CallerProfile, reply: FastifyReply): () => void {
  const client: SseClient = { reply, profileId: caller.id };
  clients.add(client);
  return () => clients.delete(client);
}

export type RealtimeEventName =
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

/** Publishes one event to specific recipients only — never broadcast to every connection. */
export function publishToProfiles(profileIds: string[], event: RealtimeEventName, data: Record<string, unknown>): void {
  const targetIds = new Set(profileIds);
  for (const client of clients) {
    if (!targetIds.has(client.profileId)) continue;
    client.reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}
