export type ShiftStatus = 'draft' | 'scheduled' | 'open' | 'completed' | 'cancelled';

export interface Shift {
  id: string;
  location_id: string;
  shift_area_id: string | null;
  name: string;
  start_time: string;
  end_time: string;
  position: string | null;
  notes: string | null;
  status: ShiftStatus;
  created_by: string;
  created_at: string;
}

export interface ShiftAssignment {
  id: string;
  shift_id: string;
  employee_id: string;
  is_leader: boolean;
  assigned_at: string;
}

export interface ShiftDetail extends Shift {
  assignments: ShiftAssignment[];
}
