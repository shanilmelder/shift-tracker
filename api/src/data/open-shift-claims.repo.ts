import { supabase } from './supabase-client.js';

export interface OpenShiftClaimRow {
  id: string;
  shift_id: string;
  employee_id: string;
  claimed_at: string;
}

export async function insertClaim(shiftId: string, employeeId: string): Promise<OpenShiftClaimRow> {
  const { data, error } = await supabase
    .from('open_shift_claims')
    .upsert({ shift_id: shiftId, employee_id: employeeId }, { onConflict: 'shift_id,employee_id' })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to record claim');
  return data as OpenShiftClaimRow;
}

export async function listClaimsForShift(shiftId: string): Promise<OpenShiftClaimRow[]> {
  const { data, error } = await supabase.from('open_shift_claims').select('*').eq('shift_id', shiftId);
  if (error) throw error;
  return (data ?? []) as OpenShiftClaimRow[];
}

export async function findClaim(claimId: string): Promise<OpenShiftClaimRow | null> {
  const { data, error } = await supabase.from('open_shift_claims').select('*').eq('id', claimId).maybeSingle();
  if (error) throw error;
  return (data as OpenShiftClaimRow) ?? null;
}

export async function deleteClaimsForShift(shiftId: string): Promise<void> {
  const { error } = await supabase.from('open_shift_claims').delete().eq('shift_id', shiftId);
  if (error) throw error;
}

export async function listOpenShiftsForLocation(locationId: string) {
  const { data, error } = await supabase.from('shifts').select('*').eq('location_id', locationId).eq('status', 'open');
  if (error) throw error;
  return data ?? [];
}
