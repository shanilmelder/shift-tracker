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
  /** 'pending' means the account is still on a manager-issued temporary password. The API
   * refuses every other route until it becomes 'accepted' (see the API's
   * require-password-change middleware), so the app must route to the change screen on this. */
  invite_status: 'pending' | 'accepted';
}

export function signIn(email: string, password: string): Promise<SessionResponse> {
  return apiRequest<SessionResponse>('/auth/session', { method: 'POST', body: { email, password } });
}

// No requestPasswordReset: there is no self-service reset. A locked-out user asks a manager,
// who issues a new temporary password (see admin-users.api.ts's resetStaffPassword).

export function fetchMe(overrideAccessToken?: string): Promise<MeResponse> {
  return apiRequest<MeResponse>('/auth/me', { overrideAccessToken });
}

/**
 * Sets the caller's password, using the session token already held by the store — the user is
 * signed in when they do this, having just authenticated with their temporary password.
 *
 * This is one of the few routes the API allows through while an account is still 'pending';
 * succeeding here is what unlocks the rest of it.
 */
export function setPassword(password: string): Promise<void> {
  return apiRequest<void>('/auth/password', { method: 'PATCH', body: { password } });
}
