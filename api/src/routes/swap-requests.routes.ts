import type { FastifyInstance } from 'fastify';
import { CreateSwapRequestSchema, RespondSwapSchema, DecideSwapSchema } from '../schemas/swap-requests.schemas.js';
import { listEligibleCoworkers, requestSwap, respondToSwap, decideSwapRequest, listMySwapRequests } from '../services/swaps.service.js';
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

  app.get('/v1/swap-requests', async (request, reply) => {
    const swaps = await listMySwapRequests(request.caller!.id);
    await reply.send(swaps);
  });
}
