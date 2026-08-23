import { describe, it, expect } from 'vitest';
import { generateTempPassword } from '../../src/lib/temp-password.js';

/**
 * A temp password is the only thing standing in front of a brand-new account, and it is
 * emailed in plain text. These assert the two properties that makes acceptable: it is not
 * guessable, and it is not misreadable.
 */
describe('generateTempPassword', () => {
  it('never repeats across many draws', () => {
    // A collision here would mean the generator is not drawing from real randomness — the
    // failure mode that would let one onboarded user derive a colleague's password.
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i += 1) seen.add(generateTempPassword());
    expect(seen.size).toBe(2000);
  });

  it('satisfies the API password minimum, so a reset can never be rejected for length', () => {
    expect(generateTempPassword().replace(/-/g, '').length).toBeGreaterThanOrEqual(8);
  });

  it('excludes characters that are misread when dictated or retyped', () => {
    // 0/O, 1/l/I, 5/S and 8/B are the pairs that turn into "the password doesn't work".
    const forbidden = /[0O1lI5S8B]/;
    for (let i = 0; i < 500; i += 1) {
      expect(generateTempPassword()).not.toMatch(forbidden);
    }
  });

  it('uses a stable, readable dashed shape', () => {
    expect(generateTempPassword()).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/);
  });

  it('draws on the whole alphabet rather than a narrow slice of it', () => {
    // Guards against an off-by-one in the index range silently shrinking the keyspace.
    const chars = new Set<string>();
    for (let i = 0; i < 1000; i += 1) {
      for (const char of generateTempPassword().replace(/-/g, '')) chars.add(char);
    }
    expect(chars.size).toBeGreaterThan(45);
  });
});
