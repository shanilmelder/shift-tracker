import { z } from 'zod';

/**
 * Coordinates are OPTIONAL on clocking in and out.
 *
 * FR-038 is explicit that the location check never blocks the action, and required coordinates
 * broke that: an employee who declines the OS location prompt (or whose GPS simply fails) could
 * not clock in at all, which is the strictest possible block. A missing position is instead
 * treated like a position outside the fence — recorded, flagged for a manager to review, and
 * allowed through.
 *
 * The geofence-check endpoint below still requires them, because there is nothing to answer
 * without a position.
 */
export const ClockInSchema = z.object({
  shiftId: z.string().uuid(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  idempotencyKey: z.string().min(1),
});

export const ClockOutSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  idempotencyKey: z.string().min(1),
});

export const GeofenceCheckSchema = z.object({
  shiftId: z.string().uuid(),
  lat: z.number(),
  lng: z.number(),
});
