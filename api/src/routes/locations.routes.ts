import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getMyLocation, updateMyLocation } from '../services/locations.service.js';
import { requireManager } from '../middleware/require-role.middleware.js';
import '../types.js';

const UpdateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
  geofenceRadiusM: z.number().positive().optional(),
  minRestHours: z.number().min(0).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export async function locationsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/locations/mine', async (request, reply) => {
    await reply.send(await getMyLocation(request.caller!));
  });

  app.patch('/v1/locations/mine', { preHandler: requireManager }, async (request, reply) => {
    const parsed = UpdateLocationSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    await reply.send(await updateMyLocation(request.caller!, parsed.data));
  });
}
