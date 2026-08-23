import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The shared roster. What matters most here is the window: the dates a client sends are the
 * LOCATION's calendar dates, so resolving them in the wrong zone silently drops a shift off
 * each end of the range — a rota missing its first or last shift looks like a data problem,
 * not a timezone one.
 */

const shiftsQuery = vi.fn();
const assignmentsQuery = vi.fn();
const locationSingle = vi.fn();
/** Captures the UTC window the service actually queried with. */
const captured: { lt?: string; gt?: string } = {};

vi.mock('../../src/data/supabase-client.js', () => {
  const shifts: Record<string, unknown> = {};
  for (const op of ['select', 'eq', 'neq', 'order']) shifts[op] = () => shifts;
  shifts.lt = (_col: string, value: string) => {
    captured.lt = value;
    return shifts;
  };
  shifts.gt = (_col: string, value: string) => {
    captured.gt = value;
    return shifts;
  };
  shifts.then = (resolve: (v: unknown) => unknown) => resolve(shiftsQuery());

  const assignments: Record<string, unknown> = {};
  assignments.select = () => assignments;
  assignments.in = () => assignments;
  assignments.then = (resolve: (v: unknown) => unknown) => resolve(assignmentsQuery());

  const locations: Record<string, unknown> = {};
  locations.select = () => locations;
  locations.eq = () => locations;
  locations.single = () => locationSingle();

  return {
    supabase: {
      from: (table: string) => (table === 'locations' ? locations : table === 'shifts' ? shifts : assignments),
    },
  };
});

beforeEach(() => {
  captured.lt = undefined;
  captured.gt = undefined;
  // Cleared, not just re-stubbed: call counts otherwise carry over between tests and an
  // assertion about "was never called" passes or fails on whatever ran before it.
  shiftsQuery.mockReset();
  assignmentsQuery.mockReset();
  locationSingle.mockReset();
  locationSingle.mockResolvedValue({ data: { timezone: 'Asia/Kolkata' } });
  shiftsQuery.mockReturnValue({ data: [], error: null });
  assignmentsQuery.mockReturnValue({ data: [], error: null });
});

describe('getRoster', () => {
  it('queries the exact UTC window it is given', async () => {
    const { getRoster } = await import('../../src/services/roster.service.js');
    await getRoster('loc-1', '2026-08-23T18:30:00.000Z', '2026-08-24T18:30:00.000Z');

    expect(captured.gt).toBe('2026-08-23T18:30:00.000Z');
    expect(captured.lt).toBe('2026-08-24T18:30:00.000Z');
  });

  it('returns the location timezone so the client groups by the business day', async () => {
    const { getRoster } = await import('../../src/services/roster.service.js');
    const roster = await getRoster('loc-1', '2026-08-23T18:30:00.000Z', '2026-08-24T18:30:00.000Z');

    expect(roster.timeZone).toBe('Asia/Kolkata');
  });

  it('attaches staff to their shift, leaders first', async () => {
    shiftsQuery.mockReturnValue({
      data: [
        {
          id: 's1',
          name: 'Morning',
          start_time: '2026-08-24T00:30:00Z',
          end_time: '2026-08-24T08:30:00Z',
          status: 'scheduled',
          shift_area: { name: 'Kitchen' },
        },
      ],
      error: null,
    });
    assignmentsQuery.mockReturnValue({
      data: [
        { shift_id: 's1', is_leader: false, employee: { id: 'e2', name: 'Zoe Adams' } },
        { shift_id: 's1', is_leader: true, employee: { id: 'e1', name: 'Priya Raman' } },
      ],
      error: null,
    });

    const { getRoster } = await import('../../src/services/roster.service.js');
    const roster = await getRoster('loc-1', '2026-08-23T18:30:00.000Z', '2026-08-24T18:30:00.000Z');

    expect(roster.shifts[0]?.area).toBe('Kitchen');
    // Leader first, then alphabetical — the order a rota is read in.
    expect(roster.shifts[0]?.staff.map((s) => s.name)).toEqual(['Priya Raman', 'Zoe Adams']);
    expect(roster.shifts[0]?.staff[0]?.isLeader).toBe(true);
  });

  it('skips the assignments query entirely when there are no shifts', async () => {
    const { getRoster } = await import('../../src/services/roster.service.js');
    const roster = await getRoster('loc-1', '2026-08-23T18:30:00.000Z', '2026-08-24T18:30:00.000Z');

    expect(roster.shifts).toEqual([]);
    expect(assignmentsQuery).not.toHaveBeenCalled();
  });

  it('reports an unstaffed shift as empty rather than omitting it', async () => {
    shiftsQuery.mockReturnValue({
      data: [{ id: 's1', name: 'Evening', start_time: '2026-08-24T12:30:00Z', end_time: '2026-08-24T20:30:00Z', status: 'open', shift_area: null }],
      error: null,
    });

    const { getRoster } = await import('../../src/services/roster.service.js');
    const roster = await getRoster('loc-1', '2026-08-23T18:30:00.000Z', '2026-08-24T18:30:00.000Z');

    // An uncovered shift is the single most important thing a rota can show.
    expect(roster.shifts).toHaveLength(1);
    expect(roster.shifts[0]?.staff).toEqual([]);
  });
});
