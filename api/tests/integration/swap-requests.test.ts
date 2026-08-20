import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration test for T063 / User Story 5: the full swap flow, including the manager-vs-
 * shift-leader approver branching (FR-011/FR-042) and the leader-scope rejection case
 * (FR-012: a leader may only decide on shifts they actually lead).
 */

const swapRequestsUpdate = vi.fn();
const swapRequestsSelectSingle = vi.fn();
const isShiftLeaderOfMock = vi.fn();

vi.mock('../../src/data/supabase-client.js', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'shift_swap_requests') {
        return {
          update: (...args: unknown[]) => ({
            eq: () => ({
              select: () => ({ single: () => swapRequestsUpdate(...args) }),
            }),
          }),
          select: () => ({ eq: () => ({ single: swapRequestsSelectSingle, maybeSingle: swapRequestsSelectSingle }) }),
        };
      }
      if (table === 'shift_assignments') {
        // Exercised by decideSwapRequest's approve path, which re-staffs the shift: reads the
        // requester's current `is_leader`, deletes their row, upserts the target employee.
        return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { is_leader: false }, error: null }) }) }) }),
          delete: () => ({ eq: () => ({ eq: async () => ({ data: null, error: null }) }) }),
          upsert: async () => ({ data: null, error: null }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  },
}));

vi.mock('../../src/middleware/require-shift-leader.middleware.js', () => ({
  isShiftLeaderOf: (...args: unknown[]) => isShiftLeaderOfMock(...args),
}));

// Notification/realtime side effects are out of scope for this test (covered by their own
// concerns elsewhere) — stubbed so decideSwapRequest's approval-notification step doesn't
// require a full device_push_tokens mock here.
vi.mock('../../src/services/notifications.service.js', () => ({
  sendPushToProfiles: vi.fn(),
  sendPushToProfile: vi.fn(),
}));
vi.mock('../../src/services/realtime.service.js', () => ({
  publishToProfiles: vi.fn(),
}));

describe('swaps.service.decide', () => {
  beforeEach(() => {
    swapRequestsUpdate.mockReset();
    swapRequestsSelectSingle.mockReset();
    isShiftLeaderOfMock.mockReset();
  });

  it('allows the shift leader to approve a coworker-accepted request for their own shift', async () => {
    swapRequestsSelectSingle.mockResolvedValue({
      data: { id: 'swap-1', shift_id: 'shift-1', status: 'coworker_accepted', requesting_employee_id: 'emp-a', target_employee_id: 'emp-b' },
      error: null,
    });
    isShiftLeaderOfMock.mockResolvedValue(true);
    swapRequestsUpdate.mockResolvedValue({
      data: { id: 'swap-1', status: 'manager_approved', decided_by: 'leader-1' },
      error: null,
    });

    const { decideSwapRequest } = await import('../../src/services/swaps.service.js');
    const result = await decideSwapRequest(
      { id: 'leader-1', role: 'employee', locationId: 'loc-1', name: 'Leader', isActive: true },
      'swap-1',
      { approve: true },
    );

    expect(result.status).toBe('manager_approved');
  });

  it('rejects a decision from an employee who leads a different shift, not this one', async () => {
    swapRequestsSelectSingle.mockResolvedValue({
      data: { id: 'swap-2', shift_id: 'shift-2', status: 'coworker_accepted', requesting_employee_id: 'emp-a', target_employee_id: 'emp-b' },
      error: null,
    });
    isShiftLeaderOfMock.mockResolvedValue(false); // leads a different shift, not shift-2

    const { decideSwapRequest } = await import('../../src/services/swaps.service.js');

    await expect(
      decideSwapRequest({ id: 'not-the-leader', role: 'employee', locationId: 'loc-1', name: 'X', isActive: true }, 'swap-2', {
        approve: true,
      }),
    ).rejects.toThrow(/not authorized/i);
  });

  it('allows the manager to approve when the shift has no designated leader', async () => {
    swapRequestsSelectSingle.mockResolvedValue({
      data: { id: 'swap-3', shift_id: 'shift-3', status: 'coworker_accepted', requesting_employee_id: 'emp-a', target_employee_id: 'emp-b' },
      error: null,
    });
    isShiftLeaderOfMock.mockResolvedValue(false);
    swapRequestsUpdate.mockResolvedValue({ data: { id: 'swap-3', status: 'manager_approved' }, error: null });

    const { decideSwapRequest } = await import('../../src/services/swaps.service.js');
    const result = await decideSwapRequest(
      { id: 'manager-1', role: 'manager', locationId: 'loc-1', name: 'Manager', isActive: true },
      'swap-3',
      { approve: true },
    );

    expect(result.status).toBe('manager_approved');
  });
});
