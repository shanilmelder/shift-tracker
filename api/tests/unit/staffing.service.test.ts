import { describe, it, expect } from 'vitest';
import { detectDoubleBooking, detectInsufficientRest, MIN_REST_HOURS_DEFAULT } from '../../src/services/staffing.service.js';

/**
 * Unit tests for T044/FR-028: double-booking and insufficient-rest conflict detection. These
 * are pure functions with no DB/network dependency (constitution: Testable Business Logic),
 * so they run instantly and exercise the exact boundary conditions the spec cares about.
 */
describe('detectDoubleBooking', () => {
  it('flags an overlapping existing shift', () => {
    const candidate = { startTime: '2026-09-01T09:00:00Z', endTime: '2026-09-01T17:00:00Z' };
    const existing = [{ shiftId: 'other-shift', startTime: '2026-09-01T12:00:00Z', endTime: '2026-09-01T20:00:00Z' }];

    const conflict = detectDoubleBooking(candidate, existing);
    expect(conflict).not.toBeNull();
    expect(conflict?.conflictingShiftId).toBe('other-shift');
  });

  it('does not flag a back-to-back, non-overlapping shift', () => {
    const candidate = { startTime: '2026-09-01T09:00:00Z', endTime: '2026-09-01T17:00:00Z' };
    const existing = [{ shiftId: 'other-shift', startTime: '2026-09-01T17:00:00Z', endTime: '2026-09-02T01:00:00Z' }];

    expect(detectDoubleBooking(candidate, existing)).toBeNull();
  });

  it('ignores the shift being staffed itself when re-staffing (no self-conflict)', () => {
    const candidate = { startTime: '2026-09-01T09:00:00Z', endTime: '2026-09-01T17:00:00Z', shiftId: 'this-shift' };
    const existing = [{ shiftId: 'this-shift', startTime: '2026-09-01T09:00:00Z', endTime: '2026-09-01T17:00:00Z' }];

    expect(detectDoubleBooking(candidate, existing)).toBeNull();
  });
});

describe('detectInsufficientRest', () => {
  it('flags a new shift starting less than the minimum rest window after a prior shift ends', () => {
    const candidate = { startTime: '2026-09-02T02:00:00Z', endTime: '2026-09-02T10:00:00Z' };
    const existing = [{ shiftId: 'prior-shift', startTime: '2026-09-01T14:00:00Z', endTime: '2026-09-01T22:00:00Z' }];
    // Gap here is 4 hours, well under the default minimum.

    const conflict = detectInsufficientRest(candidate, existing, MIN_REST_HOURS_DEFAULT);
    expect(conflict).not.toBeNull();
    expect(conflict?.restHours).toBe(4);
  });

  it('does not flag a shift with exactly the minimum rest gap', () => {
    const candidate = { startTime: '2026-09-02T06:00:00Z', endTime: '2026-09-02T14:00:00Z' };
    const existing = [{ shiftId: 'prior-shift', startTime: '2026-09-01T14:00:00Z', endTime: '2026-09-01T22:00:00Z' }];
    // Gap here is exactly 8 hours.

    expect(detectInsufficientRest(candidate, existing, 8)).toBeNull();
  });

  it('does not flag two shifts on unrelated days with ample rest', () => {
    const candidate = { startTime: '2026-09-05T09:00:00Z', endTime: '2026-09-05T17:00:00Z' };
    const existing = [{ shiftId: 'prior-shift', startTime: '2026-09-01T09:00:00Z', endTime: '2026-09-01T17:00:00Z' }];

    expect(detectInsufficientRest(candidate, existing, MIN_REST_HOURS_DEFAULT)).toBeNull();
  });
});
