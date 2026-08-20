import { supabase } from './supabase-client.js';

export interface ShiftAreaRow {
  id: string;
  location_id: string;
  name: string;
  created_at: string;
}

export async function listForLocation(locationId: string): Promise<ShiftAreaRow[]> {
  const { data, error } = await supabase.from('shift_areas').select('*').eq('location_id', locationId);
  if (error) throw error;
  return (data ?? []) as ShiftAreaRow[];
}

export async function insert(locationId: string, name: string): Promise<ShiftAreaRow> {
  const { data, error } = await supabase.from('shift_areas').insert({ location_id: locationId, name }).select().single();
  if (error || !data) throw error ?? new Error('Failed to create area');
  return data as ShiftAreaRow;
}

export async function rename(id: string, name: string): Promise<ShiftAreaRow> {
  const { data, error } = await supabase.from('shift_areas').update({ name }).eq('id', id).select().single();
  if (error || !data) throw error ?? new Error('Failed to rename area');
  return data as ShiftAreaRow;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('shift_areas').delete().eq('id', id);
  if (error) throw error;
}

export async function isReferencedByAnyShift(id: string): Promise<boolean> {
  const { data, error } = await supabase.from('shifts').select('id').eq('shift_area_id', id).limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}
