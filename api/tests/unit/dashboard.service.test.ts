import { describe, it, expect } from 'vitest';
import { groupCoverageByDay } from '../../src/services/dashboard.service.js';

/**
 * Unit tests for the "Coverage this week" bar chart's grouping logic. Pure function — no
 * Supabase involved, same rationale as computeRegularAndOvertimeHours: verify the math/grouping
 * in isolation from getDashboard's I/O and from currentWeekDayKeys' own "what week is this"
 * timezone logic (a fixed set of day-keys is passed in directly instead).
 */
describe('groupCoverageByDay', () => {
  const weekDayKeys = ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30'];

  it('returns all 7 days Mon-Sun even when some have no shifts', () => {
    const result = groupCoverageByDay([], new Set(), 'UTC', weekDayKeys);
    expect(result.map((d) => d.dayLabel)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(result.map((d) => d.date)).toEqual(weekDayKeys);
  });

  it('treats a day with no shifts as 100% coverage (nothing to be uncovered)', () => {
    const result = groupCoverageByDay([], new Set(), 'UTC', weekDayKeys);
    expect(result.every((d) => d.coveragePct === 100 && d.totalShifts === 0)).toBe(true);
  });

  it('computes staffed/total per day, counting only shifts with an assignment as staffed', () => {
    const shifts = [
      { id: 's1', startTime: '2026-08-24T09:00:00Z' }, // Mon
      { id: 's2', startTime: '2026-08-24T13:00:00Z' }, // Mon
      { id: 's3', startTime: '2026-08-25T09:00:00Z' }, // Tue
    ];
    const staffed = new Set(['s1']); // s2 and s3 unstaffed
    const result = groupCoverageByDay(shifts, staffed, 'UTC', weekDayKeys);

    const mon = result.find((d) => d.dayLabel === 'Mon')!;
    expect(mon).toMatchObject({ totalShifts: 2, staffedShifts: 1, coveragePct: 50 });

    const tue = result.find((d) => d.dayLabel === 'Tue')!;
    expect(tue).toMatchObject({ totalShifts: 1, staffedShifts: 0, coveragePct: 0 });
  });

  it('groups by the given timezone, not the UTC day, and drops shifts outside the given week', () => {
    // 2026-08-24T04:00:00Z is Monday in UTC, but only 11pm the previous Sunday in
    // America/Chicago (UTC-5 in August) — since 2026-08-23 isn't in weekDayKeys, this shift
    // must not be attributed to any day in the result (specifically not Monday, which naive
    // UTC-date slicing would have wrongly done).
    const shifts = [{ id: 's1', startTime: '2026-08-24T04:00:00Z' }];
    const result = groupCoverageByDay(shifts, new Set(['s1']), 'America/Chicago', weekDayKeys);

    expect(result.every((d) => d.totalShifts === 0)).toBe(true);
  });
});
