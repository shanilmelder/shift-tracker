import { supabase } from '../data/supabase-client.js';
import { computeRegularAndOvertimeHours } from './time-entries.service.js';

interface DateRange {
  from?: string;
  to?: string;
}

/** FR-034: hours by employee, using the same overtime-split logic the timesheet uses. */
export async function hoursByEmployee(locationId: string, range: DateRange) {
  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, name').eq('location_id', locationId);
  if (profilesError) throw profilesError;

  const { data: location } = await supabase.from('locations').select('timezone').eq('id', locationId).single();
  const timezone = location?.timezone ?? 'UTC';

  const results = [];
  for (const profile of profiles ?? []) {
    const { data: entries } = await supabase
      .from('time_entries')
      .select('clock_in_at, clock_out_at')
      .eq('employee_id', profile.id)
      .gte('clock_in_at', range.from ?? '1970-01-01')
      .lte('clock_in_at', range.to ?? '9999-12-31');

    const summary = computeRegularAndOvertimeHours(
      (entries ?? []).map((e) => ({ clockInAt: e.clock_in_at as string, clockOutAt: e.clock_out_at as string | null })).filter((e) => e.clockInAt),
      timezone,
    );
    results.push({ employeeId: profile.id, employeeName: profile.name, ...summary });
  }
  return results;
}

/**
 * FR-034: labor cost vs. an entered budget figure — pay_rate * hours per employee, summed.
 *
 * FLAGGED, NOT GUESSED SILENTLY: this uses a 1.5x overtime pay multiplier, a common default,
 * but neither spec.md nor plan.md specifies an overtime pay-rate multiplier (the spec only
 * defines the *hours* split at FR-020, not a pay rule — payroll disbursement itself is
 * explicitly out of scope). Confirm this multiplier, and whether it should be
 * location-configurable like `min_rest_hours`/`geofence_radius_m`, before relying on this
 * report for real budgeting decisions.
 */
export async function laborCostVsBudget(locationId: string, range: DateRange, budget: number) {
  const hours = await hoursByEmployee(locationId, range);
  const { data: profiles } = await supabase.from('profiles').select('id, pay_rate').eq('location_id', locationId);
  const payRateById = new Map((profiles ?? []).map((p) => [p.id as string, (p.pay_rate as number | null) ?? 0]));

  let totalCost = 0;
  for (const row of hours) {
    const rate = payRateById.get(row.employeeId) ?? 0;
    totalCost += rate * (row.totalRegularHours + row.totalOvertimeHours * 1.5);
  }
  return { totalCost, budget, overBudget: totalCost > budget };
}

/** FR-034: attendance / no-show trend — a shift an employee was staffed on with no clock-in
 * recorded counts as a no-show. */
export async function attendanceTrend(locationId: string, range: DateRange) {
  const { data: assignments, error } = await supabase
    .from('shift_assignments')
    .select('employee_id, shift:shifts!inner(id, location_id, start_time)')
    .eq('shift.location_id', locationId)
    .gte('shift.start_time', range.from ?? '1970-01-01')
    .lte('shift.start_time', range.to ?? '9999-12-31');
  if (error) throw error;

  let attended = 0;
  let noShows = 0;
  for (const row of assignments ?? []) {
    const shift = row.shift as unknown as { id: string };
    const { data: entry } = await supabase
      .from('time_entries')
      .select('id')
      .eq('shift_id', shift.id)
      .eq('employee_id', row.employee_id as string)
      .not('clock_in_at', 'is', null)
      .maybeSingle();
    if (entry) attended += 1;
    else noShows += 1;
  }
  return { attended, noShows, totalScheduled: attended + noShows };
}

export async function overtimeTrend(locationId: string, range: DateRange) {
  const perEmployee = await hoursByEmployee(locationId, range);
  const totalOvertimeHours = perEmployee.reduce((sum, row) => sum + row.totalOvertimeHours, 0);
  return { totalOvertimeHours, perEmployee };
}
