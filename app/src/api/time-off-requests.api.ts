import { apiRequest } from './client';

export interface TimeOffRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  manager_comment: string | null;
}

export function createTimeOffRequest(input: { startDate: string; endDate: string; reason: string }): Promise<TimeOffRequest> {
  return apiRequest<TimeOffRequest>('/time-off-requests', { method: 'POST', body: input });
}

export function listMyTimeOffRequests(): Promise<TimeOffRequest[]> {
  return apiRequest<TimeOffRequest[]>('/time-off-requests', { query: { mine: true } });
}

export function listPendingTimeOffRequests(): Promise<TimeOffRequest[]> {
  return apiRequest<TimeOffRequest[]>('/time-off-requests');
}

export function decideTimeOffRequest(id: string, approve: boolean, comment?: string): Promise<TimeOffRequest> {
  return apiRequest<TimeOffRequest>(`/time-off-requests/${id}/decide`, { method: 'POST', body: { approve, comment } });
}
