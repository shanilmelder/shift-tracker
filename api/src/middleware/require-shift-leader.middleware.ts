import type { FastifyReply, FastifyRequest } from 'fastify';
import { supabase } from '../data/supabase-client.js';
import '../types.js';

/**
 * Checks whether the caller is the designated `is_leader=true` shift_assignments row for a
 * given shift — the scoped, temporary permission described in FR-008/FR-009: a shift leader's
 * underlying account is a normal employee account; this permission applies only while they
 * remain the designated leader on that specific shift (FR-013), so it is always re-checked
 * live against the database, never cached on the caller's session/token.
 */
export async function isShiftLeaderOf(employeeId: string, shiftId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('shift_assignments')
    .select('id')
    .eq('shift_id', shiftId)
    .eq('employee_id', employeeId)
    .eq('is_leader', true)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data !== null;
}

/**
 * Route param must be named `id` and identify the shift (or, for nested routes, resolve to
 * one — callers with a differently-shaped param should extract the shift id first and call
 * `isShiftLeaderOf` directly instead of this preHandler).
 *
 * Rejects anyone who is not the current leader of that exact shift (FR-012) — leading a
 * different shift does not count.
 */
export async function requireShiftLeader(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.caller) {
    await reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Missing caller context' } });
    return;
  }
  const shiftId = (request.params as { id?: string }).id;
  if (!shiftId) {
    await reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Missing shift id' } });
    return;
  }
  const isLeader = await isShiftLeaderOf(request.caller.id, shiftId);
  if (!isLeader) {
    await reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'You do not lead this shift' } });
  }
}

/**
 * The common combined gate used by staffing edits and swap decisions: a manager at the
 * shift's own location, OR the shift's current designated leader — either is authorized
 * (FR-009, FR-011); anyone else is rejected.
 */
export function requireManagerOrShiftLeader(shiftId: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.caller) {
      await reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Missing caller context' } });
      return;
    }
    if (request.caller.role === 'manager') {
      const { data: shift, error } = await supabase.from('shifts').select('location_id').eq('id', shiftId).maybeSingle();
      if (error) throw error;
      if (shift?.location_id === request.caller.locationId) {
        return;
      }
    }
    const isLeader = await isShiftLeaderOf(request.caller.id, shiftId);
    if (!isLeader) {
      await reply
        .code(403)
        .send({ error: { code: 'FORBIDDEN', message: 'Requires the shift\'s manager or its designated shift leader' } });
    }
  };
}
