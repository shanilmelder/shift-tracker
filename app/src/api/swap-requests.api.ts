import { apiRequest } from './client';

export interface SwapRequest {
  id: string;
  shift_id: string;
  /** Joined for display. Optional because only the list reads carry them; a single swap
   * returned from a mutation is the bare row. */
  shift_name?: string;
  shift_start_time?: string;
  requesting_employee_name?: string;
  target_employee_name?: string;
  requesting_employee_id: string;
  target_employee_id: string;
  status: 'pending' | 'coworker_accepted' | 'coworker_declined' | 'manager_approved' | 'denied';
  decided_by: string | null;
  manager_comment: string | null;
  created_at: string;
}

export interface EligibleCoworker {
  id: string;
  name: string;
}

/** Excludes the caller and anyone whose schedule conflicts with the shift. */
export function listEligibleCoworkers(shiftId: string): Promise<EligibleCoworker[]> {
  return apiRequest<EligibleCoworker[]>(`/shifts/${shiftId}/eligible-coworkers`);
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
  // `mine=true` matters for a manager, who otherwise gets their whole location's swaps here.
  return apiRequest<SwapRequest[]>('/swap-requests', { query: { mine: 'true' } });
}

/** Every swap at the manager's location — the approvals queue. Manager-only server-side. */
export function listLocationSwapRequests(): Promise<SwapRequest[]> {
  return apiRequest<SwapRequest[]>('/swap-requests');
}
