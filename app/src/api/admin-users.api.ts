import { apiRequest } from './client';

export interface CreateStaffInput {
  name: string;
  role: 'employee' | 'manager';
  email: string;
  phone?: string;
  locationId: string;
  jobRole?: string;
  payRate?: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'employee' | 'manager';
  locationId: string;
  inviteStatus: 'pending' | 'accepted';
}

/** What the API hands back once, and only once, when an account is created or reset. */
export interface TempPasswordResult {
  /** Never retrievable again — the server keeps only a hash. A lost one is reissued, not read. */
  tempPassword: string;
  emailSent: boolean;
  /** Present only when `emailSent` is false, so the manager can be told what to fix. */
  emailError?: string;
}

export type CreatedStaffMember = StaffMember & TempPasswordResult;

export function createStaffMember(input: CreateStaffInput): Promise<CreatedStaffMember> {
  return apiRequest<CreatedStaffMember>('/admin/users', { method: 'POST', body: input });
}

/**
 * Issues a fresh temporary password and puts the account back into "must choose a password".
 * This is the whole recovery path for staff — there is no self-service reset email.
 */
export function resetStaffPassword(id: string): Promise<TempPasswordResult> {
  return apiRequest<TempPasswordResult>(`/admin/users/${id}/reset-password`, { method: 'POST' });
}

export interface StaffListEntry {
  id: string;
  name: string;
  role: 'employee' | 'manager';
  job_role: string | null;
  is_active: boolean;
  invite_status: 'pending' | 'accepted';
}

/** The full profile row, as returned by GET /admin/users/:id. */
export interface StaffDetail extends StaffListEntry {
  phone: string | null;
  location_id: string;
  pay_rate: number | null;
}

export interface UpdateStaffInput {
  name?: string;
  phone?: string;
  jobRole?: string;
  payRate?: number;
  role?: 'employee' | 'manager';
}

export function getStaffMember(id: string): Promise<StaffDetail> {
  return apiRequest<StaffDetail>(`/admin/users/${id}`);
}

export function updateStaffMember(id: string, input: UpdateStaffInput): Promise<StaffDetail> {
  return apiRequest<StaffDetail>(`/admin/users/${id}`, { method: 'PATCH', body: input });
}

/** Deactivating keeps the person and their history but stops them signing in — the fallback
 * whenever a delete is refused because they already have records against them. */
export function setStaffActive(id: string, isActive: boolean): Promise<StaffDetail> {
  return apiRequest<StaffDetail>(`/admin/users/${id}/active`, { method: 'POST', body: { isActive } });
}

export function deleteStaffMember(id: string): Promise<void> {
  return apiRequest<void>(`/admin/users/${id}`, { method: 'DELETE' });
}

export function listStaff(): Promise<StaffListEntry[]> {
  return apiRequest<StaffListEntry[]>('/admin/users');
}
