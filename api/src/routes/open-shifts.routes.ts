import type { FastifyInstance } from 'fastify';
import {
  postShiftOpen,
  listOpenShiftsForEmployee,
  claimOpenShift,
  listShiftClaims,
  confirmClaim,
} from '../services/open-shifts.service.js';
import { requireManager } from '../middleware/require-role.middleware.js';
import '../types.js';

export async function openShiftsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/shifts/:id/post-open', { preHandler: requireManager }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const shift = await postShiftOpen(request.caller!, id);
    await reply.send(shift);
  });

  app.get('/v1/open-shifts', async (request, reply) => {
    const shifts = await listOpenShiftsForEmployee(request.caller!);
    await reply.send(shifts);
  });

  app.post('/v1/open-shifts/:id/claim', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const claim = await claimOpenShift(request.caller!, id);
      await reply.code(201).send(claim);
    } catch (err) {
      await reply.code(409).send({ error: { code: 'CLAIM_REJECTED', message: (err as Error).message } });
    }
  });

  app.get('/v1/shifts/:id/claims', { preHandler: requireManager }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const claims = await listShiftClaims(id);
    await reply.send(claims);
  });

  app.post('/v1/shifts/:id/claims/:claimId/confirm', { preHandler: requireManager }, async (request, reply) => {
    const { id, claimId } = request.params as { id: string; claimId: string };
    const result = await confirmClaim(request.caller!, id, claimId);
    await reply.send(result);
  });
}
