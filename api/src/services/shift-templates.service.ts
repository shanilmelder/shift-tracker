import * as repo from '../data/shift-templates.repo.js';
import { countShiftsByTemplate } from '../data/shifts.repo.js';
import { templateDeletionImpact, notifyShiftsRemoved } from './shifts.service.js';
import type { CallerProfile } from '../types.js';

/** Manager-only create/list/remove, scoped to their own location — mirrors shift-areas.service.ts. */
export async function listShiftTemplates(locationId: string) {
  const [templates, counts] = await Promise.all([repo.listForLocation(locationId), countShiftsByTemplate(locationId)]);
  // `shift_count` is what the Build screen warns with before a delete, so it ships with the
  // list rather than costing a second round trip at the moment the manager taps Delete.
  return templates.map((template) => ({ ...template, shift_count: counts.get(template.id) ?? 0 }));
}

export async function createShiftTemplate(
  caller: CallerProfile,
  input: { name: string; startTime: string; endTime: string; shiftAreaId?: string },
) {
  return repo.insert({ locationId: caller.locationId, createdBy: caller.id, ...input });
}

export type RemoveTemplateResult =
  | { ok: true; deletedShiftCount: number }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'has_time_entries'; timeEntryCount: number };

/**
 * Deletes a template and, by database cascade (0021 migration), every dated shift generated
 * from it — and through those, their staffing assignments. Refused when any of those shifts
 * already has clock-in history, since `time_entries` does not cascade: the delete would fail
 * at the database anyway, and erasing payroll records is not something a template tidy-up
 * should ever do.
 */
export async function removeShiftTemplate(caller: CallerProfile, id: string): Promise<RemoveTemplateResult> {
  const templates = await repo.listForLocation(caller.locationId);
  const template = templates.find((t) => t.id === id);
  if (!template) return { ok: false, reason: 'not_found' };

  const { shiftIds, timeEntryCount } = await templateDeletionImpact(id);
  if (timeEntryCount > 0) return { ok: false, reason: 'has_time_entries', timeEntryCount };

  // Before the cascade removes the assignment rows that name the recipients.
  await notifyShiftsRemoved(shiftIds, template.name);
  await repo.remove(id);
  return { ok: true, deletedShiftCount: shiftIds.length };
}
