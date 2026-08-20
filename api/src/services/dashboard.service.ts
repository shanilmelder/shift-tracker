import { supabase } from '../data/supabase-client.js';

const NEEDS_YOU_CAP = 5;

function formatDateRange(startIso: string, endIso: string): string {
  const fmt = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' });
  return startIso === endIso ? fmt.format(new Date(startIso)) : `${fmt.format(new Date(startIso))} – ${fmt.format(new Date(endIso))}`;
}

export interface NeedsYouItem {
  id: string;
  kind: 'time_off' | 'clock_exception' | 'unstaffed_shift';
  title: string;
  subtitle: string;
  cta: 'Review' | 'Post';
}

/**
 * Pending time-off requests at this location, oldest start date first (soonest-needed decision
 * first) — display detail the plain count on the dashboard's stat card doesn't carry.
 */
async function listPendingTimeOff(locationId: string): Promise<NeedsYouItem[]> {
  const { data, error } = await supabase
    .from('time_off_requests')
    .select('id, start_date, end_date, employee:profiles!time_off_requests_employee_id_fkey!inner(name, location_id)')
    .eq('employee.location_id', locationId)
    .eq('status', 'pending')
    .order('start_date', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const employee = row.employee as unknown as { name: string };
    return {
      id: row.id as string,
      kind: 'time_off' as const,
      title: `Time off — ${employee.name}`,
      subtitle: formatDateRange(row.start_date as string, row.end_date as string),
      cta: 'Review' as const,
    };
  });
}

/**
 * Flagged clock entries (FR-037/FR-038's `flagged_for_review`) at this location. The only
 * sub-type distinguishable from the data itself is whether the entry is still missing a
 * clock-out — anything else just reads as a general review flag.
 */
async function listClockExceptions(locationId: string): Promise<NeedsYouItem[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('id, clock_out_at, employee:profiles(name), shift:shifts!inner(location_id)')
    .eq('flagged_for_review', true)
    .eq('shift.location_id', locationId);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const employee = row.employee as unknown as { name: string };
    return {
      id: row.id as string,
      kind: 'clock_exception' as const,
      title: `Clock exception — ${employee.name}`,
      subtitle: row.clock_out_at ? 'Flagged for review' : 'Missed clock-out',
      cta: 'Review' as const,
    };
  });
}

/**
 * Draft (never-posted) shifts at this location with zero staffing — the two-step
 * fetch-then-filter here mirrors shifts.repo.ts's listShiftsForEmployee, since Supabase's
 * query builder has no direct "has no related rows" filter.
 */
async function listUnstaffedShifts(locationId: string): Promise<NeedsYouItem[]> {
  const { data: draftShifts, error: shiftsError } = await supabase
    .from('shifts')
    .select('id, name, start_time')
    .eq('location_id', locationId)
    .eq('status', 'draft')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });
  if (shiftsError) throw shiftsError;
  if (!draftShifts || draftShifts.length === 0) return [];

  const shiftIds = draftShifts.map((s) => s.id as string);
  const { data: assignments, error: assignmentsError } = await supabase
    .from('shift_assignments')
    .select('shift_id')
    .in('shift_id', shiftIds);
  if (assignmentsError) throw assignmentsError;

  const staffedIds = new Set((assignments ?? []).map((a) => a.shift_id as string));
  const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

  return draftShifts
    .filter((s) => !staffedIds.has(s.id as string))
    .map((s) => ({
      id: s.id as string,
      kind: 'unstaffed_shift' as const,
      title: `Unstaffed — ${s.name as string}`,
      subtitle: dayFmt.format(new Date(s.start_time as string)),
      cta: 'Post' as const,
    }));
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface DayCoverage {
  date: string;
  dayLabel: string;
  totalShifts: number;
  staffedShifts: number;
  /** 100 when the day has no shifts at all — nothing is uncovered, so it reads as fully green. */
  coveragePct: number;
}

/**
 * The current Mon-Sun week's calendar dates ("YYYY-MM-DD"), as they read in the given
 * timezone — e.g. for a caller in America/Chicago, "today" and "Monday" are determined by the
 * clock in Chicago, not the server's own timezone or a UTC instant. Once we have "today"'s
 * calendar date, finding Monday and stepping through the week is pure date arithmetic with no
 * timezone involved at all (adding days to a Y-M-D triple doesn't need one) — anchoring that
 * arithmetic to UTC-noon avoids DST-transition edge cases without needing a timezone library.
 */
function currentWeekDayKeys(timeZone: string): string[] {
  const dateKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const weekdayFmt = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' });

  const todayKey = dateKeyFmt.format(new Date());
  const todayWeekdayIndex = WEEKDAY_LABELS.indexOf(weekdayFmt.format(new Date())); // 0 = Mon .. 6 = Sun

  const [year, month, day] = todayKey.split('-').map(Number);
  const todayNoonUtc = Date.UTC(year!, month! - 1, day!, 12);
  const mondayNoonUtc = todayNoonUtc - todayWeekdayIndex * 86_400_000;

  return Array.from({ length: 7 }, (_, i) => dateKeyFmt.format(new Date(mondayNoonUtc + i * 86_400_000)));
}

/**
 * Coverage is shifts-staffed / shifts-total per day, not hours-staffed / hours-scheduled: the
 * schema has no "required headcount" concept for a shift to compare hours against (see
 * data-model.md — a shift's only staffing signal is whether shift_assignments rows exist for
 * it), so "staffed vs. not" is the only definition the data actually supports.
 *
 * Pure function, no I/O (constitution: Testable Business Logic) — buckets shifts against a
 * pre-computed set of local calendar day-keys (see currentWeekDayKeys) rather than deriving
 * them itself, so this function's own logic is just grouping/math, independently testable from
 * "what does this week's Monday mean in this timezone".
 */
