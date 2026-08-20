import { supabase } from '../data/supabase-client.js';
import { findShiftById } from '../data/shifts.repo.js';
import {
  findByIdempotencyKey,
  insertClockIn,
  recordClockOut,
  findById,
  listForEmployee,
  type TimeEntryRow,
} from '../data/time-entries.repo.js';

/** Fixed, non-configurable per the 2026-08-20 spec clarification (FR-020). */
export const OVERTIME_DAILY_THRESHOLD_HOURS = 8;

/**
 * Haversine distance in meters — pure function, no I/O (constitution: Testable Business
 * Logic).
 */
export function haversineDistanceMeters(point: { lat: number; lng: number }, center: { lat: number; lng: number }): number {
  const EARTH_RADIUS_M = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(point.lat - center.lat);
  const dLng = toRad(point.lng - center.lng);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(center.lat)) * Math.cos(toRad(point.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * Used to check a clock-in/out location against the shift's location geofence
 * (FR-037/FR-038): this NEVER blocks the action, it only decides `flagged_for_review`.
 */
export function isWithinGeofence(
  point: { lat: number; lng: number },
  center: { lat: number; lng: number },
  radiusMeters: number,
): boolean {
  return haversineDistanceMeters(point, center) <= radiusMeters;
}

export interface ClockInInput {
  shiftId: string;
  employeeId: string;
  lat: number;
  lng: number;
  idempotencyKey: string;
}

/**
 * FR-019/FR-037/FR-038/FR-040: never blocks on location or on being a repeat/offline-queued
 * call — a repeated `idempotencyKey` (e.g. an offline mutation retried after reconnecting)
 * returns the original entry rather than creating a duplicate row.
 */
export async function clockIn(input: ClockInInput): Promise<TimeEntryRow> {
  const existing = await findByIdempotencyKey(input.idempotencyKey);
  if (existing) return existing;

  const shift = await findShiftById(input.shiftId);
  if (!shift) throw new Error('Shift not found');

  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('geofence_radius_m, latitude, longitude')
    .eq('id', shift.location_id)
    .single();
  if (locationError || !location) throw locationError ?? new Error('Location not found');

  // A location with no coordinates yet (not set by a manager) fails open — never flags —
  // rather than treating "unknown" as "outside the fence" (FR-038: this check never blocks
  // or penalizes, it only ever adds a review flag when there's an actual answer).
  const withinGeofence =
    location.latitude === null || location.longitude === null
      ? true
      : isWithinGeofence({ lat: input.lat, lng: input.lng }, { lat: location.latitude, lng: location.longitude }, location.geofence_radius_m);

  return insertClockIn({
    shiftId: input.shiftId,
    employeeId: input.employeeId,
    clockInAt: new Date().toISOString(),
    lat: input.lat,
    lng: input.lng,
    flaggedForReview: !withinGeofence,
    idempotencyKey: input.idempotencyKey,
  });
}

export interface GeofenceCheckResult {
  withinRange: boolean;
  /** Omitted when the location has no coordinates set yet (see the null-coordinate branch
   * below) — there's nothing meaningful to report a distance to. */
  approxDistanceM?: number;
}

/**
 * Informational only (FR-038: never blocks) — lets the client show a live "inside/outside
 * range" status before the employee taps clock in. Deliberately returns just a verdict and a
 * rounded distance, never the location's actual coordinates or configured radius: those stay
 * manager-only (see locations.service.ts's getMyLocation), this endpoint answers one narrow
 * question instead of widening that access.
 */
export async function checkGeofence(shiftId: string, point: { lat: number; lng: number }): Promise<GeofenceCheckResult> {
  const shift = await findShiftById(shiftId);
  if (!shift) throw new Error('Shift not found');

  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('geofence_radius_m, latitude, longitude')
    .eq('id', shift.location_id)
    .single();
  if (locationError || !location) throw locationError ?? new Error('Location not found');

  if (location.latitude === null || location.longitude === null) {
    return { withinRange: true };
  }

  const distanceMeters = haversineDistanceMeters(point, { lat: location.latitude, lng: location.longitude });
  return {
    withinRange: distanceMeters <= location.geofence_radius_m,
    approxDistanceM: Math.round(distanceMeters),
  };
}

export interface ClockOutInput {
  timeEntryId: string;
  employeeId: string;
  lat: number;
  lng: number;
}

export async function clockOut(input: ClockOutInput): Promise<TimeEntryRow> {
  const entry = await findById(input.timeEntryId);
  if (!entry || entry.employee_id !== input.employeeId) throw new Error('Time entry not found');
  if (entry.clock_out_at) return entry; // idempotent: already clocked out

  const shift = await findShiftById(entry.shift_id);
  if (!shift) throw new Error('Shift not found');
  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('geofence_radius_m, latitude, longitude')
    .eq('id', shift.location_id)
    .single();
  if (locationError || !location) throw locationError ?? new Error('Location not found');

  const withinGeofence =
    location.latitude === null || location.longitude === null
      ? true
      : isWithinGeofence({ lat: input.lat, lng: input.lng }, { lat: location.latitude, lng: location.longitude }, location.geofence_radius_m);

  return recordClockOut(entry.id, {
    clockOutAt: new Date().toISOString(),
    lat: input.lat,
    lng: input.lng,
    flaggedForReview: entry.flagged_for_review || !withinGeofence,
  });
}

export async function listMyTimeEntries(employeeId: string, from?: string, to?: string): Promise<TimeEntryRow[]> {
  return listForEmployee(employeeId, from, to);
}

export interface HoursSummary {
  totalRegularHours: number;
  totalOvertimeHours: number;
}

/**
 * Pure function, no I/O (constitution: Testable Business Logic): groups completed entries by
 * LOCAL calendar day in the given timezone, sums hours per day, then splits each day's total
 * at the fixed 8-hour threshold. An entry with no `clockOutAt` (still in progress) is ignored
 * — it isn't "hours worked" yet.
 */
export function computeRegularAndOvertimeHours(
  entries: Array<{ clockInAt: string; clockOutAt: string | null }>,
  timeZone: string,
): HoursSummary {
  const hoursByDay = new Map<string, number>();

  for (const entry of entries) {
    if (!entry.clockOutAt) continue;
    const start = new Date(entry.clockInAt);
    const end = new Date(entry.clockOutAt);
    const hours = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
    const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(start);
    hoursByDay.set(dayKey, (hoursByDay.get(dayKey) ?? 0) + hours);
  }

  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  for (const dayTotal of hoursByDay.values()) {
    const regular = Math.min(dayTotal, OVERTIME_DAILY_THRESHOLD_HOURS);
    const overtime = Math.max(dayTotal - OVERTIME_DAILY_THRESHOLD_HOURS, 0);
    totalRegularHours += regular;
    totalOvertimeHours += overtime;
  }

  return { totalRegularHours, totalOvertimeHours };
}

export async function getTimesheet(employeeId: string, timeZone: string, from?: string, to?: string): Promise<HoursSummary> {
  const entries = await listForEmployee(employeeId, from, to);
  return computeRegularAndOvertimeHours(
    entries.map((e) => ({ clockInAt: e.clock_in_at!, clockOutAt: e.clock_out_at })).filter((e) => e.clockInAt),
    timeZone,
  );
}
