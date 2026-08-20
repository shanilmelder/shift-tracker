import { supabase } from './supabase-client.js';
import type { TimeEntryBreakRow } from './time-entries.repo.js';

export async function findOpenBreak(timeEntryId: string): Promise<TimeEntryBreakRow | null> {
  const { data, error } = await supabase
    .from('time_entry_breaks')
    .select('*')
    .eq('time_entry_id', timeEntryId)
    .is('break_end_at', null)
    .maybeSingle();
  if (error) throw error;
  return (data as TimeEntryBreakRow) ?? null;
}

export async function insertBreakStart(timeEntryId: string): Promise<TimeEntryBreakRow> {
  const { data, error } = await supabase
    .from('time_entry_breaks')
    .insert({ time_entry_id: timeEntryId })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to start break');
  return data as TimeEntryBreakRow;
}

export async function recordBreakEnd(id: string, endAt: string): Promise<TimeEntryBreakRow> {
  const { data, error } = await supabase.from('time_entry_breaks').update({ break_end_at: endAt }).eq('id', id).select().single();
  if (error || !data) throw error ?? new Error('Failed to end break');
  return data as TimeEntryBreakRow;
}
