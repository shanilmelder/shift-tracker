import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Who an employee may offer a shift swap to.
 *
 * The bug this exists for: the caller was not excluded from their own eligible list. The
 * double-booking check deliberately ignores the shift being swapped, so the requester never
 * conflicts with it and always came back "eligible". At a location with one employee that made
 * *themselves* the only option offered, and picking it failed with "Cannot request a swap with
 * yourself" — which the app swallowed, so swaps simply never got created.
 */

const profileRows = vi.fn();
const findShiftById = vi.fn();
const isEmployeeAssignedToShift = vi.fn();
const checkStaffingConflicts = vi.fn();

/** Records the filters applied so the test can assert on them without a real database. */
const applied: Array<{ op: string; args: unknown[] }> = [];

vi.mock('../../src/data/supabase-client.js', () => {
  const chain: Record<string, unknown> = {};
  for (const op of ['select', 'eq', 'neq', 'order']) {
    chain[op] = (...args: unknown[]) => {
      applied.push({ op, args });
      return chain;
    };
  }
  chain.then = (resolve: (v: unknown) => unknown) => resolve(profileRows());
  return { supabase: { from: () => chain } };
});
vi.mock('../../src/data/shifts.repo.js', () => ({ findShiftById: (...a: unknown[]) => findShiftById(...a) }));
vi.mock('../../src/data/shift-assignments.repo.js', () => ({
  isEmployeeAssignedToShift: (...a: unknown[]) => isEmployeeAssignedToShift(...a),
}));
vi.mock('../../src/services/staffing.service.js', () => ({
  checkStaffingConflicts: (...a: unknown[]) => checkStaffingConflicts(...a),
}));

const CALLER = {
  id: 'caller-1',
  name: 'Test User',
  role: 'employee' as const,
  locationId: 'loc-1',
  isActive: true,
  mustChangePassword: false,
};

describe('listEligibleCoworkers', () => {
  beforeEach(() => {
    applied.length = 0;
    findShiftById.mockResolvedValue({ id: 'shift-1', location_id: 'loc-1', start_time: '2026-09-01T09:00:00Z', end_time: '2026-09-01T17:00:00Z' });
    isEmployeeAssignedToShift.mockResolvedValue(true);
    checkStaffingConflicts.mockResolvedValue(null);
    profileRows.mockReturnValue({ data: [{ id: 'other-1', name: 'Dan Wu' }], error: null });
  });

  it('excludes the caller from their own list', async () => {
    const { listEligibleCoworkers } = await import('../../src/services/swaps.service.js');
    await listEligibleCoworkers(CALLER, 'shift-1');

    expect(applied).toContainEqual({ op: 'neq', args: ['id', 'caller-1'] });
  });

  it('excludes deactivated colleagues, who could not accept anyway', async () => {
    const { listEligibleCoworkers } = await import('../../src/services/swaps.service.js');
    await listEligibleCoworkers(CALLER, 'shift-1');

    expect(applied).toContainEqual({ op: 'eq', args: ['is_active', true] });
  });

  it('returns names alongside ids, not bare ids', async () => {
    const { listEligibleCoworkers } = await import('../../src/services/swaps.service.js');
    const eligible = await listEligibleCoworkers(CALLER, 'shift-1');

    // A picker rendering raw uuids is not something anyone can choose a colleague from.
    expect(eligible).toEqual([{ id: 'other-1', name: 'Dan Wu' }]);
  });

  it('drops a colleague whose schedule conflicts', async () => {
    checkStaffingConflicts.mockResolvedValue({ reason: 'double_booked' });
    const { listEligibleCoworkers } = await import('../../src/services/swaps.service.js');

    expect(await listEligibleCoworkers(CALLER, 'shift-1')).toEqual([]);
  });

  it('refuses a caller who is not staffed on the shift', async () => {
    isEmployeeAssignedToShift.mockResolvedValue(false);
    const { listEligibleCoworkers } = await import('../../src/services/swaps.service.js');

    await expect(listEligibleCoworkers(CALLER, 'shift-1')).rejects.toThrow(/Not authorized/);
  });
});
