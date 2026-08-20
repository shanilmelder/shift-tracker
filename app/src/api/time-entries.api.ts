import { apiRequest } from './client';

export interface TimeEntryBreak {
  id: string;
  time_entry_id: string;
  break_start_at: string;
  break_end_at: string | null;
}

export interface TimeEntry {
  id: string;
  shift_id: string;
  employee_id: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  flagged_for_review: boolean;
  idempotency_key: string;
  breaks: TimeEntryBreak[];
}

export function clockIn(input: { shiftId: string; lat: number; lng: number; idempotencyKey: string }): Promise<TimeEntry> {
  return apiRequest<TimeEntry>('/time-entries/clock-in', { method: 'POST', body: input });
}

export function clockOut(entryId: string, input: { lat: number; lng: number; idempotencyKey: string }): Promise<TimeEntry> {
  return apiRequest<TimeEntry>(`/time-entries/${entryId}/clock-out`, { method: 'POST', body: input });
}

export interface GeofenceCheckResult {
  withinRange: boolean;
  approxDistanceM?: number;
}

/** Informational only — never blocks clocking in (FR-038). */
export function checkGeofence(input: { shiftId: string; lat: number; lng: number }): Promise<GeofenceCheckResult> {
  return apiRequest<GeofenceCheckResult>('/time-entries/geofence-check', { method: 'POST', body: input });
}

/** Idempotent server-side — a second tap while already on break returns the existing break. */
export function startBreak(entryId: string): Promise<TimeEntryBreak> {
  return apiRequest<TimeEntryBreak>(`/time-entries/${entryId}/break-start`, { method: 'POST' });
}

export function endBreak(entryId: string): Promise<TimeEntryBreak> {
  return apiRequest<TimeEntryBreak>(`/time-entries/${entryId}/break-end`, { method: 'POST' });
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
