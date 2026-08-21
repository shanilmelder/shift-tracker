import { supabase } from './supabase-client.js';

export interface ProfileRow {
  id: string;
  name: string;
  role: 'employee' | 'manager';
  phone: string | null;
  avatar_url: string | null;
  location_id: string;
  job_role: string | null;
  pay_rate: number | null;
  is_active: boolean;
  invite_status: 'pending' | 'accepted';
  notification_prefs: Record<string, boolean>;
  created_by: string | null;
  created_at: string;
}

// There is deliberately no `insertProfile` here. A profile may only come into existence
// alongside its auth user, via the on_auth_user_created trigger (0022 migration) — an insert
// helper on this side would let a caller create a profile with no account behind it, which is
// the mirror image of the drift that trigger exists to prevent.

export async function findProfileById(id: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as ProfileRow) ?? null;
}

export async function listProfilesByLocation(locationId: string): Promise<ProfileRow[]> {
  const { data, error } = await supabase.from('profiles').select('*').eq('location_id', locationId);
  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}

export async function updateProfile(
  id: string,
  patch: Partial<Pick<ProfileRow, 'name' | 'phone' | 'job_role' | 'pay_rate' | 'location_id' | 'is_active' | 'invite_status'>>,
): Promise<ProfileRow> {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select().single();
  if (error || !data) throw error ?? new Error('Failed to update profile');
  return data as ProfileRow;
}

export async function updateOwnProfile(
  id: string,
  patch: Partial<Pick<ProfileRow, 'name' | 'phone' | 'avatar_url' | 'notification_prefs'>>,
): Promise<ProfileRow> {
  // Deliberately a separate function from updateProfile: the set of columns accepted here
  // excludes role, pay_rate, and location_id, so a self-update can never touch them even if
  // a future caller adds a field to this patch type without checking — the type itself is the
  // enforcement (constitution: Security First, authorization enforced at the data layer, not
  // by trusting the caller to only send "safe" fields).
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select().single();
  if (error || !data) throw error ?? new Error('Failed to update profile');
  return data as ProfileRow;
}

/** Every table whose rows would block a hard delete of a profile, and the column that points at it. */
const BLOCKING_REFERENCES: ReadonlyArray<{ table: string; column: string; label: string }> = [
  { table: 'shift_assignments', column: 'employee_id', label: 'shift assignments' },
  { table: 'time_entries', column: 'employee_id', label: 'clock-in records' },
  { table: 'availability', column: 'employee_id', label: 'availability entries' },
  { table: 'time_off_requests', column: 'employee_id', label: 'time-off requests' },
  { table: 'time_off_requests', column: 'decided_by', label: 'time-off decisions' },
  { table: 'shift_swap_requests', column: 'requesting_employee_id', label: 'swap requests' },
  { table: 'shift_swap_requests', column: 'target_employee_id', label: 'swap requests' },
  { table: 'shift_swap_requests', column: 'decided_by', label: 'swap decisions' },
  { table: 'open_shift_claims', column: 'employee_id', label: 'open-shift claims' },
  { table: 'announcements', column: 'sender_id', label: 'announcements sent' },
  { table: 'shifts', column: 'created_by', label: 'shifts created' },
  { table: 'shift_templates', column: 'created_by', label: 'shifts created' },
  { table: 'profiles', column: 'created_by', label: 'staff accounts created' },
];

/**
 * What still points at this profile. Every one of these foreign keys is NO ACTION, so a hard
 * delete fails at the database if any row exists — checking first turns an opaque constraint
 * error into a list the manager can act on. `device_push_tokens` is absent deliberately: it
 * cascades, so it never blocks.
 */
export async function findBlockingReferences(profileId: string): Promise<string[]> {
  const counts = await Promise.all(
    BLOCKING_REFERENCES.map(async (ref) => {
      const { count, error } = await supabase
        .from(ref.table)
        .select('*', { count: 'exact', head: true })
        .eq(ref.column, profileId);
      if (error) throw error;
      return { label: ref.label, count: count ?? 0 };
    }),
  );
  // Deduplicated because several columns share a label (a swap can reference someone three ways).
  return Array.from(new Set(counts.filter((c) => c.count > 0).map((c) => c.label)));
}

/** Active managers at a location — used to refuse removing or demoting the last one. */
export async function countActiveManagers(locationId: string, excludingId?: string): Promise<number> {
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('location_id', locationId)
    .eq('role', 'manager')
    .eq('is_active', true);
  if (excludingId) query = query.neq('id', excludingId);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}
