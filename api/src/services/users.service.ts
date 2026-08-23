import { supabase } from '../data/supabase-client.js';
import {
  findProfileById,
  updateProfile,
  findBlockingReferences,
  countActiveManagers,
  type ProfileRow,
} from '../data/profiles.repo.js';
import { generateTempPassword } from '../lib/temp-password.js';
import { sendTempPasswordEmail } from './email.service.js';

/**
 * GoTrue collapses anything a trigger or constraint raises on `auth.users` into one opaque
 * message and throws the Postgres detail/hint away entirely — the response body is literally
 * `{ message: 'Database error creating new user', status: 500 }` and nothing else (verified
 * against this project's GoTrue). The wording has differed across versions, hence the loose
 * match rather than an equality check.
 */
const OPAQUE_DB_ERROR = /database error (creating|saving) new user/i;

/**
 * A create that the database refused. Carries `statusCode` so app.ts's error handler renders
 * it as a 4xx with the message intact, rather than the blanket 500 "Something went wrong"
 * that GoTrue's own status would otherwise produce.
 */
export class AccountProvisioningError extends Error {
  readonly statusCode = 422;
  readonly code = 'ACCOUNT_PROVISIONING_FAILED';
  constructor(message: string) {
    super(message);
    this.name = 'AccountProvisioningError';
  }
}

/**
 * Works out why the insert was refused, so the manager gets a cause instead of "Database
 * error". Only ever called on the failure path, so the extra lookup costs nothing in the
 * normal case. A missing location is the one cause reachable through the API — the schema
 * already guarantees a well-formed uuid, name and role, but not that the location exists.
 */
async function explainProvisioningFailure(input: CreateUserInput): Promise<string> {
  const { data: location } = await supabase.from('locations').select('id').eq('id', input.locationId).maybeSingle();
  if (!location) {
    return `No location exists with id ${input.locationId}, so the account could not be created. Choose an existing location and try again.`;
  }
  return (
    'The database refused to create this account. This is the on_auth_user_created trigger ' +
    'rejecting the profile it would have created — see the Postgres logs in Supabase for the ' +
    'specific constraint.'
  );
}

export interface CreateUserInput {
  name: string;
  role: 'employee' | 'manager';
  locationId: string;
  email: string;
  phone?: string;
  jobRole?: string;
  payRate?: number;
  createdBy: string;
}

export interface CreatedUser {
  id: string;
  name: string;
  role: 'employee' | 'manager';
  locationId: string;
  inviteStatus: 'pending' | 'accepted';
  /**
   * Returned to the creating manager exactly once, in this response, and never stored or
   * readable again. Supabase only keeps the hash, so a lost one is reissued, not recovered.
   *
   * Shown even when the email went out: mail is the part of this flow that fails (unverified
   * domains, bounces, spam folders), and a manager who can read the password to someone is
   * the difference between onboarding working and being stuck.
   */
  tempPassword: string;
  /** False when the email could not be sent — the manager then has to pass it on themselves. */
  emailSent: boolean;
  /** Why the email failed, for the manager to act on. Absent when it sent. */
  emailError?: string;
}

/**
 * The one path to creating an account in this entire system (FR-004/FR-005): there is no
 * sign-up endpoint, so this is only ever reachable from an authenticated manager's request
 * (enforced by requireManager in the route, not here — this function trusts its caller has
 * already been authorized).
 *
 * The `profiles` row is NOT written here. It is created by the `on_auth_user_created` trigger
 * (0022 migration) from the `app_metadata` passed below, inside the same transaction as the
 * auth user — so the two can no longer be created separately and drift apart. This replaces
 * the previous two-call insert plus compensating delete (research.md #10), which could still
 * leave a signed-in-but-profileless account behind if the compensating delete itself failed.
 *
 * `app_metadata` specifically, never `user_metadata`: the latter is writable by the user with
 * their own token, so role and location must not come from it.
 */
export async function createUser(input: CreateUserInput): Promise<CreatedUser> {
  const tempPassword = generateTempPassword();

  const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    // Confirmed outright: the account is provisioned by a manager who already knows who this
    // person is, and there is no confirmation link in this flow to click. Left false, GoTrue
    // refuses the password sign-in that is the whole point of the temp password.
    email_confirm: true,
    app_metadata: {
      name: input.name,
      role: input.role,
      location_id: input.locationId,
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.jobRole !== undefined ? { job_role: input.jobRole } : {}),
      ...(input.payRate !== undefined ? { pay_rate: String(input.payRate) } : {}),
      created_by: input.createdBy,
    },
  });

  // A trigger failure (e.g. missing metadata, or a location_id that doesn't exist) aborts the
  // auth insert too, so there is no half-created account to clean up.
  if (authError || !authResult?.user) {
    if (authError && OPAQUE_DB_ERROR.test(authError.message)) {
      throw new AccountProvisioningError(await explainProvisioningFailure(input));
    }
    throw authError ?? new Error('Failed to create auth user');
  }

  const authUserId = authResult.user.id;

  try {
    const profile = await findProfileById(authUserId);
    if (!profile) throw new Error('Profile was not created for the new auth user');

    // Best-effort, and deliberately NOT a reason to fail the create: the account is already
    // valid and the manager is handed the password below either way. Rolling back here is what
    // made an unverified email domain look like "user creation is broken".
    const emailResult = await sendTempPasswordEmail({
      to: input.email,
      name: input.name,
      tempPassword,
      isReset: false,
    });

    return { ...toCreatedUser(profile), tempPassword, emailSent: emailResult.sent, ...(emailResult.error ? { emailError: emailResult.error } : {}) };
  } catch (err) {
    // Now only reachable when the trigger did not produce a profile — an account that exists
    // in auth but has no profile can neither sign in usefully nor be managed, so it is removed
    // rather than left behind. Deleting the auth user cascades the profile away with it.
    await supabase.auth.admin.deleteUser(authUserId);
    throw err;
  }
}

