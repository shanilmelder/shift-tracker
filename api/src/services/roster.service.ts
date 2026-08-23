import { supabase } from '../data/supabase-client.js';

/**
 * The whole location's schedule — who is working which shift — readable by every authenticated
 * user, employee and manager alike.
 *
 * Deliberately NOT served from `GET /v1/shifts`, which is role-scoped: an employee asking that
 * endpoint gets only the shifts they are staffed on. That is the right default for "my
 * schedule" and the wrong one for "who else is on tomorrow", so this is a separate read rather
 * than a role check bolted onto the existing one.
 *
 * What it exposes is names, times and areas — the same thing a printed rota on a staffroom wall
 * would. No pay rates, no contact details, no employment status.
 */

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
  /** The location's own timezone. Days are grouped against this, not the device's — a rota is
   * organised by the business's day, and a phone that has travelled must not shift it. */
  timeZone: string;
  from: string;
  to: string;
  shifts: RosterShift[];
}

/**
 * @param from,to Half-open UTC instants. The caller (the route) derives these from local
 *                calendar dates, so the boundaries land on the location's midnight.
 */
export async function getRoster(locationId: string, from: string, to: string): Promise<Roster> {
  const { data: location } = await supabase.from('locations').select('timezone').eq('id', locationId).single();

  const { data: shifts, error } = await supabase
    .from('shifts')
    .select('id, name, start_time, end_time, status, shift_area:shift_areas(name)')
    .eq('location_id', locationId)
    // Overlap rather than containment: a night shift starting the evening before is still part
    // of the next day's cover for the hours it runs into.
    .lt('start_time', to)
    .gt('end_time', from)
    // Cancelled shifts are nobody's rota.
    .neq('status', 'cancelled')
    .order('start_time');
  if (error) throw error;

  const rows = shifts ?? [];
  if (rows.length === 0) {
    return { timeZone: (location?.timezone as string) ?? 'UTC', from, to, shifts: [] };
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from('shift_assignments')
    // The FK is named explicitly: a bare `profiles(...)` embed is fine here today, but naming it
    // is the habit that keeps this from breaking the moment a second FK to profiles is added.
    .select('shift_id, is_leader, employee:profiles!shift_assignments_employee_id_fkey(id, name)')
    .in(
      'shift_id',
      rows.map((shift) => shift.id as string),
    );
  if (assignmentsError) throw assignmentsError;

  const staffByShift = new Map<string, RosterShiftStaff[]>();
  for (const row of assignments ?? []) {
    const employee = row.employee as unknown as { id: string; name: string } | null;
    if (!employee) continue;
    const list = staffByShift.get(row.shift_id as string) ?? [];
    list.push({ id: employee.id, name: employee.name, isLeader: Boolean(row.is_leader) });
    staffByShift.set(row.shift_id as string, list);
  }

  return {
    timeZone: (location?.timezone as string) ?? 'UTC',
    from,
    to,
    shifts: rows.map((shift) => ({
      id: shift.id as string,
      name: shift.name as string,
      startTime: shift.start_time as string,
      endTime: shift.end_time as string,
      status: shift.status as string,
      area: (shift.shift_area as unknown as { name: string } | null)?.name ?? null,
      // Leaders first, then alphabetical — the order a rota is read in.
      staff: (staffByShift.get(shift.id as string) ?? []).sort(
        (a, b) => Number(b.isLeader) - Number(a.isLeader) || a.name.localeCompare(b.name),
      ),
    })),
  };
}
