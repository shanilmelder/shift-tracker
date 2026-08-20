import {
  insertTimeOffRequest,
  listForEmployee,
  listForLocation,
  findById,
  decide,
  findApprovedOverlapping,
  type TimeOffRequestRow,
} from '../data/time-off-requests.repo.js';
import { sendPushToProfile } from './notifications.service.js';
import { publishToProfiles } from './realtime.service.js';
import type { CallerProfile } from '../types.js';

/**
 * FR-018: the reason field is required — this is also enforced at the schema level
 * (migration 0007's `CHECK (length(trim(reason)) > 0)`), so this check is the API's own
 * layer of the same rule, not the only layer (defense-in-depth, same rationale as RLS).
 */
export async function submitTimeOffRequest(
  caller: CallerProfile,
  input: { startDate: string; endDate: string; reason: string },
): Promise<TimeOffRequestRow> {
  if (!input.reason.trim()) {
    throw new Error('A reason is required');
  }
  if (input.endDate < input.startDate) {
    throw new Error('endDate must not be before startDate');
  }
  return insertTimeOffRequest({ employeeId: caller.id, startDate: input.startDate, endDate: input.endDate, reason: input.reason });
}

export async function listMyTimeOffRequests(employeeId: string): Promise<TimeOffRequestRow[]> {
  return listForEmployee(employeeId);
}

export async function listTimeOffRequestsForLocation(locationId: string): Promise<TimeOffRequestRow[]> {
  return listForLocation(locationId);
}

/** FR-030: approve/deny with an optional comment. */
export async function decideTimeOffRequest(
  caller: CallerProfile,
  requestId: string,
  input: { approve: boolean; comment?: string },
): Promise<TimeOffRequestRow> {
  const existing = await findById(requestId);
  if (!existing) throw new Error('Time-off request not found');
  const updated = await decide(requestId, { status: input.approve ? 'approved' : 'denied', decidedBy: caller.id, comment: input.comment });

  // FR-022: "time-off approved or denied".
  await sendPushToProfile(
    existing.employee_id,
    input.approve ? 'Time off approved' : 'Time off denied',
    input.approve ? `Your time off for ${existing.start_date}–${existing.end_date} was approved.` : `Your time off request was denied.${input.comment ? ` "${input.comment}"` : ''}`,
    { timeOffRequestId: requestId },
  );
  publishToProfiles([existing.employee_id], 'time_off.status_changed', { timeOffRequestId: requestId, status: updated.status });

  return updated;
}

/**
 * FR-036: whether an employee has APPROVED time off overlapping a given shift window — used
 * both to warn a manager staffing over it (wired into staffing.service.ts below) and could be
 * surfaced directly to a manager reviewing a request against existing shifts.
 */
export async function hasApprovedTimeOff(employeeId: string, shiftStartIso: string, shiftEndIso: string): Promise<boolean> {
  const overlapping = await findApprovedOverlapping(employeeId, shiftStartIso, shiftEndIso);
  return overlapping.length > 0;
}
