/**
 * Generates a client-side idempotency key for mutations that must never be double-applied if
 * an offline-queued request is retried (clock-in/out — see time_entries.idempotency_key in
 * data-model.md). Uses `expo-crypto`'s UUID rather than `Math.random()`-based ids, since
 * collision resistance matters here (a collision would silently merge two distinct clock
 * events).
 */
import { randomUUID } from 'expo-crypto';

export function generateIdempotencyKey(): string {
  return randomUUID();
}
