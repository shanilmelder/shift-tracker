import type { FastifyInstance } from 'fastify';
import { getTimesheet } from '../services/time-entries.service.js';
import { requireManager } from '../middleware/require-role.middleware.js';
import { supabase } from '../data/supabase-client.js';
import '../types.js';

export async function timesheetsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/timesheets/mine', async (request, reply) => {
    const caller = request.caller!;
    const { from, to } = request.query as { from?: string; to?: string };

    const { data: location, error } = await supabase.from('locations').select('timezone').eq('id', caller.locationId).single();
    if (error || !location) {
      await reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Could not resolve location timezone' } });
      return;
    }

    const summary = await getTimesheet(caller.id, location.timezone, from, to);
    await reply.send(summary);
  });

  // CSV export for downstream payroll (explicitly in scope — see spec.md's Out of Scope note:
  // "timesheet export for downstream payroll processing is in scope; the disbursement itself
  // is not").
  app.get('/v1/timesheets/export', { preHandler: requireManager }, async (request, reply) => {
    const { employeeId, from, to } = request.query as { employeeId?: string; from?: string; to?: string };
    if (!employeeId) {
      await reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'employeeId is required' } });
      return;
    }
    const caller = request.caller!;
    const { data: location, error } = await supabase.from('locations').select('timezone').eq('id', caller.locationId).single();
    if (error || !location) {
      await reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Could not resolve location timezone' } });
      return;
    }
    const summary = await getTimesheet(employeeId, location.timezone, from, to);
    const csv = `employee_id,regular_hours,overtime_hours\n${employeeId},${summary.totalRegularHours},${summary.totalOvertimeHours}\n`;
    await reply.header('Content-Type', 'text/csv').send(csv);
  });
}
