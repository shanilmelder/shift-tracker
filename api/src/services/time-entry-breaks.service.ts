import { findById } from '../data/time-entries.repo.js';
import { findOpenBreak, insertBreakStart, recordBreakEnd } from '../data/time-entry-breaks.repo.js';
import type { TimeEntryBreakRow } from '../data/time-entries.repo.js';

/**
 * Breaks are paid (product decision, 2026-08-20): this is a tracking/display feature only and
 * deliberately never feeds into time-entries.service.ts's computeRegularAndOvertimeHours —
 * break time still counts as worked hours.
 */
export async function startBreak(timeEntryId: string, employeeId: string): Promise<TimeEntryBreakRow> {
  const entry = await findById(timeEntryId);
  if (!entry || entry.employee_id !== employeeId) throw new Error('Time entry not found');
  if (entry.clock_out_at) throw new Error('Cannot start a break after clocking out');

  const existing = await findOpenBreak(timeEntryId);
  if (existing) return existing; // idempotent: a second tap while already on break is a no-op

  return insertBreakStart(timeEntryId);
}

export async function endBreak(timeEntryId: string, employeeId: string): Promise<TimeEntryBreakRow> {
  const entry = await findById(timeEntryId);
  if (!entry || entry.employee_id !== employeeId) throw new Error('Time entry not found');

  const open = await findOpenBreak(timeEntryId);
  if (!open) throw new Error('No break is currently open');

  return recordBreakEnd(open.id, new Date().toISOString());
}
