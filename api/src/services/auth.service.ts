import { supabase } from '../data/supabase-client.js';
import { findProfileById } from '../data/profiles.repo.js';

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
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function getMe(profileId: string) {
  const profile = await findProfileById(profileId);
  if (!profile) throw new Error('Profile not found');
  return profile;
}
