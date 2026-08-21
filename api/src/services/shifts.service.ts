import {
  listShiftsForManager,
  listShiftsForEmployee,
  findShiftById,
  insertShift,
  updateShiftFields,
  deleteShiftById,
  listShiftIdsForTemplate,
  type ShiftFilters,
  type ShiftRow,
} from '../data/shifts.repo.js';
import { listAssignmentsForShift, isEmployeeAssignedToShift } from '../data/shift-assignments.repo.js';
import { countTimeEntriesForShifts } from '../data/time-entries.repo.js';
import { isShiftLeaderOf } from '../middleware/require-shift-leader.middleware.js';
import { sendPushToProfiles } from './notifications.service.js';
import { publishToProfiles } from './realtime.service.js';
import type { CallerProfile } from '../types.js';

export interface ShiftDetail extends ShiftRow {
  assignments: Awaited<ReturnType<typeof listAssignmentsForShift>>;
}

/** FR-014: list shifts scoped to the caller — a manager sees their location's shifts, an
 * employee sees only shifts they are personally staffed on. */
export async function listShifts(caller: CallerProfile, filters: ShiftFilters): Promise<ShiftRow[]> {
  if (caller.role === 'manager') {
    return listShiftsForManager(caller.locationId, filters);
  }
  return listShiftsForEmployee(caller.id, filters);
}

/**
 * FR-015: shift detail including staffing. Access is restricted to: a manager at the shift's
 * location, the shift's current leader, or an employee staffed on it — enforced here in
 * addition to RLS, since the API's own services layer is where this check must live
 * (constitution: Security First).
 */
export async function getShiftDetail(caller: CallerProfile, shiftId: string): Promise<ShiftDetail | null> {
  const shift = await findShiftById(shiftId);
  if (!shift) return null;

  const authorized =
    (caller.role === 'manager' && shift.location_id === caller.locationId) ||
    (await isEmployeeAssignedToShift(shiftId, caller.id)) ||
    (await isShiftLeaderOf(caller.id, shiftId));
  if (!authorized) return null;

  const assignments = await listAssignmentsForShift(shiftId);
  return { ...shift, assignments };
}

/** FR-026 (create step): name + start/end time only, no staffing — the shift starts as `draft`. */
export async function createShift(
  caller: CallerProfile,
  input: { name: string; startTime: string; endTime: string; shiftAreaId?: string; position?: string; notes?: string; templateId?: string },
): Promise<ShiftRow> {
  return insertShift({ ...input, locationId: caller.locationId, createdBy: caller.id });
}

/** FR-027: edits name/time/area/notes only — never touches staffing (that's shift-assignments.routes.ts). */
export async function updateShift(
  caller: CallerProfile,
  shiftId: string,
  patch: { name?: string; startTime?: string; endTime?: string; shiftAreaId?: string | null; position?: string | null; notes?: string | null },
): Promise<ShiftRow | null> {
  const shift = await findShiftById(shiftId);
  if (!shift || shift.location_id !== caller.locationId) return null;

  const updated = await updateShiftFields(shiftId, {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.startTime !== undefined ? { start_time: patch.startTime } : {}),
    ...(patch.endTime !== undefined ? { end_time: patch.endTime } : {}),
    ...(patch.shiftAreaId !== undefined ? { shift_area_id: patch.shiftAreaId } : {}),
    ...(patch.position !== undefined ? { position: patch.position } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
  });

  // FR-022 "shift changed": only when something a staffed employee would care about actually
  // changed (name or time) — not on every notes/area edit, to avoid over-notifying.
  if (patch.name !== undefined || patch.startTime !== undefined || patch.endTime !== undefined) {
    const assignments = await listAssignmentsForShift(shiftId);
    const employeeIds = assignments.map((a) => a.employee_id);
    await sendPushToProfiles(employeeIds, 'Shift changed', `"${updated.name}" has been updated.`, { shiftId });
    publishToProfiles(employeeIds, 'shift.changed', { shiftId, fields: Object.keys(patch) });
  }

  return updated;
}

export type DeleteShiftResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'has_time_entries'; timeEntryCount: number };

/**
 * Deletes a shift and, by database cascade, its staffing assignments, open-shift claims and
 * swap requests. Staffed employees are notified first — the assignment rows naming them are
 * gone the moment the delete lands, so the recipient list has to be read before, not after.
 *
 * Refuses outright when the shift has any time entries: that is payroll history, and
 * `time_entries.shift_id` deliberately does not cascade (0021 migration). Cancelling the
 * shift is the right move there, which is why that route still exists alongside this one.
 */
export async function deleteShift(caller: CallerProfile, shiftId: string): Promise<DeleteShiftResult> {
  const shift = await findShiftById(shiftId);
  if (!shift || shift.location_id !== caller.locationId) return { ok: false, reason: 'not_found' };

  const timeEntryCount = await countTimeEntriesForShifts([shiftId]);
  if (timeEntryCount > 0) return { ok: false, reason: 'has_time_entries', timeEntryCount };

  const assignments = await listAssignmentsForShift(shiftId);
  const employeeIds = assignments.map((a) => a.employee_id);

  await deleteShiftById(shiftId);

  await sendPushToProfiles(employeeIds, 'Shift removed', `"${shift.name}" has been deleted from the schedule.`, { shiftId });
  publishToProfiles(employeeIds, 'shift.deleted', { shiftId });
  return { ok: true };
}

/**
 * What deleting `templateId` would take with it — the numbers the Build screen shows in its
 * confirmation, and the same check `removeShiftTemplate` enforces server-side.
 */
export async function templateDeletionImpact(templateId: string): Promise<{ shiftIds: string[]; timeEntryCount: number }> {
  const shiftIds = await listShiftIdsForTemplate(templateId);
  const timeEntryCount = await countTimeEntriesForShifts(shiftIds);
  return { shiftIds, timeEntryCount };
}

/** Notifies everyone staffed on `shiftIds` that those shifts are going away. Call before deleting. */
export async function notifyShiftsRemoved(shiftIds: string[], templateName: string): Promise<void> {
  const employeeIds = new Set<string>();
  for (const shiftId of shiftIds) {
    const assignments = await listAssignmentsForShift(shiftId);
    for (const a of assignments) employeeIds.add(a.employee_id);
  }
  if (employeeIds.size === 0) return;
  const ids = Array.from(employeeIds);
  await sendPushToProfiles(ids, 'Shifts removed', `"${templateName}" and its scheduled dates have been deleted.`, {});
  publishToProfiles(ids, 'shift.deleted', { shiftIds });
}

export async function cancelShift(caller: CallerProfile, shiftId: string): Promise<ShiftRow | null> {
  const shift = await findShiftById(shiftId);
  if (!shift || shift.location_id !== caller.locationId) return null;

  const assignments = await listAssignmentsForShift(shiftId);
  const employeeIds = assignments.map((a) => a.employee_id);
  const updated = await updateShiftFields(shiftId, { status: 'cancelled' });
  await sendPushToProfiles(employeeIds, 'Shift cancelled', `"${shift.name}" has been cancelled.`, { shiftId });
  publishToProfiles(employeeIds, 'shift.cancelled', { shiftId });
  return updated;
}
