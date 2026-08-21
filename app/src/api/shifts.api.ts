import { apiRequest } from './client';
import type { Shift, ShiftDetail, ShiftStatus } from '../types/api/shifts';

export interface ListShiftsParams {
  from?: string;
  to?: string;
  status?: ShiftStatus;
  // Index signature so this is structurally assignable to apiRequest's generic query-param
  // type — without it, an interface with only known keys isn't considered assignable to a
  // Record<string, ...> even though every value here fits that shape.
  [key: string]: string | number | boolean | undefined;
}

export function listShifts(params: ListShiftsParams = {}): Promise<Shift[]> {
  return apiRequest<Shift[]>('/shifts', { query: params });
}

export function getShift(shiftId: string): Promise<ShiftDetail> {
  return apiRequest<ShiftDetail>(`/shifts/${shiftId}`);
}

export interface CreateShiftInput {
  name: string;
  startTime: string;
  endTime: string;
  shiftAreaId?: string;
  position?: string;
  notes?: string;
  /** Links the new shift to the template it came from, so deleting that template deletes this
   * shift too. Omitted for shifts created outside the Build screen's Assign step. */
  templateId?: string;
}

export function createShift(input: CreateShiftInput): Promise<Shift> {
  return apiRequest<Shift>('/shifts', { method: 'POST', body: input });
}

export interface UpdateShiftInput {
  name?: string;
  startTime?: string;
  endTime?: string;
  shiftAreaId?: string | null;
  position?: string | null;
  notes?: string | null;
}

export function updateShift(shiftId: string, input: UpdateShiftInput): Promise<Shift> {
  return apiRequest<Shift>(`/shifts/${shiftId}`, { method: 'PATCH', body: input });
}

/**
 * Deletes a shift outright. The API cascades this to the shift's staffing rows, so callers
 * must confirm with the user first (see the edit screen's ConfirmDialog) — this is not the
 * reversible "cancel" path.
 */
export function deleteShift(shiftId: string): Promise<void> {
  return apiRequest<void>(`/shifts/${shiftId}`, { method: 'DELETE' });
}
