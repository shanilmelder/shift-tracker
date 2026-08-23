import type { FastifyInstance } from 'fastify';
import { CreateSwapRequestSchema, RespondSwapSchema, DecideSwapSchema } from '../schemas/swap-requests.schemas.js';
import {
  listEligibleCoworkers,
  requestSwap,
  respondToSwap,
  decideSwapRequest,
  listMySwapRequests,
  listSwapRequestsForManager,
} from '../services/swaps.service.js';
import '../types.js';

export async function swapRequestsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/shifts/:id/eligible-coworkers', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const eligible = await listEligibleCoworkers(request.caller!, id);
      await reply.send(eligible);
    } catch (err) {
      await reply.code(403).send({ error: { code: 'FORBIDDEN', message: (err as Error).message } });
    }
  });

  app.post('/v1/swap-requests', async (request, reply) => {
    const parsed = CreateSwapRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    try {
      const swap = await requestSwap(request.caller!, parsed.data.shiftId, parsed.data.targetEmployeeId);
      await reply.code(201).send(swap);
    } catch (err) {
      await reply.code(403).send({ error: { code: 'FORBIDDEN', message: (err as Error).message } });
    }
  });

  app.post('/v1/swap-requests/:id/respond', async (request, reply) => {
    const parsed = RespondSwapSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const { id } = request.params as { id: string };
    try {
      const swap = await respondToSwap(request.caller!, id, parsed.data.accept);
      await reply.send(swap);
    } catch (err) {
      await reply.code(403).send({ error: { code: 'FORBIDDEN', message: (err as Error).message } });
    }
  });

  app.post('/v1/swap-requests/:id/decide', async (request, reply) => {
    const parsed = DecideSwapSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const { id } = request.params as { id: string };
    try {
      const swap = await decideSwapRequest(request.caller!, id, parsed.data);
      await reply.send(swap);
    } catch (err) {
      await reply.code(403).send({ error: { code: 'FORBIDDEN', message: (err as Error).message } });
    }
  });

  /**
   * An employee's own swaps; a manager's whole location.
   *
   * Previously this always filtered to the caller's own requests, which meant a manager — who
   * is neither the requester nor the target of any swap — could never see one, and their
   * approvals queue was empty by construction.
   *
   * `?mine=true` lets a manager ask for their own instead, matching how the time-off list
   * already behaves.
   */
  app.get('/v1/swap-requests', async (request, reply) => {
    const caller = request.caller!;
    const { mine } = request.query as { mine?: string };
    if (caller.role === 'manager' && mine !== 'true') {
      await reply.send(await listSwapRequestsForManager(caller.locationId));
      return;
    }
    await reply.send(await listMySwapRequests(caller.id));
  });
}
