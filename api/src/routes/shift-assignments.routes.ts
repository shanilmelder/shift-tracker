import type { FastifyInstance } from 'fastify';
import { ReplaceStaffingSchema } from '../schemas/shifts.schemas.js';
import { replaceShiftStaffing, removeShiftAssignment } from '../services/staffing.service.js';
import { listAssignmentsForShift } from '../data/shift-assignments.repo.js';
import { requireManagerOrShiftLeader } from '../middleware/require-shift-leader.middleware.js';
import '../types.js';

/**
 * The staff step (FR-026/FR-027), always a separate call from shift creation. Gated by
 * `requireManagerOrShiftLeader`, which allows either the shift's own-location manager OR its
 * current designated leader (FR-009) — never an employee with no relationship to this shift.
 */
export async function shiftAssignmentsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/shifts/:id/assignments', async (request, reply) => {
    const { id } = request.params as { id: string };
    const assignments = await listAssignmentsForShift(id);
    await reply.send(assignments);
  });

  app.put('/v1/shifts/:id/assignments', async (request, reply) => {
    const { id } = request.params as { id: string };
    await requireManagerOrShiftLeader(id)(request, reply);
    if (reply.sent) return;

    const parsed = ReplaceStaffingSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }

    const result = await replaceShiftStaffing(
      request.caller!,
      id,
      parsed.data.assignments.map((a) => ({ employeeId: a.employeeId, isLeader: a.isLeader })),
    );

    if (!result.ok) {
      await reply.code(409).send({
        error: {
          code: 'STAFFING_CONFLICT',
          message: 'One or more employees have a scheduling conflict for this shift',
          details: { conflicts: result.conflicts },
        },
      });
      return;
    }

    const assignments = await listAssignmentsForShift(id);
    await reply.send(assignments);
  });

  app.delete('/v1/shifts/:id/assignments/:employeeId', async (request, reply) => {
    const { id, employeeId } = request.params as { id: string; employeeId: string };
    await requireManagerOrShiftLeader(id)(request, reply);
    if (reply.sent) return;

    await removeShiftAssignment(id, employeeId);
    await reply.code(204).send();
  });
}