export function groupCoverageByDay(
  shifts: Array<{ id: string; startTime: string }>,
  staffedShiftIds: Set<string>,
  timeZone: string,
  weekDayKeys: string[],
): DayCoverage[] {
  const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });

  const totalsByDay = new Map<string, { total: number; staffed: number }>();
  for (const shift of shifts) {
    const dayKey = dayFmt.format(new Date(shift.startTime));
    const entry = totalsByDay.get(dayKey) ?? { total: 0, staffed: 0 };
    entry.total += 1;
    if (staffedShiftIds.has(shift.id)) entry.staffed += 1;
    totalsByDay.set(dayKey, entry);
  }

  return weekDayKeys.map((dayKey, i) => {
    const totals = totalsByDay.get(dayKey) ?? { total: 0, staffed: 0 };
    return {
      date: dayKey,
      dayLabel: WEEKDAY_LABELS[i]!,
      totalShifts: totals.total,
      staffedShifts: totals.staffed,
      coveragePct: totals.total === 0 ? 100 : Math.round((100 * totals.staffed) / totals.total),
    };
  });
}

async function getCoverageByDay(locationId: string): Promise<DayCoverage[]> {
  const { data: location, error: locationError } = await supabase.from('locations').select('timezone').eq('id', locationId).single();
  if (locationError || !location) throw locationError ?? new Error('Location not found');
  const timeZone = location.timezone as string;

  const weekDayKeys = currentWeekDayKeys(timeZone);
  // A day of margin on each side covers any timezone offset direction between the location and
  // UTC — groupCoverageByDay's own day-key matching is what actually decides which of these
  // shifts count, this window just needs to be wide enough not to miss any.
  const queryStart = new Date(`${weekDayKeys[0]}T00:00:00Z`).getTime() - 86_400_000;
  const queryEnd = new Date(`${weekDayKeys[6]}T00:00:00Z`).getTime() + 2 * 86_400_000;

  const { data: weekShifts, error: shiftsError } = await supabase
    .from('shifts')
    .select('id, start_time')
    .eq('location_id', locationId)
    .gte('start_time', new Date(queryStart).toISOString())
    .lt('start_time', new Date(queryEnd).toISOString());
  if (shiftsError) throw shiftsError;

  const shiftIds = (weekShifts ?? []).map((s) => s.id as string);
  const { data: assignments, error: assignmentsError } =
    shiftIds.length === 0
      ? { data: [] as Array<{ shift_id: string }>, error: null }
      : await supabase.from('shift_assignments').select('shift_id').in('shift_id', shiftIds);
  if (assignmentsError) throw assignmentsError;

  const staffedShiftIds = new Set((assignments ?? []).map((a) => a.shift_id as string));
  const shifts = (weekShifts ?? []).map((s) => ({ id: s.id as string, startTime: s.start_time as string }));

  return groupCoverageByDay(shifts, staffedShiftIds, timeZone, weekDayKeys);
}

/**
 * Fixed category order (time off, then clock exceptions, then unstaffed shifts) matching the
 * reference mockup's own example ordering — each category itself already sorted by urgency.
 * Capped rather than paginated: this is a glance-at-a-dashboard list, not a full inbox (that's
 * what the dedicated approvals/schedule screens are for).
 */
export async function getNeedsYou(locationId: string): Promise<NeedsYouItem[]> {
  const [timeOff, clockExceptions, unstaffed] = await Promise.all([
    listPendingTimeOff(locationId),
    listClockExceptions(locationId),
    listUnstaffedShifts(locationId),
  ]);
  return [...timeOff, ...clockExceptions, ...unstaffed].slice(0, NEEDS_YOU_CAP);
}

/** FR-025/SC-008: one aggregate call so the dashboard never needs to cross-reference multiple endpoints. */
export async function getDashboard(locationId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [todaysShiftsResult, openShiftsResult, pendingSwapsResult, pendingTimeOffResult, needsYou, coverageByDay] = await Promise.all([
    supabase
      .from('shifts')
      .select('id, status')
      .eq('location_id', locationId)
      .gte('end_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString()),
    supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('location_id', locationId).eq('status', 'open'),
    supabase
      .from('shift_swap_requests')
      .select('id, shift:shifts!inner(location_id)', { count: 'exact', head: true })
      .eq('shift.location_id', locationId)
      .eq('status', 'coworker_accepted'),
    supabase
      .from('time_off_requests')
      .select('id, employee:profiles!time_off_requests_employee_id_fkey!inner(location_id)', { count: 'exact', head: true })
      .eq('employee.location_id', locationId)
      .eq('status', 'pending'),
    getNeedsYou(locationId),
    getCoverageByDay(locationId),
  ]);

  const todaysShifts = todaysShiftsResult.data ?? [];
  const unfilledToday = todaysShifts.filter((s) => s.status === 'draft').length;

  return {
    todaysShiftCount: todaysShifts.length,
    todaysUnfilledCount: unfilledToday,
    openUnfilledShiftCount: openShiftsResult.count ?? 0,
    pendingSwapApprovalCount: pendingSwapsResult.count ?? 0,
    pendingTimeOffApprovalCount: pendingTimeOffResult.count ?? 0,
    needsYou,
    coverageByDay,
  };
}
