import * as repo from '../data/shift-templates.repo.js';
import type { CallerProfile } from '../types.js';

/** Manager-only create/list/remove, scoped to their own location — mirrors shift-areas.service.ts. */
export async function listShiftTemplates(locationId: string) {
  return repo.listForLocation(locationId);
}

export async function createShiftTemplate(
  caller: CallerProfile,
  input: { name: string; startTime: string; endTime: string; shiftAreaId?: string },
) {
  return repo.insert({ locationId: caller.locationId, createdBy: caller.id, ...input });
}

export async function removeShiftTemplate(caller: CallerProfile, id: string) {
  const templates = await repo.listForLocation(caller.locationId);
  if (!templates.some((t) => t.id === id)) throw new Error('Shift template not found at your location');
  return repo.remove(id);
}
