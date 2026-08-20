import type { FastifyInstance } from 'fastify';
import { hoursByEmployee, laborCostVsBudget, attendanceTrend, overtimeTrend } from '../services/reports.service.js';
import { requireManager } from '../middleware/require-role.middleware.js';
import '../types.js';

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/reports/hours-by-employee', { preHandler: requireManager }, async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    await reply.send(await hoursByEmployee(request.caller!.locationId, { from, to }));
  });

  app.get('/v1/reports/labor-cost', { preHandler: requireManager }, async (request, reply) => {
    const { from, to, budget } = request.query as { from?: string; to?: string; budget?: string };
    await reply.send(await laborCostVsBudget(request.caller!.locationId, { from, to }, Number(budget ?? 0)));
  });

  app.get('/v1/reports/attendance', { preHandler: requireManager }, async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    await reply.send(await attendanceTrend(request.caller!.locationId, { from, to }));
  });

  app.get('/v1/reports/overtime', { preHandler: requireManager }, async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    await reply.send(await overtimeTrend(request.caller!.locationId, { from, to }));
  });
}
