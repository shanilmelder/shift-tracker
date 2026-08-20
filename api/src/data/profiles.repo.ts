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

export interface InsertProfileInput {
  id: string;
  name: string;
  role: 'employee' | 'manager';
  phone?: string;
  locationId: string;
  jobRole?: string;
  payRate?: number;
  createdBy: string;
}

export async function insertProfile(input: InsertProfileInput): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: input.id,
      name: input.name,
      role: input.role,
      phone: input.phone ?? null,
      location_id: input.locationId,
      job_role: input.jobRole ?? null,
      pay_rate: input.payRate ?? null,
      created_by: input.createdBy,
    })
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to insert profile');
  }
  return data as ProfileRow;
}

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
