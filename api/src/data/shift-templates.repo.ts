import { supabase } from './supabase-client.js';

export interface ShiftTemplateRow {
  id: string;
  location_id: string;
  name: string;
  start_time: string;
  end_time: string;
  shift_area_id: string | null;
  created_by: string;
  created_at: string;
}

export interface InsertShiftTemplateInput {
  locationId: string;
  name: string;
  startTime: string;
  endTime: string;
  shiftAreaId?: string;
  createdBy: string;
}

export async function listForLocation(locationId: string): Promise<ShiftTemplateRow[]> {
  const { data, error } = await supabase.from('shift_templates').select('*').eq('location_id', locationId);
  if (error) throw error;
  return (data ?? []) as ShiftTemplateRow[];
}

export async function insert(input: InsertShiftTemplateInput): Promise<ShiftTemplateRow> {
  const { data, error } = await supabase
    .from('shift_templates')
    .insert({
      location_id: input.locationId,
      name: input.name,
      start_time: input.startTime,
      end_time: input.endTime,
      shift_area_id: input.shiftAreaId ?? null,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to create shift template');
  return data as ShiftTemplateRow;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('shift_templates').delete().eq('id', id);
  if (error) throw error;
}
