import { supabase } from './supabase-client.js';

export interface SwapRequestRow {
  id: string;
  shift_id: string;
  /** Display fields, present only on the reads that join them. Ids alone are unreadable in a
   * UI — a manager approving a swap needs to see who and which shift. */
  shift_name?: string;
  shift_start_time?: string;
  requesting_employee_name?: string;
  target_employee_name?: string;
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

/**
 * Every embed here names its foreign key explicitly. This table has THREE foreign keys to
 * profiles — requesting_employee_id, target_employee_id and decided_by — so a bare
 * `profiles(...)` is ambiguous and PostgREST rejects it outright with PGRST201.
 */
const SWAP_SELECT =
  '*, shift:shifts!inner(name, start_time, location_id),' +
  ' requester:profiles!shift_swap_requests_requesting_employee_id_fkey(name),' +
  ' target:profiles!shift_swap_requests_target_employee_id_fkey(name)';

interface EmbeddedSwapRow {
  shift?: { name?: string; start_time?: string } | null;
  requester?: { name?: string } | null;
  target?: { name?: string } | null;
}

function toSwapRow(row: unknown): SwapRequestRow {
  const embedded = row as EmbeddedSwapRow;
  return {
    ...(row as SwapRequestRow),
    shift_name: embedded.shift?.name,
    shift_start_time: embedded.shift?.start_time,
    requesting_employee_name: embedded.requester?.name,
    target_employee_name: embedded.target?.name,
  };
}

export async function listSwapRequestsForEmployee(employeeId: string): Promise<SwapRequestRow[]> {
  const { data, error } = await supabase
    .from('shift_swap_requests')
    .select(SWAP_SELECT)
    .or(`requesting_employee_id.eq.${employeeId},target_employee_id.eq.${employeeId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toSwapRow);
}

/**
 * Every swap on shifts at one location — what a manager's approvals queue needs.
 *
 * There was no location-scoped read at all before this: the swap list endpoint always filtered
 * to the caller's own requests, and a manager is neither the requester nor the target of a
 * swap, so their approvals queue was structurally guaranteed to be empty.
 */
export async function listSwapRequestsForLocation(locationId: string): Promise<SwapRequestRow[]> {
  const { data, error } = await supabase
    .from('shift_swap_requests')
    .select(SWAP_SELECT)
    .eq('shift.location_id', locationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toSwapRow);
}
