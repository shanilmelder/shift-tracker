import { supabase } from '../data/supabase-client.js';
import type { CallerProfile } from '../types.js';

export async function getMyLocation(caller: CallerProfile) {
  const { data, error } = await supabase.from('locations').select('*').eq('id', caller.locationId).single();
  if (error || !data) throw error ?? new Error('Location not found');
  // Employees don't need (and per FR-024 shouldn't manage) the geofence radius/rest-hours
  // config fields; managers get everything.
  if (caller.role === 'employee') {
    const { geofence_radius_m: _r, min_rest_hours: _m, ...publicFields } = data as Record<string, unknown>;
    return publicFields;
  }
  return data;
}

export async function updateMyLocation(
  caller: CallerProfile,
  patch: { name?: string; address?: string; timezone?: string; geofenceRadiusM?: number; minRestHours?: number; latitude?: number; longitude?: number },
) {
  const { data, error } = await supabase
    .from('locations')
    .update({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.address !== undefined ? { address: patch.address } : {}),
      ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
      ...(patch.geofenceRadiusM !== undefined ? { geofence_radius_m: patch.geofenceRadiusM } : {}),
      ...(patch.minRestHours !== undefined ? { min_rest_hours: patch.minRestHours } : {}),
      ...(patch.latitude !== undefined ? { latitude: patch.latitude } : {}),
      ...(patch.longitude !== undefined ? { longitude: patch.longitude } : {}),
    })
    .eq('id', caller.locationId)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to update location');
  return data;
}
