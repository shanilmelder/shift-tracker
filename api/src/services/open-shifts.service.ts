import { supabase } from '../data/supabase-client.js';
import { findShiftById, updateShiftFields } from '../data/shifts.repo.js';
import { insertClaim, listClaimsForShift, findClaim, deleteClaimsForShift, listOpenShiftsForLocation } from '../data/open-shift-claims.repo.js';
import { checkStaffingConflicts } from './staffing.service.js';
import { publishToProfiles } from './realtime.service.js';
import type { CallerProfile } from '../types.js';

/** FR-029: post an unfilled shift to the open shift board. */
export async function postShiftOpen(caller: CallerProfile, shiftId: string) {
  const shift = await findShiftById(shiftId);
  if (!shift || shift.location_id !== caller.locationId) throw new Error('Shift not found');
  const updated = await updateShiftFields(shiftId, { status: 'open' });

  const { data: employees } = await supabase.from('profiles').select('id').eq('location_id', caller.locationId).eq('role', 'employee');
  publishToProfiles((employees ?? []).map((e) => e.id as string), 'open_shift.posted', { shiftId });

  return updated;
}

/** FR-044: reuses staffing.service.ts's own conflict check for eligibility. */
export async function listOpenShiftsForEmployee(caller: CallerProfile) {
  const openShifts = await listOpenShiftsForLocation(caller.locationId);
  const eligible = [];
  for (const shift of openShifts) {
    const conflict = await checkStaffingConflicts(caller.id, {
      id: shift.id,
      startTime: shift.start_time,
      endTime: shift.end_time,
      locationId: shift.location_id,
    });
    if (!conflict) eligible.push(shift);
  }
  return eligible;
}

/** FR-045: claiming never staffs the shift — it only records the claim. */
export async function claimOpenShift(caller: CallerProfile, shiftId: string) {
  const shift = await findShiftById(shiftId);
  if (!shift || shift.status !== 'open') throw new Error('Shift is not open for claiming');

  const conflict = await checkStaffingConflicts(caller.id, {
    id: shiftId,
    startTime: shift.start_time,
    endTime: shift.end_time,
    locationId: shift.location_id,
  });
  if (conflict) throw new Error('You are not eligible to claim this shift');

  const claim = await insertClaim(shiftId, caller.id);

  const { data: managers } = await supabase.from('profiles').select('id').eq('location_id', caller.locationId).eq('role', 'manager');
  const claimCount = (await listClaimsForShift(shiftId)).length;
  publishToProfiles((managers ?? []).map((m) => m.id as string), 'open_shift.claimed', { shiftId, claimCount });

  return claim;
}

/** FR-046: all claimants, no priority ordering implied. */
export async function listShiftClaims(shiftId: string) {
  return listClaimsForShift(shiftId);
}

/**
 * FR-045/FR-046: the manager may confirm ANY claimant, regardless of claim order. Confirming
 * one claimant staffs them and clears the remaining claims (they're notified separately —
 * see notifications wiring in Phase 11).
 */
export async function confirmClaim(caller: CallerProfile, shiftId: string, claimId: string) {
  const shift = await findShiftById(shiftId);
  if (!shift || shift.location_id !== caller.locationId) throw new Error('Shift not found');

  const claim = await findClaim(claimId);
  if (!claim || claim.shift_id !== shiftId) throw new Error('Claim not found for this shift');

  const otherClaims = (await listClaimsForShift(shiftId)).filter((c) => c.id !== claimId);

  const { error: upsertError } = await supabase
    .from('shift_assignments')
    .upsert({ shift_id: shiftId, employee_id: claim.employee_id, is_leader: false }, { onConflict: 'shift_id,employee_id' });
  if (upsertError) throw upsertError;

  await updateShiftFields(shiftId, { status: 'scheduled' });
  await deleteClaimsForShift(shiftId);

  const unconfirmedIds = otherClaims.map((c) => c.employee_id);
  publishToProfiles(unconfirmedIds, 'open_shift.confirmed', { shiftId });

  return { confirmedEmployeeId: claim.employee_id, notifiedUnconfirmedEmployeeIds: unconfirmedIds };
}
