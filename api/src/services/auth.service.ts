import { supabase } from '../data/supabase-client.js';
import { findProfileById, updateProfile } from '../data/profiles.repo.js';
import { RESET_PASSWORD_DEEP_LINK } from '../config/app-links.js';

/**
 * Session exchange and password reset only. There is deliberately no `signUp` export here —
 * account creation is manager-only (users.service.ts), never self-service (FR-002/FR-005).
 */
export async function createSession(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw error ?? new Error('Sign-in failed');
  }
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
  };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: RESET_PASSWORD_DEEP_LINK });
  if (error) throw error;
}

export async function getMe(profileId: string) {
  const profile = await findProfileById(profileId);
  if (!profile) throw new Error('Profile not found');
  return profile;
}

/**
 * Sets the caller's password. Reachable two ways with identical effect: a signed-in user
 * changing their password, or a brand-new/reset-requesting user whose invite/recovery
 * access_token (a normal Supabase session JWT, per Supabase's own redirect flow) was accepted
 * by authMiddleware like any other bearer token — no separate token-verification path needed.
 * Flips invite_status to 'accepted', a no-op if it already was.
 */
export async function setPassword(profileId: string, password: string): Promise<void> {
  const { error } = await supabase.auth.admin.updateUserById(profileId, { password });
  if (error) throw error;
  await updateProfile(profileId, { invite_status: 'accepted' });
}
