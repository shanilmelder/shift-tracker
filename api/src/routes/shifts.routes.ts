import type { FastifyInstance } from 'fastify';
import { ListShiftsQuerySchema, CreateShiftSchema, UpdateShiftSchema } from '../schemas/shifts.schemas.js';
import { listShifts, getShiftDetail, createShift, updateShift, cancelShift } from '../services/shifts.service.js';
import { requireManager } from '../middleware/require-role.middleware.js';
import '../types.js';

export async function shiftsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/shifts', async (request, reply) => {
    const parsed = ListShiftsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const shifts = await listShifts(request.caller!, parsed.data);
    await reply.send(shifts);
  });

  app.get('/v1/shifts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const detail = await getShiftDetail(request.caller!, id);
    if (!detail) {
      await reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Shift not found' } });
      return;
    }
    await reply.send(detail);
  });

  // Create step (FR-026): name + start/end time only, manager-only, results in an unstaffed
  // `draft` shift — staffing is a separate call (shift-assignments.routes.ts, Phase 5 below).
  app.post('/v1/shifts', { preHandler: requireManager }, async (request, reply) => {
    const parsed = CreateShiftSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const shift = await createShift(request.caller!, parsed.data);
    await reply.code(201).send(shift);
  });

  // FR-027: edits name/time/area/notes only — this route never accepts a staffing field.
  app.patch('/v1/shifts/:id', { preHandler: requireManager }, async (request, reply) => {
    const parsed = UpdateShiftSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const { id } = request.params as { id: string };
    const shift = await updateShift(request.caller!, id, parsed.data);
    if (!shift) {
      await reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Shift not found' } });
      return;
    }
    await reply.send(shift);
  });

  app.post('/v1/shifts/:id/cancel', { preHandler: requireManager }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const shift = await cancelShift(request.caller!, id);
    if (!shift) {
      await reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Shift not found' } });
      return;
    }
    await reply.send(shift);
  });
}
