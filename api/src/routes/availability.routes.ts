import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { listForEmployee, replaceForEmployee } from '../data/availability.repo.js';
import { requireManager } from '../middleware/require-role.middleware.js';
import '../types.js';

const AvailabilityRowSchema = z
  .object({
    recurring: z.boolean(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    blockedDate: z.string().date().optional(),
  })
  .refine((row) => (row.recurring ? row.dayOfWeek !== undefined && row.blockedDate === undefined : row.blockedDate !== undefined), {
    message: 'A recurring row needs dayOfWeek and no blockedDate; a non-recurring row needs blockedDate and no dayOfWeek',
  });

const ReplaceAvailabilitySchema = z.object({ rows: z.array(AvailabilityRowSchema) });

export async function availabilityRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/availability', async (request, reply) => {
    const { mine } = request.query as { mine?: string };
    const caller = request.caller!;
    if (mine === 'true' || caller.role === 'employee') {
      await reply.send(await listForEmployee(caller.id));
      return;
    }
    await reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Specify mine=true' } });
  });

  app.put('/v1/availability', async (request, reply) => {
    const parsed = ReplaceAvailabilitySchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const rows = parsed.data.rows.map((row) => ({
      day_of_week: row.recurring ? row.dayOfWeek! : null,
      start_time: row.startTime ?? null,
      end_time: row.endTime ?? null,
      recurring: row.recurring,
      blocked_date: row.recurring ? null : row.blockedDate!,
    }));
    await reply.send(await replaceForEmployee(request.caller!.id, rows));
  });

  app.get('/v1/availability/:employeeId', { preHandler: requireManager }, async (request, reply) => {
    const { employeeId } = request.params as { employeeId: string };
    await reply.send(await listForEmployee(employeeId));
  });
}
