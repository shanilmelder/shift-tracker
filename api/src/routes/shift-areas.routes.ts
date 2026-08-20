import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { listShiftAreas, createShiftArea, renameShiftArea, removeShiftArea } from '../services/shift-areas.service.js';
import { requireManager } from '../middleware/require-role.middleware.js';
import '../types.js';

const NameSchema = z.object({ name: z.string().min(1) });

/**
 * FR-032/FR-033: employees get read-only access (they see the area tag already on a shift);
 * every write here requires `requireManager` — there is no employee-reachable path to create,
 * rename, or remove an area label.
 */
export async function shiftAreasRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/shift-areas', async (request, reply) => {
    const areas = await listShiftAreas(request.caller!.locationId);
    await reply.send(areas);
  });

  app.post('/v1/shift-areas', { preHandler: requireManager }, async (request, reply) => {
    const parsed = NameSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const area = await createShiftArea(request.caller!, parsed.data.name);
    await reply.code(201).send(area);
  });

  app.patch('/v1/shift-areas/:id', { preHandler: requireManager }, async (request, reply) => {
    const parsed = NameSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const { id } = request.params as { id: string };
    const area = await renameShiftArea(request.caller!, id, parsed.data.name);
    await reply.send(area);
  });

  app.delete('/v1/shift-areas/:id', { preHandler: requireManager }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await removeShiftArea(request.caller!, id);
      await reply.code(204).send();
    } catch (err) {
      await reply.code(409).send({ error: { code: 'AREA_IN_USE', message: (err as Error).message } });
    }
  });
}
