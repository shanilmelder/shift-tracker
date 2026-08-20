import type { FastifyInstance } from 'fastify';
import { getDashboard } from '../services/dashboard.service.js';
import { requireManager } from '../middleware/require-role.middleware.js';
import '../types.js';

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/dashboard', { preHandler: requireManager }, async (request, reply) => {
    await reply.send(await getDashboard(request.caller!.locationId));
  });
}
