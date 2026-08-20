import { supabase } from './supabase-client.js';

export interface SwapRequestRow {
  id: string;
  shift_id: string;
  requesting_employee_id: string;
  target_employee_id: string;
  status: 'pending' | 'coworker_accepted' | 'coworker_declined' | 'manager_approved' | 'denied';
  decided_by: string | null;
  manager_comment: string | null;
  created_at: string;
}

export async function insertSwapRequest(input: {
  shiftId: string;
  requestingEmployeeId: string;
  targetEmployeeId: string;
}): Promise<SwapRequestRow> {
  const { data, error } = await supabase
    .from('shift_swap_requests')
    .insert({ shift_id: input.shiftId, requesting_employee_id: input.requestingEmployeeId, target_employee_id: input.targetEmployeeId })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to create swap request');
  return data as SwapRequestRow;
}

export async function findSwapRequestById(id: string): Promise<SwapRequestRow | null> {
  const { data, error } = await supabase.from('shift_swap_requests').select('*').eq('id', id).single();
  if (error) return null;
  return (data as SwapRequestRow) ?? null;
}

export async function updateSwapRequest(
  id: string,
  patch: Partial<Pick<SwapRequestRow, 'status' | 'decided_by' | 'manager_comment'>>,
): Promise<SwapRequestRow> {
  const { data, error } = await supabase.from('shift_swap_requests').update(patch).eq('id', id).select().single();
  if (error || !data) throw error ?? new Error('Failed to update swap request');
  return data as SwapRequestRow;
}

export async function listSwapRequestsForEmployee(employeeId: string): Promise<SwapRequestRow[]> {
  const { data, error } = await supabase
    .from('shift_swap_requests')
    .select('*')
    .or(`requesting_employee_id.eq.${employeeId},target_employee_id.eq.${employeeId}`);
  if (error) throw error;
  return (data ?? []) as SwapRequestRow[];
}
