import { supabase } from '../data/supabase-client.js';
import { findProfileById, updateProfile } from '../data/profiles.repo.js';
import { findAuthUserByEmail } from '../data/auth-users.repo.js';
import { generateTempPassword } from '../lib/temp-password.js';
import { sendTempPasswordEmail } from './email.service.js';

/**
 * Session exchange, self-service recovery, and password change only. There is deliberately no `signUp` export here —
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

/**
 * Best-effort throttle on self-service resets, keyed by email.
 *
 * A successful reset invalidates the account's current password, so an unthrottled public
 * endpoint lets anyone who knows a colleague's address lock them out repeatedly just by
 * submitting the form. This does not prevent that, it only makes it tedious.
 *
 * Honestly limited: the API runs serverless, so this map lives per warm instance and resets on
 * a cold start. It is a speed bump, not a control — real protection belongs at the edge (a WAF
 * rate-limit rule on this route), which is where it should be added before this is exposed to
 * the public internet at any scale.
 */
const RESET_THROTTLE_MS = 2 * 60 * 1000;
const lastResetByEmail = new Map<string, number>();

function isThrottled(email: string): boolean {
  const now = Date.now();
  const previous = lastResetByEmail.get(email);
  if (previous !== undefined && now - previous < RESET_THROTTLE_MS) return true;
  lastResetByEmail.set(email, now);
  // Bounded so a stream of distinct addresses cannot grow this without limit.
  if (lastResetByEmail.size > 5000) {
    for (const [key, at] of lastResetByEmail) {
      if (now - at >= RESET_THROTTLE_MS) lastResetByEmail.delete(key);
    }
  }
  return false;
}

/**
 * Self-service recovery: emails a fresh temporary password to a registered address, which the
 * user must then replace on sign-in exactly as a newly created account does.
 *
 * Returns nothing, in every case, on purpose. This route is public, so the caller must not be
 * able to tell a registered address from an unregistered one — no distinct status, no distinct
 * message, no thrown error. It also must never return the generated password itself: anyone
 * could otherwise reset an account they do not own and read the new credential straight out of
 * the response.
 *
 * The email is sent BEFORE the password is changed, which is the opposite of the obvious order
 * and the important detail here. Changing first and mailing second means a failed send (an
 * unverified domain, a bounce — both already seen on this project) leaves the person locked out
 * of an account they could previously use, with no way to learn the new password. Sending first
 * makes a failed send a clean no-op: their existing password still works and they can try
 * again. The cost is a brief window where the emailed password is not yet live, which a retry
 * resolves.
 */
export async function requestTempPassword(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (isThrottled(normalized)) return;

  const authUser = await findAuthUserByEmail(normalized);
  // Unregistered: do nothing, and reveal nothing about it.
  if (!authUser) return;

  const profile = await findProfileById(authUser.id);
  // A deactivated account must not be able to recover its own way back in.
  if (!profile || !profile.is_active) return;

  const tempPassword = generateTempPassword();

  const emailResult = await sendTempPasswordEmail({
    to: authUser.email,
    name: profile.name,
    tempPassword,
    isReset: true,
  });
  // Nothing has been changed yet, so this is a clean no-op. Deliberately no signal back to the
  // caller either — that would be an enumeration oracle.
  if (!emailResult.sent) return;

  const { error } = await supabase.auth.admin.updateUserById(authUser.id, { password: tempPassword });
  if (error) throw error;

  // 'pending' is what forces the change on next sign-in; without it this would be handing out a
  // permanent password by email.
  await updateProfile(authUser.id, { invite_status: 'pending' });
}

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
