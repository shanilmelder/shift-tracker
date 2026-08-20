import { supabase } from './supabase-client.js';

export interface ShiftAssignmentRow {
  id: string;
  shift_id: string;
  employee_id: string;
  is_leader: boolean;
  assigned_at: string;
}

export async function listAssignmentsForShift(shiftId: string): Promise<ShiftAssignmentRow[]> {
  const { data, error } = await supabase.from('shift_assignments').select('*').eq('shift_id', shiftId);
  if (error) throw error;
  return (data ?? []) as ShiftAssignmentRow[];
}

export async function isEmployeeAssignedToShift(shiftId: string, employeeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('shift_assignments')
    .select('id')
    .eq('shift_id', shiftId)
    .eq('employee_id', employeeId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/**
 * All of an employee's shift assignments in a time window, used by staffing.service.ts's
 * conflict detection (Phase 5) and by this phase's own detail view. Kept here rather than
 * duplicated, since both need "what else is this employee staffed on".
 */
export async function listAssignmentsForEmployeeInRange(
  employeeId: string,
  fromIso: string,
  toIso: string,
): Promise<Array<ShiftAssignmentRow & { shift: { start_time: string; end_time: string } }>> {
  const { data, error } = await supabase
    .from('shift_assignments')
    .select('*, shift:shifts!inner(start_time, end_time)')
    .eq('employee_id', employeeId)
    .gte('shift.end_time', fromIso)
    .lte('shift.start_time', toIso);
  if (error) throw error;
  return (data ?? []) as Array<ShiftAssignmentRow & { shift: { start_time: string; end_time: string } }>;
}
