import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAnnouncement, listMyAnnouncements } from '../services/announcements.service.js';
import { requireManager } from '../middleware/require-role.middleware.js';
import '../types.js';

const CreateAnnouncementSchema = z.object({
  targetScope: z.enum(['team', 'location', 'shift']),
  targetShiftId: z.string().uuid().optional(),
  message: z.string().min(1),
});

export async function announcementsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/announcements', { preHandler: requireManager }, async (request, reply) => {
    const parsed = CreateAnnouncementSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const result = await createAnnouncement(request.caller!, parsed.data);
    await reply.code(201).send(result);
  });

  app.get('/v1/announcements', async (request, reply) => {
    await reply.send(await listMyAnnouncements(request.caller!));
  });
}
