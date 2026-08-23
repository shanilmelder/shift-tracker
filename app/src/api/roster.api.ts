import { apiRequest } from './client';

export interface RosterShiftStaff {
  id: string;
  name: string;
  isLeader: boolean;
}

export interface RosterShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  status: string;
  area: string | null;
  staff: RosterShiftStaff[];
}

export interface Roster {
  /** The location's timezone. Days are grouped against this, not the device's. */
  timeZone: string;
  from: string;
  to: string;
  shifts: RosterShift[];
}

/**
 * The whole location's schedule, for any signed-in user.
 *
 * Separate from `/shifts`, which is role-scoped and returns only an employee's own shifts —
 * that is right for "my schedule" and wrong for "who else is on".
 *
 * @param from,to Local calendar dates (YYYY-MM-DD) at the location, inclusive of both ends.
 */
export function getRoster(from: string, to: string): Promise<Roster> {
  return apiRequest<Roster>('/roster', { query: { from, to } });
}
