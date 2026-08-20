import { supabase } from './supabase-client.js';

export interface AvailabilityRow {
  id: string;
  employee_id: string;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  recurring: boolean;
  blocked_date: string | null;
}

export async function listForEmployee(employeeId: string): Promise<AvailabilityRow[]> {
  const { data, error } = await supabase.from('availability').select('*').eq('employee_id', employeeId);
  if (error) throw error;
  return (data ?? []) as AvailabilityRow[];
}

/** FR-016: full-replace — deletes all of the employee's existing rows and inserts the new set. */
export async function replaceForEmployee(
  employeeId: string,
  rows: Array<Pick<AvailabilityRow, 'day_of_week' | 'start_time' | 'end_time' | 'recurring' | 'blocked_date'>>,
): Promise<AvailabilityRow[]> {
  const { error: deleteError } = await supabase.from('availability').delete().eq('employee_id', employeeId);
  if (deleteError) throw deleteError;

  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from('availability')
    .insert(rows.map((row) => ({ ...row, employee_id: employeeId })))
    .select();
  if (error) throw error;
  return (data ?? []) as AvailabilityRow[];
}
