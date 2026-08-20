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
