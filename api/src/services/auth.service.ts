import { supabase } from '../data/supabase-client.js';
import { findProfileById, updateProfile } from '../data/profiles.repo.js';

/**
 * Session exchange and password change only. There is deliberately no `signUp` export here —
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

// There is deliberately no `requestPasswordReset` here any more. Recovery is manager-issued
// (users.service.ts's `issueTempPassword`): a locked-out user asks a manager, who sends them a
// fresh temporary password. That removes this app's dependency on email deep links entirely —
// they never worked in Expo Go, and a custom scheme needs a real build to register at all.

export async function getMe(profileId: string) {
  const profile = await findProfileById(profileId);
  if (!profile) throw new Error('Profile not found');
  return profile;
}

/**
 * Sets the caller's password: a signed-in user changing it, or — the common case — someone who
 * has just signed in with a manager-issued temporary password and is being made to replace it.
 *
 * Flipping invite_status to 'accepted' is what lifts the block in
 * require-password-change.middleware.ts, so this is the only way out of that state. A no-op if
 * it was already 'accepted'.
 */
export async function setPassword(profileId: string, password: string): Promise<void> {
  const { error } = await supabase.auth.admin.updateUserById(profileId, { password });
  if (error) throw error;
  await updateProfile(profileId, { invite_status: 'accepted' });
}
