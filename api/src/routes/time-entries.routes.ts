import type { FastifyInstance, FastifyReply } from 'fastify';
import { ClockInSchema, ClockOutSchema, GeofenceCheckSchema } from '../schemas/time-entries.schemas.js';
import { clockIn, clockOut, listMyTimeEntries, checkGeofence } from '../services/time-entries.service.js';
import { supabase } from '../data/supabase-client.js';
import { listFlaggedForLocation } from '../data/time-entries.repo.js';
import '../types.js';

/** FR-019 requires the caller be assigned to the shift before acting on it (clocking in, or —
 * for geofence-check — even just asking about it). Shared so both routes enforce it identically. */
async function isAssignedToShift(shiftId: string, employeeId: string): Promise<boolean> {
  const { data: assignment } = await supabase
    .from('shift_assignments')
    .select('id')
    .eq('shift_id', shiftId)
    .eq('employee_id', employeeId)
    .maybeSingle();
  return Boolean(assignment);
}

async function sendNotAssigned(reply: FastifyReply): Promise<void> {
  await reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'You are not staffed on this shift' } });
}

export async function timeEntriesRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/time-entries/clock-in', async (request, reply) => {
    const parsed = ClockInSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const caller = request.caller!;
    if (!(await isAssignedToShift(parsed.data.shiftId, caller.id))) {
      await sendNotAssigned(reply);
      return;
    }

    const entry = await clockIn({ ...parsed.data, employeeId: caller.id });
    await reply.code(201).send(entry);
  });

  app.post('/v1/time-entries/geofence-check', async (request, reply) => {
    const parsed = GeofenceCheckSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const caller = request.caller!;
    if (!(await isAssignedToShift(parsed.data.shiftId, caller.id))) {
      await sendNotAssigned(reply);
      return;
    }

    const result = await checkGeofence(parsed.data.shiftId, { lat: parsed.data.lat, lng: parsed.data.lng });
    await reply.send(result);
  });

  app.post('/v1/time-entries/:id/clock-out', async (request, reply) => {
    const parsed = ClockOutSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const { id } = request.params as { id: string };
    const entry = await clockOut({ timeEntryId: id, employeeId: request.caller!.id, lat: parsed.data.lat, lng: parsed.data.lng });
    await reply.send(entry);
  });

  app.get('/v1/time-entries', async (request, reply) => {
    const caller = request.caller!;
    const { mine, flagged, from, to } = request.query as { mine?: string; flagged?: string; from?: string; to?: string };

    if (flagged === 'true') {
      if (caller.role !== 'manager') {
        await reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Manager role required' } });
        return;
      }
      const flaggedEntries = await listFlaggedForLocation(caller.locationId);
      await reply.send(flaggedEntries);
      return;
    }

    if (mine === 'true' || caller.role === 'employee') {
      const entries = await listMyTimeEntries(caller.id, from, to);
      await reply.send(entries);
      return;
    }

    await reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Specify mine=true or flagged=true' } });
  });
}
