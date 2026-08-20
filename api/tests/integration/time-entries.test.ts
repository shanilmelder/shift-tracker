import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration test for T055 / User Story 4: clock-in inside vs. outside the geofence, and
 * idempotency-key dedup so a retried offline-queued clock-in is never double-applied.
 */

const shiftsSelectSingle = vi.fn();
const locationsSelectSingle = vi.fn();
const timeEntriesFindByKey = vi.fn();
const timeEntriesInsert = vi.fn();

vi.mock('../../src/data/supabase-client.js', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'shifts') {
        return { select: () => ({ eq: () => ({ maybeSingle: shiftsSelectSingle }) }) };
      }
      if (table === 'locations') {
        return { select: () => ({ eq: () => ({ single: locationsSelectSingle }) }) };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  },
}));

vi.mock('../../src/data/shifts.repo.js', () => ({
  findShiftById: async () => ({ id: 'shift-1', location_id: 'loc-1', start_time: '', end_time: '', status: 'scheduled' }),
}));

vi.mock('../../src/data/time-entries.repo.js', () => ({
  findByIdempotencyKey: (...args: unknown[]) => timeEntriesFindByKey(...args),
  insertClockIn: (...args: unknown[]) => timeEntriesInsert(...args),
}));

describe('time-entries.service.clockIn', () => {
  beforeEach(() => {
    shiftsSelectSingle.mockReset();
    locationsSelectSingle.mockReset();
    timeEntriesFindByKey.mockReset();
    timeEntriesInsert.mockReset();
  });

  it('records a clock-in with no flag when inside the geofence', async () => {
    timeEntriesFindByKey.mockResolvedValue(null);
    locationsSelectSingle.mockResolvedValue({
      data: { geofence_radius_m: 150, latitude: 41.8781, longitude: -87.6298 },
      error: null,
    });
    timeEntriesInsert.mockImplementation(async (input) => ({ id: 'entry-1', ...input, flagged_for_review: input.flaggedForReview }));

    const { clockIn } = await import('../../src/services/time-entries.service.js');
    const entry = await clockIn({ shiftId: 'shift-1', employeeId: 'emp-1', lat: 41.8781, lng: -87.6298, idempotencyKey: 'key-1' });

    expect(entry.flagged_for_review).toBe(false);
  });

  it('flags the clock-in for review when outside the geofence, but still succeeds', async () => {
    timeEntriesFindByKey.mockResolvedValue(null);
    locationsSelectSingle.mockResolvedValue({
      data: { geofence_radius_m: 150, latitude: 41.8781, longitude: -87.6298 },
      error: null,
    });
    timeEntriesInsert.mockImplementation(async (input) => ({ id: 'entry-2', ...input, flagged_for_review: input.flaggedForReview }));

    const { clockIn } = await import('../../src/services/time-entries.service.js');
    // ~1.1km away — well outside a 150m radius.
    const entry = await clockIn({ shiftId: 'shift-1', employeeId: 'emp-1', lat: 41.888, lng: -87.6298, idempotencyKey: 'key-2' });

    expect(entry.flagged_for_review).toBe(true);
  });

  it('returns the original entry on a repeated idempotency key instead of creating a duplicate', async () => {
    const original = { id: 'entry-3', idempotency_key: 'key-3', flagged_for_review: false };
    timeEntriesFindByKey.mockResolvedValue(original);

    const { clockIn } = await import('../../src/services/time-entries.service.js');
    const entry = await clockIn({ shiftId: 'shift-1', employeeId: 'emp-1', lat: 0, lng: 0, idempotencyKey: 'key-3' });

    expect(entry).toBe(original);
    expect(timeEntriesInsert).not.toHaveBeenCalled();
  });
});
