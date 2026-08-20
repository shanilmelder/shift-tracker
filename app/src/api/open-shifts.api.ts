import { apiRequest } from './client';
import type { Shift } from '../types/api/shifts';

export interface OpenShiftClaim {
  id: string;
  shift_id: string;
  employee_id: string;
  claimed_at: string;
}

export function postShiftOpen(shiftId: string): Promise<Shift> {
  return apiRequest<Shift>(`/shifts/${shiftId}/post-open`, { method: 'POST' });
}

export function listOpenShifts(): Promise<Shift[]> {
  return apiRequest<Shift[]>('/open-shifts');
}

export function claimOpenShift(shiftId: string): Promise<OpenShiftClaim> {
  return apiRequest<OpenShiftClaim>(`/open-shifts/${shiftId}/claim`, { method: 'POST' });
}

export function listShiftClaims(shiftId: string): Promise<OpenShiftClaim[]> {
  return apiRequest<OpenShiftClaim[]>(`/shifts/${shiftId}/claims`);
}

export function confirmClaim(shiftId: string, claimId: string): Promise<{ confirmedEmployeeId: string }> {
  return apiRequest(`/shifts/${shiftId}/claims/${claimId}/confirm`, { method: 'POST' });
}
