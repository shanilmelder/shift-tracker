import { supabase } from '../data/supabase-client.js';
import {
  findProfileById,
  updateProfile,
  findBlockingReferences,
  countActiveManagers,
  type ProfileRow,
} from '../data/profiles.repo.js';
import { RESET_PASSWORD_DEEP_LINK } from '../config/app-links.js';

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
  const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    email_confirm: false,
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

    // Send the invite (email or SMS, per FR-007) so the new user sets their own password —
    // this call intentionally never has a password to hand back to the manager.
    await supabase.auth.admin.inviteUserByEmail(input.email, { redirectTo: RESET_PASSWORD_DEEP_LINK });

    return toCreatedUser(profile);
  } catch (err) {
    // Only reachable if the invite send fails: deleting the auth user cascades the profile
    // away with it, leaving nothing behind for the manager to retry around.
    await supabase.auth.admin.deleteUser(authUserId);
    throw err;
  }
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

function toCreatedUser(profile: ProfileRow): CreatedUser {
  return {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    locationId: profile.location_id,
    inviteStatus: profile.invite_status,
  };
}
