import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { listShiftTemplates, createShiftTemplate, removeShiftTemplate } from '../services/shift-templates.service.js';
import { requireManager } from '../middleware/require-role.middleware.js';
import '../types.js';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const CreateShiftTemplateSchema = z
  .object({
    name: z.string().min(1),
    startTime: z.string().regex(TIME_RE, 'startTime must be HH:MM (24-hour)'),
    endTime: z.string().regex(TIME_RE, 'endTime must be HH:MM (24-hour)'),
    shiftAreaId: z.string().uuid().optional(),
  })
  .refine((body) => body.endTime > body.startTime, { message: 'End time must be after start time', path: ['endTime'] });

/**
 * A shift template is a name + time-of-day with no calendar date — the Build screen's Create
 * step. It never appears on anyone's schedule by itself; picking a template and a set of dates
 * in Assign (shifts.routes.ts's normal POST /v1/shifts, called once per date) is what actually
 * creates staffable shifts. Read-only for employees is unnecessary here (unlike shift_areas)
 * since employees never see the Build screen at all — every route below is manager-only.
 */
export async function shiftTemplatesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/shift-templates', { preHandler: requireManager }, async (request, reply) => {
    const templates = await listShiftTemplates(request.caller!.locationId);
    await reply.send(templates);
  });

  app.post('/v1/shift-templates', { preHandler: requireManager }, async (request, reply) => {
    const parsed = CreateShiftTemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const template = await createShiftTemplate(request.caller!, parsed.data);
    await reply.code(201).send(template);
  });

  app.delete('/v1/shift-templates/:id', { preHandler: requireManager }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await removeShiftTemplate(request.caller!, id);
      await reply.code(204).send();
    } catch (err) {
      await reply.code(404).send({ error: { code: 'NOT_FOUND', message: (err as Error).message } });
    }
  });
}
