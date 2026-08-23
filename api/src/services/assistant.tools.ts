import { supabase } from '../data/supabase-client.js';
import { hoursByEmployee, laborCostVsBudget, attendanceTrend, overtimeTrend } from './reports.service.js';
import type { OllamaToolDefinition } from './ollama.client.js';

/**
 * The reporting assistant's entire capability surface. The model cannot query the database; it
 * can only pick one of these tools and supply arguments, and every executor below re-derives
 * the location from the authenticated caller rather than taking it from the model. That is the
 * containment boundary: a prompt-injected or simply confused model can at worst call the wrong
 * tool for its own location, never read another location's data and never write anything.
 *
 * Adding a tool is the intended way to widen what the assistant can answer.
 */

/** Everything an executor is allowed to know about who is asking. Deliberately not the whole
 * request: a tool must not be able to reach the raw token or issue its own authorization. */
export interface ToolContext {
  locationId: string;
  timeZone: string;
}

type ToolExecutor = (args: Record<string, unknown>, context: ToolContext) => Promise<unknown>;

interface AssistantTool {
  definition: OllamaToolDefinition;
  execute: ToolExecutor;
}

// ---------------------------------------------------------------------------
// Timezone helpers
//
// Shifts are stored as `timestamptz`, but every question a manager asks is in local terms —
// "tomorrow", "the morning shift", "this month". Converting between the two needs the
// location's zone, and doing it with Intl avoids adding a date library for a handful of calls.
// ---------------------------------------------------------------------------

/** How far `timeZone`'s wall clock is ahead of UTC at a given instant, in ms (DST-aware). */
export function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? '0');
  const wallClockAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return wallClockAsUtc - instant.getTime();
}

/** The UTC instant at which local midnight of `date` (YYYY-MM-DD) falls in `timeZone`. */
function zonedStartOfDay(date: string, timeZone: string): Date {
  const naive = Date.parse(`${date}T00:00:00Z`);
  // The offset itself depends on the instant we are solving for, so apply it twice — the
  // second pass settles the case where the first guess landed on the far side of a DST change.
  let instant = naive;
  for (let pass = 0; pass < 2; pass += 1) {
    instant = naive - zoneOffsetMs(new Date(instant), timeZone);
  }
  return new Date(instant);
}

/** The local calendar date one day after `date` (YYYY-MM-DD). Calendar arithmetic only — no
 * instant is involved, so this is unaffected by DST. */
function nextCalendarDate(date: string): string {
  const asUtc = new Date(`${date}T00:00:00Z`);
  asUtc.setUTCDate(asUtc.getUTCDate() + 1);
  return asUtc.toISOString().slice(0, 10);
}

/** Half-open [start, end) UTC range covering the local days `from`..`to` inclusive. */
export function zonedRange(from: string, to: string, timeZone: string): { startUtc: string; endUtc: string } {
  const start = zonedStartOfDay(from, timeZone);
  // Resolved as the *next local date's* midnight rather than by adding 24 hours to this one:
  // on a DST-transition day the local day is 23 or 25 hours long, and adding a fixed day would
  // put the boundary an hour inside the next day (or an hour short of the end of this one).
  const endExclusive = zonedStartOfDay(nextCalendarDate(to), timeZone);
  return { startUtc: start.toISOString(), endUtc: endExclusive.toISOString() };
}

/** Local date (YYYY-MM-DD) and hour for a stored instant. */
export function zonedDateAndHour(isoInstant: string, timeZone: string): { date: string; hour: number } {
  const instant = new Date(isoInstant);
  return {
    date: new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant),
    hour: Number(new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', hour: '2-digit' }).format(instant)),
  };
}

function formatLocalTime(isoInstant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    new Date(isoInstant),
  );
}

/**
 * Which part of the day a shift belongs to, from its local start hour. These bands are the
 * assistant's own convention, not a stored attribute: shifts have free-text names, so "the
 * morning shift" cannot be answered by matching on `name` without missing every shift a
 * manager named something else.
 */
export const PART_OF_DAY_BANDS: Record<string, (hour: number) => boolean> = {
  morning: (hour) => hour >= 5 && hour < 12,
  afternoon: (hour) => hour >= 12 && hour < 17,
  evening: (hour) => hour >= 17 && hour < 22,
  night: (hour) => hour >= 22 || hour < 5,
};

/**
 * Days of a request that fall inside the asked-about window, counting both end dates. Clamped
 * on purpose: a two-week leave request asked about over one week must report the days in that
 * week, not all fourteen, or "who took the most time off this month" silently rewards whoever
 * happened to have a request straddling the boundary.
 *
 * Pure, and all-day granularity — time_off_requests stores `date`, not `timestamptz`, so there
 * is no zone conversion to do here.
 */
