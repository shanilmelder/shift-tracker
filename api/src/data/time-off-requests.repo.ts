import { supabase } from './supabase-client.js';

export interface TimeOffRequestRow {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  manager_comment: string | null;
  decided_by: string | null;
  created_at: string;
}

export async function insertTimeOffRequest(input: {
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<TimeOffRequestRow> {
  const { data, error } = await supabase
    .from('time_off_requests')
    .insert({ employee_id: input.employeeId, start_date: input.startDate, end_date: input.endDate, reason: input.reason })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to create time-off request');
  return data as TimeOffRequestRow;
}

export async function listForEmployee(employeeId: string): Promise<TimeOffRequestRow[]> {
  const { data, error } = await supabase.from('time_off_requests').select('*').eq('employee_id', employeeId);
  if (error) throw error;
  return (data ?? []) as TimeOffRequestRow[];
}

export async function listForLocation(locationId: string): Promise<TimeOffRequestRow[]> {
  const { data, error } = await supabase
    .from('time_off_requests')
    .select('*, employee:profiles!inner(location_id)')
    .eq('employee.location_id', locationId);
  if (error) throw error;
  return (data ?? []) as TimeOffRequestRow[];
}

export async function findById(id: string): Promise<TimeOffRequestRow | null> {
  const { data, error } = await supabase.from('time_off_requests').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as TimeOffRequestRow) ?? null;
}

export async function decide(id: string, input: { status: 'approved' | 'denied'; decidedBy: string; comment?: string }): Promise<TimeOffRequestRow> {
  const { data, error } = await supabase
    .from('time_off_requests')
    .update({ status: input.status, decided_by: input.decidedBy, manager_comment: input.comment ?? null })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to update time-off request');
  return data as TimeOffRequestRow;
}

/** Approved time-off rows for an employee overlapping a given window — used by both the
 * staffing conflict check (FR-036) and the standalone `hasApprovedTimeOff` helper below. */
export async function findApprovedOverlapping(employeeId: string, startIso: string, endIso: string): Promise<TimeOffRequestRow[]> {
  const startDate = startIso.slice(0, 10);
  const endDate = endIso.slice(0, 10);
  const { data, error } = await supabase
    .from('time_off_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .lte('start_date', endDate)
    .gte('end_date', startDate);
  if (error) throw error;
  return (data ?? []) as TimeOffRequestRow[];
}
