import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Breaks are paid (tracking/display only — see time-entry-breaks.service.ts's doc comment) and
 * multiple are allowed per shift, so startBreak is idempotent (a second tap while already on
 * break returns the existing open break) rather than erroring, and there's no cap on how many
 * closed break rows an entry can accumulate.
 */

const timeEntriesFindById = vi.fn();
const breaksFindOpen = vi.fn();
const breaksInsertStart = vi.fn();
const breaksRecordEnd = vi.fn();

vi.mock('../../src/data/time-entries.repo.js', () => ({
  findById: (...args: unknown[]) => timeEntriesFindById(...args),
}));

vi.mock('../../src/data/time-entry-breaks.repo.js', () => ({
  findOpenBreak: (...args: unknown[]) => breaksFindOpen(...args),
  insertBreakStart: (...args: unknown[]) => breaksInsertStart(...args),
  recordBreakEnd: (...args: unknown[]) => breaksRecordEnd(...args),
}));

describe('time-entry-breaks.service', () => {
  beforeEach(() => {
    timeEntriesFindById.mockReset();
    breaksFindOpen.mockReset();
    breaksInsertStart.mockReset();
    breaksRecordEnd.mockReset();
  });

  describe('startBreak', () => {
    it('inserts a new open break when none is open', async () => {
      timeEntriesFindById.mockResolvedValue({ id: 'entry-1', employee_id: 'emp-1', clock_out_at: null });
      breaksFindOpen.mockResolvedValue(null);
      breaksInsertStart.mockResolvedValue({ id: 'break-1', time_entry_id: 'entry-1', break_start_at: '2026-08-24T12:00:00Z', break_end_at: null });

      const { startBreak } = await import('../../src/services/time-entry-breaks.service.js');
      const result = await startBreak('entry-1', 'emp-1');

      expect(breaksInsertStart).toHaveBeenCalledWith('entry-1');
      expect(result.id).toBe('break-1');
    });

    it('is idempotent: returns the existing open break instead of inserting a second one', async () => {
      timeEntriesFindById.mockResolvedValue({ id: 'entry-1', employee_id: 'emp-1', clock_out_at: null });
      const existing = { id: 'break-1', time_entry_id: 'entry-1', break_start_at: '2026-08-24T12:00:00Z', break_end_at: null };
      breaksFindOpen.mockResolvedValue(existing);

      const { startBreak } = await import('../../src/services/time-entry-breaks.service.js');
      const result = await startBreak('entry-1', 'emp-1');

      expect(result).toBe(existing);
      expect(breaksInsertStart).not.toHaveBeenCalled();
    });

    it('rejects starting a break on an entry that has already clocked out', async () => {
      timeEntriesFindById.mockResolvedValue({ id: 'entry-1', employee_id: 'emp-1', clock_out_at: '2026-08-24T17:00:00Z' });

      const { startBreak } = await import('../../src/services/time-entry-breaks.service.js');
      await expect(startBreak('entry-1', 'emp-1')).rejects.toThrow();
      expect(breaksInsertStart).not.toHaveBeenCalled();
    });

    it('rejects when the entry does not belong to the caller', async () => {
      timeEntriesFindById.mockResolvedValue({ id: 'entry-1', employee_id: 'someone-else', clock_out_at: null });

      const { startBreak } = await import('../../src/services/time-entry-breaks.service.js');
      await expect(startBreak('entry-1', 'emp-1')).rejects.toThrow();
    });
  });

  describe('endBreak', () => {
    it('closes the currently open break', async () => {
      timeEntriesFindById.mockResolvedValue({ id: 'entry-1', employee_id: 'emp-1', clock_out_at: null });
      breaksFindOpen.mockResolvedValue({ id: 'break-1', time_entry_id: 'entry-1', break_start_at: '2026-08-24T12:00:00Z', break_end_at: null });
      breaksRecordEnd.mockResolvedValue({ id: 'break-1', time_entry_id: 'entry-1', break_start_at: '2026-08-24T12:00:00Z', break_end_at: '2026-08-24T12:15:00Z' });

      const { endBreak } = await import('../../src/services/time-entry-breaks.service.js');
      const result = await endBreak('entry-1', 'emp-1');

      expect(breaksRecordEnd).toHaveBeenCalledWith('break-1', expect.any(String));
      expect(result.break_end_at).not.toBeNull();
    });

    it('rejects ending a break when none is open', async () => {
      timeEntriesFindById.mockResolvedValue({ id: 'entry-1', employee_id: 'emp-1', clock_out_at: null });
      breaksFindOpen.mockResolvedValue(null);

      const { endBreak } = await import('../../src/services/time-entry-breaks.service.js');
      await expect(endBreak('entry-1', 'emp-1')).rejects.toThrow();
      expect(breaksRecordEnd).not.toHaveBeenCalled();
    });
  });
});
