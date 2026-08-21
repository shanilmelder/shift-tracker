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

export function createStaffMember(input: CreateStaffInput): Promise<StaffMember> {
  return apiRequest<StaffMember>('/admin/users', { method: 'POST', body: input });
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
