import { describe, it, expect, vi } from 'vitest';

/**
 * Clocking in must never be blocked by location (FR-038). Coordinates being *required* was the
 * hardest possible block: an employee who refused the OS location prompt could not clock in at
 * all, and the app surfaced it as a network error about retrying when back online.
 *
 * These cover the resulting three-way behaviour through the real clockIn, with only the
 * database faked.
 */

const findByIdempotencyKey = vi.fn();
const insertClockIn = vi.fn();
const findShiftById = vi.fn();
const locationSingle = vi.fn();

vi.mock('../../src/data/time-entries.repo.js', () => ({
  findByIdempotencyKey: (...a: unknown[]) => findByIdempotencyKey(...a),
  // Echoes its argument back, so a test can assert on exactly what would have been written.
  insertClockIn: (input: unknown) => insertClockIn(input) ?? Promise.resolve(input),
  recordClockOut: vi.fn(),
  findById: vi.fn(),
  listForEmployee: vi.fn(),
}));
vi.mock('../../src/data/shifts.repo.js', () => ({ findShiftById: (...a: unknown[]) => findShiftById(...a) }));
vi.mock('../../src/data/supabase-client.js', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ single: () => locationSingle() }) }) }) },
}));

/** A fence centred on the origin with a 100 m radius. */
function withFence() {
  locationSingle.mockResolvedValue({ data: { latitude: 0, longitude: 0, geofence_radius_m: 100 }, error: null });
}

async function clockInWith(coords: { lat?: number; lng?: number }) {
  findByIdempotencyKey.mockResolvedValue(null);
  insertClockIn.mockImplementation((input: unknown) => Promise.resolve(input));
  findShiftById.mockResolvedValue({ id: 'shift-1', location_id: 'loc-1', start_time: '', end_time: '' });
  const { clockIn } = await import('../../src/services/time-entries.service.js');
  return (await clockIn({ shiftId: 'shift-1', employeeId: 'emp-1', idempotencyKey: `k-${Math.random()}`, ...coords })) as unknown as {
    flaggedForReview: boolean;
    lat?: number;
    lng?: number;
  };
}

describe('clockIn location handling', () => {
  it('succeeds with no coordinates at all, rather than refusing', async () => {
    withFence();
    const entry = await clockInWith({});
    // The bug this guards: requiring coordinates meant a refused permission blocked clock-in.
    expect(entry).toBeDefined();
    expect(entry.lat).toBeUndefined();
  });

  it('flags an entry that has no position', async () => {
    withFence();
    // Allowed through, but a clock-in that cannot be placed is exactly what a manager reviews.
    expect((await clockInWith({})).flaggedForReview).toBe(true);
  });

  it('does not flag a position inside the fence', async () => {
    withFence();
    expect((await clockInWith({ lat: 0, lng: 0 })).flaggedForReview).toBe(false);
  });

  it('flags a position outside the fence', async () => {
    withFence();
    // ~1.1 km north of the origin, well outside 100 m.
    expect((await clockInWith({ lat: 0.01, lng: 0 })).flaggedForReview).toBe(true);
  });

  it('does not flag a missing position when the location has no fence configured', async () => {
    // "Unknown fence" must not read as "outside the fence" — there is nothing to be outside of.
    locationSingle.mockResolvedValue({ data: { latitude: null, longitude: null, geofence_radius_m: 100 }, error: null });
    expect((await clockInWith({})).flaggedForReview).toBe(false);
  });
});
