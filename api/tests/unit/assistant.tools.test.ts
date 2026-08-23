import { describe, it, expect } from 'vitest';
import {
  zonedRange,
  zonedDateAndHour,
  countDaysInWindow,
  PART_OF_DAY_BANDS,
  TOOL_DEFINITIONS,
  ASSISTANT_TOOLS,
} from '../../src/services/assistant.tools.js';

/**
 * The assistant's date handling, tested as pure functions (constitution: Testable Business
 * Logic). This is where a wrong answer would be most convincing and least visible: the model
 * will happily narrate whatever range it is handed, so "who is working tomorrow" returning the
 * wrong day looks exactly like a correct answer to the person reading it.
 */

describe('zonedRange', () => {
  it('covers a full local day, not a UTC day, for a zone ahead of UTC', () => {
    // Asia/Kolkata is UTC+5:30 year-round, so a local day starts at 18:30 the previous day UTC.
    const { startUtc, endUtc } = zonedRange('2026-08-24', '2026-08-24', 'Asia/Kolkata');
    expect(startUtc).toBe('2026-08-23T18:30:00.000Z');
    expect(endUtc).toBe('2026-08-24T18:30:00.000Z');
  });

  it('covers a full local day for a zone behind UTC', () => {
    const { startUtc, endUtc } = zonedRange('2026-08-24', '2026-08-24', 'America/New_York');
    expect(startUtc).toBe('2026-08-24T04:00:00.000Z');
    expect(endUtc).toBe('2026-08-25T04:00:00.000Z');
  });

  it('spans multiple days inclusively of the end date', () => {
    const { startUtc, endUtc } = zonedRange('2026-08-01', '2026-08-31', 'UTC');
    expect(startUtc).toBe('2026-08-01T00:00:00.000Z');
    // Half-open, so the end is midnight *after* the 31st — the 31st itself is included.
    expect(endUtc).toBe('2026-09-01T00:00:00.000Z');
  });

  it('resolves a day that begins on a DST transition', () => {
    // US DST begins 2026-03-08. The local day still starts at local midnight (EST, -5), and
    // ends 23 hours later at midnight EDT (-4) — the naive "add 24 hours" answer is wrong.
    const { startUtc, endUtc } = zonedRange('2026-03-08', '2026-03-08', 'America/New_York');
    expect(startUtc).toBe('2026-03-08T05:00:00.000Z');
    expect(endUtc).toBe('2026-03-09T04:00:00.000Z');
  });
});

describe('zonedDateAndHour', () => {
  it('reports the local date and hour, not the UTC ones', () => {
    // 21:00 UTC is already the next calendar day, at 02:30, in Kolkata.
    expect(zonedDateAndHour('2026-08-23T21:00:00Z', 'Asia/Kolkata')).toEqual({ date: '2026-08-24', hour: 2 });
  });

  it('keeps midnight as hour 0 rather than 24', () => {
    expect(zonedDateAndHour('2026-08-24T00:00:00Z', 'UTC').hour).toBe(0);
  });
});

describe('PART_OF_DAY_BANDS', () => {
  it('classifies a 06:00 start as morning and nothing else', () => {
    expect(PART_OF_DAY_BANDS.morning!(6)).toBe(true);
    expect(PART_OF_DAY_BANDS.afternoon!(6)).toBe(false);
    expect(PART_OF_DAY_BANDS.night!(6)).toBe(false);
  });

  it('treats night as wrapping past midnight', () => {
    expect(PART_OF_DAY_BANDS.night!(23)).toBe(true);
    expect(PART_OF_DAY_BANDS.night!(2)).toBe(true);
    expect(PART_OF_DAY_BANDS.night!(12)).toBe(false);
  });

  it('leaves no gap between adjacent bands', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const matching = Object.values(PART_OF_DAY_BANDS).filter((matches) => matches(hour));
      expect(matching).toHaveLength(1);
    }
  });
});

describe('countDaysInWindow', () => {
  it('counts a single-day request as one day', () => {
    expect(countDaysInWindow('2026-08-10', '2026-08-10', '2026-08-01', '2026-08-31')).toBe(1);
  });

  it('counts both end dates of a multi-day request', () => {
    expect(countDaysInWindow('2026-08-10', '2026-08-14', '2026-08-01', '2026-08-31')).toBe(5);
  });

  it('clamps a request that starts before the window', () => {
    expect(countDaysInWindow('2026-07-28', '2026-08-03', '2026-08-01', '2026-08-31')).toBe(3);
  });

  it('clamps a request that runs past the end of the window', () => {
    expect(countDaysInWindow('2026-08-29', '2026-09-05', '2026-08-01', '2026-08-31')).toBe(3);
  });

  it('clamps a request that swallows the whole window', () => {
    expect(countDaysInWindow('2026-01-01', '2026-12-31', '2026-08-01', '2026-08-31')).toBe(31);
  });

  it('returns zero for a request entirely outside the window', () => {
    expect(countDaysInWindow('2026-06-01', '2026-06-10', '2026-08-01', '2026-08-31')).toBe(0);
  });
});

describe('tool definitions', () => {
  it('exposes every tool to the model exactly once', () => {
    const names = TOOL_DEFINITIONS.map((tool) => tool.function.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.sort()).toEqual(Object.keys(ASSISTANT_TOOLS).sort());
  });

  it('gives every tool a description, since that is all the model routes on', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.function.description.length).toBeGreaterThan(20);
    }
  });

  it('never accepts a location from the model', () => {
    // The containment boundary: scope comes from the authenticated caller, so no tool may take
    // a location as an argument, or the model could ask about someone else's data.
    for (const tool of TOOL_DEFINITIONS) {
      expect(Object.keys(tool.function.parameters.properties)).not.toContain('location_id');
      expect(Object.keys(tool.function.parameters.properties)).not.toContain('locationId');
    }
  });
});
