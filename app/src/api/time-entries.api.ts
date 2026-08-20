import { apiRequest } from './client';

export interface TimeEntry {
  id: string;
  shift_id: string;
  employee_id: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  flagged_for_review: boolean;
  idempotency_key: string;
}

export function clockIn(input: { shiftId: string; lat: number; lng: number; idempotencyKey: string }): Promise<TimeEntry> {
  return apiRequest<TimeEntry>('/time-entries/clock-in', { method: 'POST', body: input });
}

export function clockOut(entryId: string, input: { lat: number; lng: number; idempotencyKey: string }): Promise<TimeEntry> {
  return apiRequest<TimeEntry>(`/time-entries/${entryId}/clock-out`, { method: 'POST', body: input });
}

export function listMyTimeEntries(): Promise<TimeEntry[]> {
  return apiRequest<TimeEntry[]>('/time-entries', { query: { mine: true } });
}

export interface TimesheetSummary {
  totalRegularHours: number;
  totalOvertimeHours: number;
}

export function getMyTimesheet(from?: string, to?: string): Promise<TimesheetSummary> {
  return apiRequest<TimesheetSummary>('/timesheets/mine', { query: { from, to } });
}
