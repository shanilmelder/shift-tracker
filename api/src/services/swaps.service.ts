import { supabase } from '../data/supabase-client.js';
import {
  insertSwapRequest,
  findSwapRequestById,
  updateSwapRequest,
  listSwapRequestsForEmployee,
  type SwapRequestRow,
} from '../data/swap-requests.repo.js';
import { checkStaffingConflicts } from './staffing.service.js';
import { findShiftById } from '../data/shifts.repo.js';
import { isEmployeeAssignedToShift } from '../data/shift-assignments.repo.js';
import { isShiftLeaderOf } from '../middleware/require-shift-leader.middleware.js';
import { sendPushToProfiles } from './notifications.service.js';
import { publishToProfiles } from './realtime.service.js';
import type { CallerProfile } from '../types.js';

/**
 * FR-041: a coworker is eligible for a swap if they have no scheduling conflict with the
 * shift being swapped. Reuses staffing.service.ts's own conflict check rather than
 * duplicating the double-booking/insufficient-rest logic (this is also what open-shifts
 * eligibility, Phase 9, reuses — see plan.md's services layer note).
 */
export async function listEligibleCoworkers(caller: CallerProfile, shiftId: string): Promise<string[]> {
  const shift = await findShiftById(shiftId);
  if (!shift) throw new Error('Shift not found');

  // Per contracts/rest-api.md: this endpoint is scoped to an employee actually assigned to
  // the shift they're asking about — not any employee at the location.
  if (!(await isEmployeeAssignedToShift(shiftId, caller.id))) {
    throw new Error('Not authorized to view eligible coworkers for this shift');
  }

  const { data: coworkers, error } = await supabase.from('profiles').select('id').eq('location_id', caller.locationId).eq('role', 'employee');
  if (error) throw error;

  const eligible: string[] = [];
  for (const coworker of coworkers ?? []) {
    const conflict = await checkStaffingConflicts(coworker.id, {
      id: shiftId,
      startTime: shift.start_time,
      endTime: shift.end_time,
      locationId: shift.location_id,
    });
    if (!conflict) eligible.push(coworker.id);
  }
  return eligible;
}

export async function requestSwap(caller: CallerProfile, shiftId: string, targetEmployeeId: string): Promise<SwapRequestRow> {
  if (targetEmployeeId === caller.id) {
    throw new Error('Cannot request a swap with yourself');
  }
  // Per contracts/rest-api.md: only an employee actually staffed on this shift may request a
  // swap for it — otherwise anyone could submit a swap request on someone else's behalf.
  if (!(await isEmployeeAssignedToShift(shiftId, caller.id))) {
    throw new Error('You are not staffed on this shift');
  }
  return insertSwapRequest({ shiftId, requestingEmployeeId: caller.id, targetEmployeeId });
}

/** FR-017: the target coworker accepts or declines. */
export async function respondToSwap(caller: CallerProfile, swapId: string, accept: boolean): Promise<SwapRequestRow> {
  const swap = await findSwapRequestById(swapId);
  if (!swap) throw new Error('Swap request not found');
  if (swap.target_employee_id !== caller.id) throw new Error('Not authorized to respond to this request');
  if (swap.status !== 'pending') throw new Error(`Cannot respond to a request in status "${swap.status}"`);

  return updateSwapRequest(swapId, { status: accept ? 'coworker_accepted' : 'coworker_declined' });
}

/**
 * FR-011/FR-012/FR-042: final approval by the manager, or by the shift's current designated
 * leader as an additional/alternate approver — either decision is final. A manager is trusted
 * here because the route's `requireManagerOrShiftLeader` middleware has already scoped them
 * to this shift's own location before this function runs; an employee is authorized only by
 * being the CURRENT leader of this specific shift (re-checked live, never cached — FR-013).
 */
export async function decideSwapRequest(
  caller: CallerProfile,
  swapId: string,
  decision: { approve: boolean; comment?: string },
): Promise<SwapRequestRow> {
  const swap = await findSwapRequestById(swapId);
  if (!swap) throw new Error('Swap request not found');
  if (swap.status !== 'coworker_accepted') {
    throw new Error(`Cannot decide a request in status "${swap.status}" — it must be coworker_accepted first`);
  }

  const authorized = caller.role === 'manager' || (await isShiftLeaderOf(caller.id, swap.shift_id));
  if (!authorized) {
    throw new Error('Not authorized to decide this swap request — requires the shift\'s manager or its designated leader');
  }

  const updated = await updateSwapRequest(swapId, {
    status: decision.approve ? 'manager_approved' : 'denied',
    decided_by: caller.id,
    manager_comment: decision.comment ?? null,
  });

  if (decision.approve) {
    // Swap the staffing: remove the requesting employee, add the target employee, preserving
    // whatever `is_leader` the requester held (a swap moves the shift, not the leadership
    // designation, unless a manager separately re-staffs leadership).
    const { data: existingAssignment } = await supabase
      .from('shift_assignments')
      .select('is_leader')
      .eq('shift_id', swap.shift_id)
      .eq('employee_id', swap.requesting_employee_id)
      .maybeSingle();

    await supabase.from('shift_assignments').delete().eq('shift_id', swap.shift_id).eq('employee_id', swap.requesting_employee_id);
    await supabase.from('shift_assignments').upsert(
      { shift_id: swap.shift_id, employee_id: swap.target_employee_id, is_leader: existingAssignment?.is_leader ?? false },
      { onConflict: 'shift_id,employee_id' },
    );
  }

  // FR-022/FR-043: both parties are notified of the outcome, regardless of decision.
  const parties = [swap.requesting_employee_id, swap.target_employee_id];
  await sendPushToProfiles(
    parties,
    decision.approve ? 'Swap approved' : 'Swap denied',
    decision.approve ? 'Your shift swap was approved.' : 'Your shift swap was denied.',
    { swapId },
  );
  publishToProfiles(parties, 'swap.status_changed', { swapRequestId: swapId, status: updated.status });

  return updated;
}

export async function listMySwapRequests(employeeId: string): Promise<SwapRequestRow[]> {
  return listSwapRequestsForEmployee(employeeId);
}
