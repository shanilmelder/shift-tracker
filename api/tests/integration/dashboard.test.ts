import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Covers getNeedsYou — the dashboard's action-list aggregation (pending time-off, flagged
 * clock entries, unstaffed draft shifts) — in isolation from getDashboard's other counts,
 * since those three sources are each queried exactly once here (unlike getDashboard as a
 * whole, which queries `shifts` multiple times for different purposes and would need a much
 * more elaborate per-call mock to disambiguate).
 *
 * Each mocked query is "chainable": every builder method (select/eq/gte/order/in) returns the
 * same object, which resolves to the configured result when awaited — this test only cares
 * about the final data per table, not the exact chain of calls used to filter it.
 */

function chainable(result: { data: unknown; error: unknown }) {
  const obj: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'gte', 'lte', 'order', 'in'];
  for (const method of methods) {
    obj[method] = () => obj;
  }
  (obj as { then: (resolve: (value: typeof result) => void) => void }).then = (resolve) => resolve(result);
  return obj;
}

const tableResults = new Map<string, { data: unknown; error: unknown }>();

vi.mock('../../src/data/supabase-client.js', () => ({
  supabase: {
    from: (table: string) => {
      const result = tableResults.get(table);
      if (!result) throw new Error(`No mock configured for table ${table}`);
      return chainable(result);
    },
  },
}));

describe('dashboard.service.getNeedsYou', () => {
  beforeEach(() => {
    tableResults.clear();
  });

  it('returns pending time-off, flagged clock entries, and unstaffed draft shifts, in that order', async () => {
    tableResults.set('time_off_requests', {
      data: [{ id: 'to-1', start_date: '2026-09-02', end_date: '2026-09-04', employee: { name: 'S. Jayawardena' } }],
      error: null,
    });
    tableResults.set('time_entries', {
      data: [{ id: 'te-1', clock_out_at: null, employee: { name: 'M. De Silva' } }],
      error: null,
    });
    tableResults.set('shifts', {
      data: [{ id: 'sh-1', name: 'Saturday evening', start_time: '2026-09-06T20:00:00Z' }],
      error: null,
    });
    tableResults.set('shift_assignments', { data: [], error: null });

    const { getNeedsYou } = await import('../../src/services/dashboard.service.js');
    const items = await getNeedsYou('loc-1');

    expect(items.map((i) => i.kind)).toEqual(['time_off', 'clock_exception', 'unstaffed_shift']);
    expect(items[0]).toMatchObject({ title: 'Time off — S. Jayawardena', cta: 'Review' });
    expect(items[1]).toMatchObject({ title: 'Clock exception — M. De Silva', subtitle: 'Missed clock-out', cta: 'Review' });
    expect(items[2]).toMatchObject({ title: 'Unstaffed — Saturday evening', cta: 'Post' });
  });

  it('excludes a draft shift that already has a staffing row', async () => {
    tableResults.set('time_off_requests', { data: [], error: null });
    tableResults.set('time_entries', { data: [], error: null });
    tableResults.set('shifts', {
      data: [{ id: 'sh-1', name: 'Staffed already', start_time: '2026-09-06T20:00:00Z' }],
      error: null,
    });
    tableResults.set('shift_assignments', { data: [{ shift_id: 'sh-1' }], error: null });

    const { getNeedsYou } = await import('../../src/services/dashboard.service.js');
    const items = await getNeedsYou('loc-1');

    expect(items).toEqual([]);
  });

  it('caps the combined list at 5 items', async () => {
    tableResults.set(
      'time_off_requests',
      {
        data: Array.from({ length: 4 }, (_, i) => ({
          id: `to-${i}`,
          start_date: '2026-09-02',
          end_date: '2026-09-04',
          employee: { name: `Employee ${i}` },
        })),
        error: null,
      },
    );
    tableResults.set(
      'time_entries',
      {
        data: Array.from({ length: 4 }, (_, i) => ({ id: `te-${i}`, clock_out_at: null, employee: { name: `Employee ${i}` } })),
        error: null,
      },
    );
    tableResults.set('shifts', { data: [], error: null });
    tableResults.set('shift_assignments', { data: [], error: null });

    const { getNeedsYou } = await import('../../src/services/dashboard.service.js');
    const items = await getNeedsYou('loc-1');

    expect(items).toHaveLength(5);
  });
});
