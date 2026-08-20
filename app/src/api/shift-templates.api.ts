import { apiRequest } from './client';

export interface ShiftTemplate {
  id: string;
  name: string;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  shift_area_id: string | null;
}

export interface CreateShiftTemplateInput {
  name: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  shiftAreaId?: string;
}

export function listShiftTemplates(): Promise<ShiftTemplate[]> {
  return apiRequest<ShiftTemplate[]>('/shift-templates');
}

export function createShiftTemplate(input: CreateShiftTemplateInput): Promise<ShiftTemplate> {
  return apiRequest<ShiftTemplate>('/shift-templates', { method: 'POST', body: input });
}

export function deleteShiftTemplate(id: string): Promise<void> {
  return apiRequest<void>(`/shift-templates/${id}`, { method: 'DELETE' });
}
