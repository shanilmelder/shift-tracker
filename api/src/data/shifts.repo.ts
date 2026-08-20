import { supabase } from './supabase-client.js';

export interface ShiftRow {
  id: string;
  location_id: string;
  shift_area_id: string | null;
  name: string;
  start_time: string;
  end_time: string;
  position: string | null;
  notes: string | null;
  status: 'draft' | 'scheduled' | 'open' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
}

export interface ShiftFilters {
  from?: string;
  to?: string;
  status?: ShiftRow['status'];
}

/** Manager view: every shift at their own location (RLS backstops this same scoping). */
export async function listShiftsForManager(locationId: string, filters: ShiftFilters): Promise<ShiftRow[]> {
  let query = supabase.from('shifts').select('*').eq('location_id', locationId);
  if (filters.from) query = query.gte('end_time', filters.from);
  if (filters.to) query = query.lte('start_time', filters.to);
  if (filters.status) query = query.eq('status', filters.status);
  const { data, error } = await query.order('start_time', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ShiftRow[];
}

/**
 * Employee view: only shifts they are staffed on (FR-014). The open shift board is a
 * separate endpoint (`GET /v1/open-shifts`, Phase 9) — this deliberately does not include
 * unclaimed open shifts, so an employee's calendar shows only what they're actually on.
 */
export async function listShiftsForEmployee(employeeId: string, filters: ShiftFilters): Promise<ShiftRow[]> {
  const { data: assignments, error: assignmentsError } = await supabase
    .from('shift_assignments')
    .select('shift_id')
    .eq('employee_id', employeeId);
  if (assignmentsError) throw assignmentsError;

  const shiftIds = (assignments ?? []).map((row) => row.shift_id as string);
  if (shiftIds.length === 0) return [];

  let query = supabase.from('shifts').select('*').in('id', shiftIds);
  if (filters.from) query = query.gte('end_time', filters.from);
  if (filters.to) query = query.lte('start_time', filters.to);
  if (filters.status) query = query.eq('status', filters.status);
  const { data, error } = await query.order('start_time', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ShiftRow[];
}

export async function findShiftById(id: string): Promise<ShiftRow | null> {
  const { data, error } = await supabase.from('shifts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as ShiftRow) ?? null;
}

export async function insertShift(input: {
  locationId: string;
  name: string;
  startTime: string;
  endTime: string;
  shiftAreaId?: string;
  position?: string;
  notes?: string;
  createdBy: string;
}): Promise<ShiftRow> {
  const { data, error } = await supabase
    .from('shifts')
    .insert({
      location_id: input.locationId,
      name: input.name,
      start_time: input.startTime,
      end_time: input.endTime,
      shift_area_id: input.shiftAreaId ?? null,
      position: input.position ?? null,
      notes: input.notes ?? null,
      status: 'draft',
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to create shift');
  return data as ShiftRow;
}

export async function updateShiftFields(
  id: string,
  patch: Partial<Pick<ShiftRow, 'name' | 'start_time' | 'end_time' | 'shift_area_id' | 'position' | 'notes' | 'status'>>,
): Promise<ShiftRow> {
  const { data, error } = await supabase.from('shifts').update(patch).eq('id', id).select().single();
  if (error || !data) throw error ?? new Error('Failed to update shift');
  return data as ShiftRow;
}
