import { supabase } from '../data/supabase-client.js';
import { findShiftById } from '../data/shifts.repo.js';
import { listAssignmentsForShift, type ShiftAssignmentRow } from '../data/shift-assignments.repo.js';
import { sendPushToProfile } from './notifications.service.js';
import { publishToProfiles } from './realtime.service.js';
import type { CallerProfile } from '../types.js';

/**
 * Time-off-vs-staffing conflict checking (FR-036) is wired in during Phase 8 (US6, T072),
 * once time-off.service.ts exists — set via `registerTimeOffConflictCheck` from that phase
 * rather than imported directly here, to keep this file's Phase 5 dependencies limited to
 * what US3 actually needs (avoids a forward reference to a not-yet-built service).
 */
type TimeOffConflictCheck = (employeeId: string, startTime: string, endTime: string) => Promise<boolean>;
let timeOffConflictCheck: TimeOffConflictCheck | null = null;
export function registerTimeOffConflictCheck(check: TimeOffConflictCheck): void {
  timeOffConflictCheck = check;
}

/** Default minimum rest window in hours, used only if a location's own `min_rest_hours`
 * cannot be read for some reason — the real source of truth is always the DB column
 * (data-model.md's Assumptions: this is manager-configurable, not a fixed constant). */
export const MIN_REST_HOURS_DEFAULT = 8;

export interface ShiftTimeWindow {
  startTime: string;
  endTime: string;
  /** When re-staffing an existing shift, its own id is excluded from self-conflicting. */
  shiftId?: string;
}

export interface ExistingAssignmentWindow {
  shiftId: string;
  startTime: string;
  endTime: string;
}

export interface DoubleBookingConflict {
  type: 'double_booking';
  conflictingShiftId: string;
}

export interface InsufficientRestConflict {
  type: 'insufficient_rest';
  conflictingShiftId: string;
  restHours: number;
  minRestHours: number;
}

/**
 * Pure function, no I/O: FR-028's double-booking rule. Two windows conflict if they overlap
 * at all. The shift currently being staffed is excluded via `candidate.shiftId` so re-staffing
 * a shift never flags a conflict against itself.
 */
export function detectDoubleBooking(
  candidate: ShiftTimeWindow,
  existing: ExistingAssignmentWindow[],
): DoubleBookingConflict | null {
  const candidateStart = Date.parse(candidate.startTime);
  const candidateEnd = Date.parse(candidate.endTime);

  for (const other of existing) {
    if (candidate.shiftId && other.shiftId === candidate.shiftId) continue;
    const otherStart = Date.parse(other.startTime);
    const otherEnd = Date.parse(other.endTime);
    const overlaps = candidateStart < otherEnd && otherStart < candidateEnd;
    if (overlaps) {
      return { type: 'double_booking', conflictingShiftId: other.shiftId };
    }
  }
  return null;
}

/**
 * Pure function, no I/O: FR-028's insufficient-rest rule. Flags the candidate shift if it
 * starts less than `minRestHours` after an existing shift ends, or ends less than
 * `minRestHours` before an existing shift starts (covers staffing a shift either after or
 * before an existing one). Exactly `minRestHours` of gap is NOT a conflict (boundary is
 * inclusive of the minimum, per the unit test).
 */
export function detectInsufficientRest(
  candidate: ShiftTimeWindow,
  existing: ExistingAssignmentWindow[],
  minRestHours: number,
): InsufficientRestConflict | null {
  const minRestMs = minRestHours * 60 * 60 * 1000;
  const candidateStart = Date.parse(candidate.startTime);
  const candidateEnd = Date.parse(candidate.endTime);

  for (const other of existing) {
    if (candidate.shiftId && other.shiftId === candidate.shiftId) continue;
    const otherStart = Date.parse(other.startTime);
    const otherEnd = Date.parse(other.endTime);

    // Gap if the candidate starts after the other shift ends.
    if (candidateStart >= otherEnd) {
      const gapMs = candidateStart - otherEnd;
      if (gapMs < minRestMs) {
        return {
          type: 'insufficient_rest',
          conflictingShiftId: other.shiftId,
          restHours: gapMs / (60 * 60 * 1000),
          minRestHours,
        };
      }
    }
    // Gap if the candidate ends before the other shift starts.
    else if (candidateEnd <= otherStart) {
      const gapMs = otherStart - candidateEnd;
      if (gapMs < minRestMs) {
        return {
          type: 'insufficient_rest',
          conflictingShiftId: other.shiftId,
          restHours: gapMs / (60 * 60 * 1000),
          minRestHours,
        };
      }
    }
    // Otherwise the windows overlap — that's detectDoubleBooking's concern, not this rule's.
  }
  return null;
}

export type StaffingConflict = DoubleBookingConflict | InsufficientRestConflict;

interface RawAssignmentWithShift {
  shift_id: string;
  // Without generated DB types wired into the Supabase client, supabase-js types an
  // embedded-via-!inner foreign row as an array even though it's always exactly one row at
  // runtime for a many-to-one FK — normalized back to a single object below.
  shift: { start_time: string; end_time: string } | Array<{ start_time: string; end_time: string }>;
}