export function countDaysInWindow(startDate: string, endDate: string, from: string, to: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const start = Date.parse(`${startDate > from ? startDate : from}T00:00:00Z`);
  const end = Date.parse(`${endDate < to ? endDate : to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.round((end - start) / MS_PER_DAY) + 1;
}

// ---------------------------------------------------------------------------
// Shared query helpers
// ---------------------------------------------------------------------------

interface ShiftWithStaff {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  status: string;
  area: string | null;
  staff: Array<{ name: string; isLeader: boolean }>;
}

/** Every shift overlapping the range, with who is on it. One query per table, joined in
 * memory — the alternative is a nested select whose shape changes with the join direction. */
async function loadShifts(
  context: ToolContext,
  startUtc: string,
  endUtc: string,
): Promise<ShiftWithStaff[]> {
  const { data: shifts, error } = await supabase
    .from('shifts')
    .select('id, name, start_time, end_time, status, shift_area:shift_areas(name)')
    .eq('location_id', context.locationId)
    // Overlap, not containment: a night shift starting at 22:00 the day before is still
    // "working tomorrow" for the hours it covers.
    .lt('start_time', endUtc)
    .gt('end_time', startUtc)
    .order('start_time');
  if (error) throw error;
  if (!shifts?.length) return [];

  const shiftIds = shifts.map((shift) => shift.id as string);
  const { data: assignments, error: assignmentsError } = await supabase
    .from('shift_assignments')
    .select('shift_id, is_leader, employee:profiles(name)')
    .in('shift_id', shiftIds);
  if (assignmentsError) throw assignmentsError;

  const staffByShift = new Map<string, Array<{ name: string; isLeader: boolean }>>();
  for (const row of assignments ?? []) {
    const employee = row.employee as unknown as { name: string } | null;
    const list = staffByShift.get(row.shift_id as string) ?? [];
    list.push({ name: employee?.name ?? 'Unknown', isLeader: Boolean(row.is_leader) });
    staffByShift.set(row.shift_id as string, list);
  }

  return shifts.map((shift) => ({
    id: shift.id as string,
    name: shift.name as string,
    startTime: shift.start_time as string,
    endTime: shift.end_time as string,
    status: shift.status as string,
    area: (shift.shift_area as unknown as { name: string } | null)?.name ?? null,
    staff: staffByShift.get(shift.id as string) ?? [],
  }));
}

/** Renders a shift for the model: local times it can quote directly, no raw UTC to misread. */
function presentShift(shift: ShiftWithStaff, timeZone: string) {
  return {
    name: shift.name,
    date: zonedDateAndHour(shift.startTime, timeZone).date,
    startsAt: formatLocalTime(shift.startTime, timeZone),
    endsAt: formatLocalTime(shift.endTime, timeZone),
    area: shift.area,
    status: shift.status,
    staff: shift.staff.map((member) => (member.isLeader ? `${member.name} (shift leader)` : member.name)),
    staffedCount: shift.staff.length,
  };
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const DATE_PROPERTY = { type: 'string', description: 'Local calendar date in YYYY-MM-DD format.' };

export const ASSISTANT_TOOLS: Record<string, AssistantTool> = {
  who_is_working: {
    definition: {
      type: 'function',
      function: {
        name: 'who_is_working',
        description:
          'Lists the shifts on a given date and the staff assigned to each. Use for any question about who is on, who is scheduled, or who is covering a date or part of the day.',
        parameters: {
          type: 'object',
          properties: {
            date: DATE_PROPERTY,
            part_of_day: {
              type: 'string',
              enum: ['morning', 'afternoon', 'evening', 'night'],
              description: 'Optional. Filters to shifts starting in that band of the day.',
            },
            area: { type: 'string', description: 'Optional. Only shifts in this shift area.' },
          },
          required: ['date'],
        },
      },
    },
    execute: async (args, context) => {
      const date = String(args.date);
      const { startUtc, endUtc } = zonedRange(date, date, context.timeZone);
      let shifts = await loadShifts(context, startUtc, endUtc);

      const partOfDay = args.part_of_day ? String(args.part_of_day) : undefined;
      if (partOfDay && PART_OF_DAY_BANDS[partOfDay]) {
        const matches = PART_OF_DAY_BANDS[partOfDay];
        shifts = shifts.filter((shift) => matches(zonedDateAndHour(shift.startTime, context.timeZone).hour));
      }
      if (args.area) {
        const wanted = String(args.area).toLowerCase();
        shifts = shifts.filter((shift) => shift.area?.toLowerCase().includes(wanted));
      }

      return {
        date,
        partOfDay: partOfDay ?? 'any',
        shiftCount: shifts.length,
        shifts: shifts.map((shift) => presentShift(shift, context.timeZone)),
      };
    },
  },

  shifts_in_range: {
    definition: {
      type: 'function',
      function: {
        name: 'shifts_in_range',
        description:
          'Lists every shift between two dates with its staffing. Use for questions spanning more than one day, such as a week\'s schedule or how many shifts someone works.',
        parameters: {
          type: 'object',
          properties: { from: DATE_PROPERTY, to: DATE_PROPERTY },
          required: ['from', 'to'],
        },
      },
    },
    execute: async (args, context) => {
      const { startUtc, endUtc } = zonedRange(String(args.from), String(args.to), context.timeZone);
      const shifts = await loadShifts(context, startUtc, endUtc);
      return {
        from: args.from,
        to: args.to,
        shiftCount: shifts.length,
        shifts: shifts.map((shift) => presentShift(shift, context.timeZone)),
      };
    },
  },

  understaffed_shifts: {
    definition: {
      type: 'function',
      function: {
        name: 'understaffed_shifts',
        description:
          'Finds shifts in a date range that are open or have nobody assigned. Use for questions about gaps, uncovered shifts, or shifts still needing staff.',
        parameters: {
          type: 'object',
          properties: { from: DATE_PROPERTY, to: DATE_PROPERTY },
          required: ['from', 'to'],
        },
      },
    },
    execute: async (args, context) => {
      const { startUtc, endUtc } = zonedRange(String(args.from), String(args.to), context.timeZone);
      const shifts = await loadShifts(context, startUtc, endUtc);
      const gaps = shifts.filter((shift) => shift.staff.length === 0 || shift.status === 'open');
      return {
        from: args.from,
        to: args.to,
        unstaffedCount: gaps.length,
        shifts: gaps.map((shift) => presentShift(shift, context.timeZone)),
      };
    },
  },

  time_off_summary: {
    definition: {
      type: 'function',
      function: {
        name: 'time_off_summary',
        description:
          'Time off per employee over a date range, ranked by total days, counting only days that fall inside the range. Use for questions about who took the most time off, or how much leave someone has had.',
        parameters: {
          type: 'object',
          properties: {
            from: DATE_PROPERTY,
            to: DATE_PROPERTY,
            status: {
              type: 'string',
              enum: ['approved', 'pending', 'denied', 'any'],
              description: 'Defaults to approved. Only count requests with this status.',
            },
          },
          required: ['from', 'to'],
        },
      },
    },
    execute: async (args, context) => {
      const from = String(args.from);
      const to = String(args.to);
      const status = args.status ? String(args.status) : 'approved';

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('location_id', context.locationId);
      if (profilesError) throw profilesError;
      const nameById = new Map((profiles ?? []).map((profile) => [profile.id as string, profile.name as string]));
      if (nameById.size === 0) return { from, to, status, employees: [] };

      let query = supabase
        .from('time_off_requests')
        .select('employee_id, start_date, end_date, status, reason')
        .in('employee_id', [...nameById.keys()])
        // Overlap: a request spanning the range boundary still contributes its in-range days.
        .lte('start_date', to)
        .gte('end_date', from);
      if (status !== 'any') query = query.eq('status', status);

      const { data: requests, error } = await query;
      if (error) throw error;

      const totals = new Map<string, { days: number; requests: number }>();
      for (const request of requests ?? []) {
        const days = countDaysInWindow(String(request.start_date), String(request.end_date), from, to);
        if (days === 0) continue;
        const current = totals.get(request.employee_id as string) ?? { days: 0, requests: 0 };
        totals.set(request.employee_id as string, { days: current.days + days, requests: current.requests + 1 });
      }

      const employees = [...totals.entries()]
        .map(([employeeId, total]) => ({ employeeName: nameById.get(employeeId) ?? 'Unknown', ...total }))
        .sort((a, b) => b.days - a.days);
      return { from, to, status, employees };
    },
  },

  hours_by_employee: {
    definition: {
      type: 'function',
      function: {
        name: 'hours_by_employee',
        description:
          'Actual clocked hours per employee over a date range, split into regular and overtime. Use for questions about hours worked. This is worked time, not scheduled time.',
        parameters: {
          type: 'object',
          properties: { from: DATE_PROPERTY, to: DATE_PROPERTY },
          required: ['from', 'to'],
        },
      },
    },
    execute: async (args, context) => {
      const { startUtc, endUtc } = zonedRange(String(args.from), String(args.to), context.timeZone);
      const rows = await hoursByEmployee(context.locationId, { from: startUtc, to: endUtc });
      return {
        from: args.from,
        to: args.to,
        employees: rows
          .map((row) => ({
            employeeName: row.employeeName,
            regularHours: Number(row.totalRegularHours.toFixed(2)),
            overtimeHours: Number(row.totalOvertimeHours.toFixed(2)),
          }))
          .sort((a, b) => b.regularHours + b.overtimeHours - (a.regularHours + a.overtimeHours)),
      };
    },
  },

  overtime_summary: {
    definition: {
      type: 'function',
      function: {
        name: 'overtime_summary',
        description: 'Total overtime hours across the location for a date range, and the per-employee breakdown.',
        parameters: {
          type: 'object',
          properties: { from: DATE_PROPERTY, to: DATE_PROPERTY },
          required: ['from', 'to'],
        },
      },
    },
    execute: async (args, context) => {
      const { startUtc, endUtc } = zonedRange(String(args.from), String(args.to), context.timeZone);
      const result = await overtimeTrend(context.locationId, { from: startUtc, to: endUtc });
      return {
        from: args.from,
        to: args.to,
        totalOvertimeHours: Number(result.totalOvertimeHours.toFixed(2)),
        employees: result.perEmployee
          .filter((row) => row.totalOvertimeHours > 0)
          .map((row) => ({ employeeName: row.employeeName, overtimeHours: Number(row.totalOvertimeHours.toFixed(2)) })),
      };
    },
  },

  attendance_summary: {
    definition: {
      type: 'function',
      function: {
        name: 'attendance_summary',
        description:
          'Attendance over a date range: how many staffed shifts were actually clocked into, and how many were no-shows.',
        parameters: {
          type: 'object',
          properties: { from: DATE_PROPERTY, to: DATE_PROPERTY },
          required: ['from', 'to'],
        },
      },
    },
    execute: async (args, context) => {
      const { startUtc, endUtc } = zonedRange(String(args.from), String(args.to), context.timeZone);
      return { from: args.from, to: args.to, ...(await attendanceTrend(context.locationId, { from: startUtc, to: endUtc })) };
    },
  },

  labor_cost: {
    definition: {
      type: 'function',
      function: {
        name: 'labor_cost',
        description:
          'Total labor cost for a date range from clocked hours and pay rates, optionally compared against a budget figure the user supplies.',
        parameters: {
          type: 'object',
          properties: {
            from: DATE_PROPERTY,
            to: DATE_PROPERTY,
            budget: { type: 'number', description: 'Optional budget to compare against. Omit if the user did not give one.' },
          },
          required: ['from', 'to'],
        },
      },
    },
    execute: async (args, context) => {
      const { startUtc, endUtc } = zonedRange(String(args.from), String(args.to), context.timeZone);
      const budget = typeof args.budget === 'number' ? args.budget : 0;
      const result = await laborCostVsBudget(context.locationId, { from: startUtc, to: endUtc }, budget);
      return {
        from: args.from,
        to: args.to,
        totalCost: Number(result.totalCost.toFixed(2)),
        ...(typeof args.budget === 'number' ? { budget: result.budget, overBudget: result.overBudget } : {}),
        // Surfaced so the model can caveat the figure rather than presenting it as settled.
        note: 'Overtime is costed at a 1.5x multiplier, which is a default and not a configured payroll rule.',
      };
    },
  },

  list_staff: {
    definition: {
      type: 'function',
      function: {
        name: 'list_staff',
        description:
          'The staff roster for the location: names, job roles, and whether each account is active. Use to answer who works here or how many staff there are.',
        parameters: { type: 'object', properties: {} },
      },
    },
    execute: async (_args, context) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, role, job_role, is_active')
        .eq('location_id', context.locationId)
        .order('name');
      if (error) throw error;
      // Pay rates are deliberately not returned: no tool here answers a question that needs
      // them, and this payload leaves the building for the model host.
      return {
        staffCount: (data ?? []).length,
        staff: (data ?? []).map((row) => ({
          name: row.name as string,
          accountType: row.role as string,
          jobRole: (row.job_role as string | null) ?? null,
          active: Boolean(row.is_active),
        })),
      };
    },
  },
};

export const TOOL_DEFINITIONS: OllamaToolDefinition[] = Object.values(ASSISTANT_TOOLS).map((tool) => tool.definition);
