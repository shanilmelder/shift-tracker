import type { FastifyInstance } from 'fastify';
import { CreateTimeOffRequestSchema, DecideTimeOffSchema } from '../schemas/time-off-requests.schemas.js';
import {
  submitTimeOffRequest,
  listMyTimeOffRequests,
  listTimeOffRequestsForLocation,
  decideTimeOffRequest,
} from '../services/time-off.service.js';
import { requireManager } from '../middleware/require-role.middleware.js';
import '../types.js';

export async function timeOffRequestsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/time-off-requests', async (request, reply) => {
    const parsed = CreateTimeOffRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const created = await submitTimeOffRequest(request.caller!, parsed.data);
    await reply.code(201).send(created);
  });

  app.get('/v1/time-off-requests', async (request, reply) => {
    const caller = request.caller!;
    const { mine } = request.query as { mine?: string };
    if (mine === 'true' || caller.role === 'employee') {
      await reply.send(await listMyTimeOffRequests(caller.id));
      return;
    }
    if (caller.role !== 'manager') {
      await reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Manager role required' } });
      return;
    }
    await reply.send(await listTimeOffRequestsForLocation(caller.locationId));
  });

  app.post('/v1/time-off-requests/:id/decide', { preHandler: requireManager }, async (request, reply) => {
    const parsed = DecideTimeOffSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const { id } = request.params as { id: string };
    const updated = await decideTimeOffRequest(request.caller!, id, parsed.data);
    await reply.send(updated);
  });
}
