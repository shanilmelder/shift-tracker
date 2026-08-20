import * as repo from '../data/shift-areas.repo.js';
import type { CallerProfile } from '../types.js';

/** FR-032/FR-033: manager-only create/rename/remove, scoped to their own location. */
export async function listShiftAreas(locationId: string) {
  return repo.listForLocation(locationId);
}

export async function createShiftArea(caller: CallerProfile, name: string) {
  return repo.insert(caller.locationId, name);
}

export async function renameShiftArea(caller: CallerProfile, id: string, name: string) {
  const areas = await repo.listForLocation(caller.locationId);
  if (!areas.some((a) => a.id === id)) throw new Error('Area not found at your location');
  return repo.rename(id, name);
}

export async function removeShiftArea(caller: CallerProfile, id: string) {
  const areas = await repo.listForLocation(caller.locationId);
  if (!areas.some((a) => a.id === id)) throw new Error('Area not found at your location');

  const stillUsed = await repo.isReferencedByAnyShift(id);
  if (stillUsed) {
    throw new Error('Cannot remove an area that is still attached to one or more shifts');
  }
  return repo.remove(id);
}
