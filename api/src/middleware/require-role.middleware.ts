import type { FastifyReply, FastifyRequest } from 'fastify';
import '../types.js';

/**
 * Manager-only gate. Must run AFTER authMiddleware (relies on `request.caller`). Rejects with
 * 403 rather than 404 so the client can distinguish "you're not allowed" from "not found" —
 * both are safe to reveal here since the route itself (e.g. `/v1/admin/users`) is not secret.
 */
export async function requireManager(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.caller) {
    await reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Missing caller context' } });
    return;
  }
  if (request.caller.role !== 'manager') {
    await reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Manager role required' } });
  }
}