/**
 * Issues a fresh temporary password for an existing account and puts it back into the
 * "must choose a password" state.
 *
 * This is the whole password-recovery story for staff: there is no emailed reset link, so a
 * locked-out employee asks a manager, who does this. That trade is deliberate — it removes the
 * app's dependency on deep links entirely, at the cost of self-service recovery out of hours.
 */
export async function issueTempPassword(
  callerId: string,
  id: string,
): Promise<{ ok: true; tempPassword: string; emailSent: boolean; emailError?: string; profile: ProfileRow } | { ok: false; reason: 'not_found' }> {
  const existing = await findProfileById(id);
  if (!existing) return { ok: false, reason: 'not_found' };

  const tempPassword = generateTempPassword();
  const { error } = await supabase.auth.admin.updateUserById(id, { password: tempPassword });
  if (error) throw error;

  // Back to 'pending', which is what forces the change-password prompt on next sign-in. Without
  // this the user could keep using the manager-known temp password indefinitely.
  const profile = await updateProfile(id, { invite_status: 'pending' });

  const { data: authUser } = await supabase.auth.admin.getUserById(id);
  const email = authUser?.user?.email;
  const emailResult = email
    ? await sendTempPasswordEmail({ to: email, name: existing.name, tempPassword, isReset: true })
    : { sent: false, error: 'This account has no email address on file.' };

  return {
    ok: true,
    tempPassword,
    emailSent: emailResult.sent,
    ...(emailResult.error ? { emailError: emailResult.error } : {}),
    profile,
  };
}

export async function deactivateUser(id: string): Promise<ProfileRow> {
  return updateProfile(id, { is_active: false });
}

export type UpdateUserResult =
  | { ok: true; profile: ProfileRow }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'last_manager' }
  | { ok: false; reason: 'own_role' };

/**
 * Manager-side edit of someone else's profile. Two guards, both about not locking the location
 * out of its own admin: a manager may not change their own role (there would be nobody left
 * able to change it back), and the last active manager may not be demoted.
 */
export async function updateUser(
  callerId: string,
  id: string,
  patch: { name?: string; phone?: string; jobRole?: string; payRate?: number; locationId?: string; role?: 'employee' | 'manager' },
): Promise<UpdateUserResult> {
  const existing = await findProfileById(id);
  if (!existing) return { ok: false, reason: 'not_found' };

  if (patch.role !== undefined && patch.role !== existing.role) {
    if (id === callerId) return { ok: false, reason: 'own_role' };
    if (existing.role === 'manager' && (await countActiveManagers(existing.location_id, id)) === 0) {
      return { ok: false, reason: 'last_manager' };
    }
  }

  const profile = await updateProfile(id, {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
    ...(patch.jobRole !== undefined ? { job_role: patch.jobRole } : {}),
    ...(patch.payRate !== undefined ? { pay_rate: patch.payRate } : {}),
    ...(patch.locationId !== undefined ? { location_id: patch.locationId } : {}),
    ...(patch.role !== undefined ? { role: patch.role } : {}),
  });
  return { ok: true, profile };
}

export async function setUserActive(callerId: string, id: string, isActive: boolean): Promise<UpdateUserResult> {
  const existing = await findProfileById(id);
  if (!existing) return { ok: false, reason: 'not_found' };
  if (!isActive && existing.role === 'manager' && (await countActiveManagers(existing.location_id, id)) === 0) {
    return { ok: false, reason: 'last_manager' };
  }
  return { ok: true, profile: await updateProfile(id, { is_active: isActive }) };
}

export type DeleteUserResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'self' }
  | { ok: false; reason: 'last_manager' }
  | { ok: false; reason: 'has_history'; references: string[] };

/**
 * Hard-deletes a staff account: the auth user goes, and `profiles` (plus their push tokens)
 * cascades away with it.
 *
 * Refused whenever anything still references the person — every foreign key to `profiles`
 * except push tokens is NO ACTION, so the delete would fail at the database anyway, and a
 * shift they worked or a request they filed is history that shouldn't vanish. Deactivating is
 * the right move there, which is why `setUserActive` exists alongside this.
 */
export async function deleteUser(callerId: string, id: string): Promise<DeleteUserResult> {
  if (id === callerId) return { ok: false, reason: 'self' };

  const existing = await findProfileById(id);
  if (!existing) return { ok: false, reason: 'not_found' };

  if (existing.role === 'manager' && (await countActiveManagers(existing.location_id, id)) === 0) {
    return { ok: false, reason: 'last_manager' };
  }

  const references = await findBlockingReferences(id);
  if (references.length > 0) return { ok: false, reason: 'has_history', references };

  // Deleting the auth user is what removes the profile — profiles.id references auth.users
  // with ON DELETE CASCADE, so this is the one call that cleans up both.
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) throw error;
  return { ok: true };
}

function toCreatedUser(profile: ProfileRow): Omit<CreatedUser, 'tempPassword' | 'emailSent' | 'emailError'> {
  return {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    locationId: profile.location_id,
    inviteStatus: profile.invite_status,
  };
}
