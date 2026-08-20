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

export function listStaff(): Promise<StaffListEntry[]> {
  return apiRequest<StaffListEntry[]>('/admin/users');
}
