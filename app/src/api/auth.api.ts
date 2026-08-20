import { apiRequest } from './client';

export interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface MeResponse {
  id: string;
  name: string;
  role: 'employee' | 'manager';
  location_id: string;
}

export function signIn(email: string, password: string): Promise<SessionResponse> {
  return apiRequest<SessionResponse>('/auth/session', { method: 'POST', body: { email, password } });
}

export function requestPasswordReset(email: string): Promise<void> {
  return apiRequest<void>('/auth/password-reset', { method: 'POST', body: { email } });
}

export function fetchMe(overrideAccessToken?: string): Promise<MeResponse> {
  return apiRequest<MeResponse>('/auth/me', { overrideAccessToken });
}
