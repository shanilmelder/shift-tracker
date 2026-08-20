import { apiRequest } from './client';

export interface SwapRequest {
  id: string;
  shift_id: string;
  requesting_employee_id: string;
  target_employee_id: string;
  status: 'pending' | 'coworker_accepted' | 'coworker_declined' | 'manager_approved' | 'denied';
  decided_by: string | null;
  manager_comment: string | null;
  created_at: string;
}

export function listEligibleCoworkers(shiftId: string): Promise<string[]> {
  return apiRequest<string[]>(`/shifts/${shiftId}/eligible-coworkers`);
}

export function createSwapRequest(shiftId: string, targetEmployeeId: string): Promise<SwapRequest> {
  return apiRequest<SwapRequest>('/swap-requests', { method: 'POST', body: { shiftId, targetEmployeeId } });
}

export function respondToSwapRequest(id: string, accept: boolean): Promise<SwapRequest> {
  return apiRequest<SwapRequest>(`/swap-requests/${id}/respond`, { method: 'POST', body: { accept } });
}

export function decideSwapRequest(id: string, approve: boolean, comment?: string): Promise<SwapRequest> {
  return apiRequest<SwapRequest>(`/swap-requests/${id}/decide`, { method: 'POST', body: { approve, comment } });
}

export function listMySwapRequests(): Promise<SwapRequest[]> {
  return apiRequest<SwapRequest[]>('/swap-requests');
}
