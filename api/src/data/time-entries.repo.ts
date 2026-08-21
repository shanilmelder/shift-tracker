import { supabase } from './supabase-client.js';

export interface TimeEntryBreakRow {
  id: string;
  time_entry_id: string;
  break_start_at: string;
  break_end_at: string | null;
}

export interface TimeEntryRow {
  id: string;
  shift_id: string;
  employee_id: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  flagged_for_review: boolean;
  idempotency_key: string;
  created_at: string;
  /** Only present on rows fetched via listForEmployee, which embeds it — other queries here
   * (find-by-id, flagged-for-location) don't need it and don't select it. */
  breaks?: TimeEntryBreakRow[];
}

export async function findByIdempotencyKey(idempotencyKey: string): Promise<TimeEntryRow | null> {
  const { data, error } = await supabase.from('time_entries').select('*').eq('idempotency_key', idempotencyKey).maybeSingle();
  if (error) throw error;
  return (data as TimeEntryRow) ?? null;
}

export async function insertClockIn(input: {
  shiftId: string;
  employeeId: string;
  clockInAt: string;
  lat: number;
  lng: number;
  flaggedForReview: boolean;
  idempotencyKey: string;
}): Promise<TimeEntryRow> {
  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      shift_id: input.shiftId,
      employee_id: input.employeeId,
      clock_in_at: input.clockInAt,
      clock_in_lat: input.lat,
      clock_in_lng: input.lng,
      flagged_for_review: input.flaggedForReview,
      idempotency_key: input.idempotencyKey,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to record clock-in');
  return data as TimeEntryRow;
}

export async function recordClockOut(
  id: string,
  input: { clockOutAt: string; lat: number; lng: number; flaggedForReview: boolean },
): Promise<TimeEntryRow> {
  const { data, error } = await supabase
    .from('time_entries')
    .update({
      clock_out_at: input.clockOutAt,
      clock_out_lat: input.lat,
      clock_out_lng: input.lng,
      // Caller (time-entries.service.ts) already OR's this with the entry's existing flag, so
      // a clock-out inside the geofence never un-flags an entry a clock-in already flagged.
      flagged_for_review: input.flaggedForReview,
    })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to record clock-out');
  return data as TimeEntryRow;
}

export async function findById(id: string): Promise<TimeEntryRow | null> {
  const { data, error } = await supabase.from('time_entries').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as TimeEntryRow) ?? null;
}

export async function listForEmployee(employeeId: string, from?: string, to?: string): Promise<TimeEntryRow[]> {
  let query = supabase.from('time_entries').select('*, breaks:time_entry_breaks(*)').eq('employee_id', employeeId);
  if (from) query = query.gte('clock_in_at', from);
  if (to) query = query.lte('clock_in_at', to);
  const { data, error } = await query.order('clock_in_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TimeEntryRow[];
}

export async function listFlaggedForLocation(locationId: string): Promise<TimeEntryRow[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*, shift:shifts!inner(location_id)')
    .eq('flagged_for_review', true)
    .eq('shift.location_id', locationId);
  if (error) throw error;
  return (data ?? []) as TimeEntryRow[];
}

/**
 * How many time entries exist across the given shifts. Used as a delete guard: `time_entries`
 * intentionally does not cascade from `shifts` (0021 migration), so deleting a shift with
 * clock-in history would fail at the database with a foreign-key violation. Checking first
 * lets the API refuse with an explanation instead of surfacing a 500.
 */
export async function countTimeEntriesForShifts(shiftIds: string[]): Promise<number> {
  if (shiftIds.length === 0) return 0;
  const { count, error } = await supabase
    .from('time_entries')
    .select('id', { count: 'exact', head: true })
    .in('shift_id', shiftIds);
  if (error) throw error;
  return count ?? 0;
}
