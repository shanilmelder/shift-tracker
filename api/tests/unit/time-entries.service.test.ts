import { describe, it, expect } from 'vitest';
import { computeRegularAndOvertimeHours, OVERTIME_DAILY_THRESHOLD_HOURS, isWithinGeofence } from '../../src/services/time-entries.service.js';

/**
 * Unit tests for T054/FR-020: the fixed 8-hour/day overtime split. Pure function, grouped by
 * LOCAL calendar day (using the supplied timezone) since "a day" for overtime purposes means
 * the employee's local day, not a UTC day boundary — getting this wrong would misclassify
 * hours worked near midnight.
 */
describe('computeRegularAndOvertimeHours', () => {
  it('counts all hours as regular when under the daily threshold', () => {
    const entries = [{ clockInAt: '2026-09-01T09:00:00Z', clockOutAt: '2026-09-01T15:00:00Z' }];
    const result = computeRegularAndOvertimeHours(entries, 'UTC');
    expect(result.totalRegularHours).toBe(6);
    expect(result.totalOvertimeHours).toBe(0);
  });

  it('splits hours beyond the fixed 8-hour/day threshold into overtime', () => {
    const entries = [{ clockInAt: '2026-09-01T08:00:00Z', clockOutAt: '2026-09-01T18:00:00Z' }]; // 10 hours
    const result = computeRegularAndOvertimeHours(entries, 'UTC');
    expect(result.totalRegularHours).toBe(OVERTIME_DAILY_THRESHOLD_HOURS);
    expect(result.totalOvertimeHours).toBe(2);
  });

  it('sums multiple entries on the same local day before applying the threshold', () => {
    const entries = [
      { clockInAt: '2026-09-01T08:00:00Z', clockOutAt: '2026-09-01T12:00:00Z' }, // 4h
      { clockInAt: '2026-09-01T13:00:00Z', clockOutAt: '2026-09-01T19:00:00Z' }, // 6h -> 10h total
    ];
    const result = computeRegularAndOvertimeHours(entries, 'UTC');
    expect(result.totalRegularHours).toBe(8);
    expect(result.totalOvertimeHours).toBe(2);
  });

  it('does not carry hours across separate days', () => {
    const entries = [
      { clockInAt: '2026-09-01T08:00:00Z', clockOutAt: '2026-09-01T15:00:00Z' }, // 7h day 1
      { clockInAt: '2026-09-02T08:00:00Z', clockOutAt: '2026-09-02T15:00:00Z' }, // 7h day 2
    ];
    const result = computeRegularAndOvertimeHours(entries, 'UTC');
    expect(result.totalRegularHours).toBe(14);
    expect(result.totalOvertimeHours).toBe(0);
  });

  it('ignores an entry with no clock-out yet (in-progress shift)', () => {
    const entries = [{ clockInAt: '2026-09-01T08:00:00Z', clockOutAt: null }];
    const result = computeRegularAndOvertimeHours(entries, 'UTC');
    expect(result.totalRegularHours).toBe(0);
    expect(result.totalOvertimeHours).toBe(0);
  });
});

describe('isWithinGeofence', () => {
  it('returns true for the same coordinates', () => {
    expect(isWithinGeofence({ lat: 41.8781, lng: -87.6298 }, { lat: 41.8781, lng: -87.6298 }, 150)).toBe(true);
  });

  it('returns false for coordinates well outside the radius', () => {
    // ~1.1km away (roughly 0.01 degrees latitude) vs a 150m radius.
    expect(isWithinGeofence({ lat: 41.8781, lng: -87.6298 }, { lat: 41.888, lng: -87.6298 }, 150)).toBe(false);
  });

  it('returns true for coordinates just inside a generous radius', () => {
    expect(isWithinGeofence({ lat: 41.8781, lng: -87.6298 }, { lat: 41.8782, lng: -87.6298 }, 150)).toBe(true);
  });
});
