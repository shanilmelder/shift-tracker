import { supabase } from '../data/supabase-client.js';
import { insertProfile, updateProfile, type ProfileRow } from '../data/profiles.repo.js';

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
 * Supabase Auth's `admin.inviteUserByEmail` and the `profiles` insert are two separate calls
 * against two different subsystems with no shared transaction, so a failed profile insert
 * triggers a compensating delete of the just-created auth user (research.md #10) — otherwise
 * a partially-created account (auth user with no profile) could be left behind.
 */
export async function createUser(input: CreateUserInput): Promise<CreatedUser> {
  const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    email_confirm: false,
  });

  if (authError || !authResult?.user) {
    throw authError ?? new Error('Failed to create auth user');
  }

  const authUserId = authResult.user.id;

  try {
    const profile = await insertProfile({
      id: authUserId,
      name: input.name,
      role: input.role,
      phone: input.phone,
      locationId: input.locationId,
      jobRole: input.jobRole,
      payRate: input.payRate,
      createdBy: input.createdBy,
    });

    // Send the invite (email or SMS, per FR-007) so the new user sets their own password —
    // this call intentionally never has a password to hand back to the manager.
    await supabase.auth.admin.inviteUserByEmail(input.email);

    return toCreatedUser(profile);
  } catch (err) {
    await supabase.auth.admin.deleteUser(authUserId);
    throw err;
  }
}

export async function deactivateUser(id: string): Promise<ProfileRow> {
  return updateProfile(id, { is_active: false });
}

export async function updateUser(
  id: string,
  patch: { name?: string; jobRole?: string; payRate?: number; locationId?: string },
): Promise<ProfileRow> {
  return updateProfile(id, {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.jobRole !== undefined ? { job_role: patch.jobRole } : {}),
    ...(patch.payRate !== undefined ? { pay_rate: patch.payRate } : {}),
    ...(patch.locationId !== undefined ? { location_id: patch.locationId } : {}),
  });
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
