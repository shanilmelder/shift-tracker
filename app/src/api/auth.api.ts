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

/**
 * Sets the caller's password. `accessToken` is the invite/recovery link's token when
 * completing an invite or reset (see reset-password.tsx) — a normal Supabase session JWT, so
 * it works as a bearer token here the same way a signed-in user's own token would.
 */
export function setPassword(password: string, accessToken: string): Promise<void> {
  return apiRequest<void>('/auth/password', { method: 'PATCH', body: { password }, overrideAccessToken: accessToken });
}
