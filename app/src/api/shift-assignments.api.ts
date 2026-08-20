import { apiRequest } from './client';
import type { ShiftAssignment } from '../types/api/shifts';

export interface StaffingTarget {
  employeeId: string;
  isLeader: boolean;
}

export interface StaffingConflictDetail {
  employeeId: string;
  conflict: { type: string; [key: string]: unknown };
}

export function listAssignments(shiftId: string): Promise<ShiftAssignment[]> {
  return apiRequest<ShiftAssignment[]>(`/shifts/${shiftId}/assignments`);
}

export function replaceStaffing(shiftId: string, assignments: StaffingTarget[]): Promise<ShiftAssignment[]> {
  return apiRequest<ShiftAssignment[]>(`/shifts/${shiftId}/assignments`, {
    method: 'PUT',
    body: { assignments },
  });
}

export function removeAssignment(shiftId: string, employeeId: string): Promise<void> {
  return apiRequest<void>(`/shifts/${shiftId}/assignments/${employeeId}`, { method: 'DELETE' });
}