async function existingWindowsForEmployee(employeeId: string, excludeShiftId?: string): Promise<ExistingAssignmentWindow[]> {
  const { data, error } = await supabase
    .from('shift_assignments')
    .select('shift_id, shift:shifts!inner(start_time, end_time)')
    .eq('employee_id', employeeId);
  if (error) throw error;

  return ((data ?? []) as unknown as RawAssignmentWithShift[])
    .filter((row) => row.shift_id !== excludeShiftId)
    .map((row) => {
      const shift = Array.isArray(row.shift) ? row.shift[0] : row.shift;
      if (!shift) throw new Error(`shift_assignments row for shift ${row.shift_id} is missing its joined shift`);
      return { shiftId: row.shift_id, startTime: shift.start_time, endTime: shift.end_time };
    });
}

/**
 * Checks one employee against both conflict rules, plus the time-off scheduling block
 * (FR-036/spec.md edge case: an employee with approved time off must never be silently
 * staffed over it). Returns the first conflict found, or null if the employee is clear to
 * staff on this shift.
 */
export async function checkStaffingConflicts(
  employeeId: string,
  shift: { id: string; startTime: string; endTime: string; locationId: string },
): Promise<StaffingConflict | { type: 'time_off_conflict' } | null> {
  const [existingWindows, { data: location, error: locationError }] = await Promise.all([
    existingWindowsForEmployee(employeeId, shift.id),
    supabase.from('locations').select('min_rest_hours').eq('id', shift.locationId).single(),
  ]);
  if (locationError) throw locationError;

  const candidate = { startTime: shift.startTime, endTime: shift.endTime, shiftId: shift.id };

  const doubleBooking = detectDoubleBooking(candidate, existingWindows);
  if (doubleBooking) return doubleBooking;

  const minRestHours = (location?.min_rest_hours as number | undefined) ?? MIN_REST_HOURS_DEFAULT;
  const insufficientRest = detectInsufficientRest(candidate, existingWindows, minRestHours);
  if (insufficientRest) return insufficientRest;

  if (timeOffConflictCheck) {
    const onApprovedTimeOff = await timeOffConflictCheck(employeeId, shift.startTime, shift.endTime);
    if (onApprovedTimeOff) return { type: 'time_off_conflict' };
  }

  return null;
}

export interface StaffingTarget {
  employeeId: string;
  isLeader: boolean;
}

export interface StaffingResult {
  ok: boolean;
  conflicts: Array<{ employeeId: string; conflict: Awaited<ReturnType<typeof checkStaffingConflicts>> }>;
}

/**
 * FR-026/FR-027 (staff step) + FR-028 (conflict detection): full-replace staffing for one
 * shift. Every target employee is checked for conflicts BEFORE any row is written, so a
 * rejected staffing attempt never partially applies (contracts/rest-api.md's PUT
 * /v1/shifts/:id/assignments: "returns 409 ... before any row is written").
 */
export async function replaceShiftStaffing(
  caller: CallerProfile,
  shiftId: string,
  targets: StaffingTarget[],
): Promise<StaffingResult> {
  const shift = await findShiftById(shiftId);
  if (!shift) throw new Error('Shift not found');

  const leaderCount = targets.filter((t) => t.isLeader).length;
  if (leaderCount > 1) {
    throw new Error('At most one shift leader is allowed per shift');
  }

  const conflicts: StaffingResult['conflicts'] = [];
  for (const target of targets) {
    const conflict = await checkStaffingConflicts(target.employeeId, {
      id: shiftId,
      startTime: shift.start_time,
      endTime: shift.end_time,
      locationId: shift.location_id,
    });
    if (conflict) conflicts.push({ employeeId: target.employeeId, conflict });
  }

  if (conflicts.length > 0) {
    return { ok: false, conflicts };
  }

  // Full-replace: remove assignments not in the new target list, upsert the rest.
  const current = await listAssignmentsForShift(shiftId);
  const targetIds = new Set(targets.map((t) => t.employeeId));
  const toRemove = current.filter((row: ShiftAssignmentRow) => !targetIds.has(row.employee_id));

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('shift_assignments')
      .delete()
      .in('id', toRemove.map((row) => row.id));
    if (deleteError) throw deleteError;
  }

  for (const target of targets) {
    const { error: upsertError } = await supabase.from('shift_assignments').upsert(
      { shift_id: shiftId, employee_id: target.employeeId, is_leader: target.isLeader },
      { onConflict: 'shift_id,employee_id' },
    );
    if (upsertError) throw upsertError;
  }

  if (shift.status === 'draft' && targets.length > 0) {
    await supabase.from('shifts').update({ status: 'scheduled' }).eq('id', shiftId);
  }

  // FR-022 "shift assigned": notify every newly-added employee. Previously-staffed employees
  // who remain staffed are not re-notified (that's "shift changed", triggered separately by
  // shifts.service.ts's updateShift when name/time actually change).
  const previouslyStaffedIds = new Set(current.map((row) => row.employee_id));
  const newlyAdded = targets.filter((t) => !previouslyStaffedIds.has(t.employeeId));
  await Promise.all(
    newlyAdded.map((t) => sendPushToProfile(t.employeeId, 'Shift assigned', `You've been added to "${shift.name}".`, { shiftId })),
  );
  publishToProfiles(newlyAdded.map((t) => t.employeeId), 'shift.assigned', { shiftId });

  return { ok: true, conflicts: [] };
}

export async function removeShiftAssignment(shiftId: string, employeeId: string): Promise<void> {
  const { error } = await supabase.from('shift_assignments').delete().eq('shift_id', shiftId).eq('employee_id', employeeId);
  if (error) throw error;
}
