import { z } from 'zod';

export const ClockInSchema = z.object({
  shiftId: z.string().uuid(),
  lat: z.number(),
  lng: z.number(),
  idempotencyKey: z.string().min(1),
});

export const ClockOutSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  idempotencyKey: z.string().min(1),
});

export const GeofenceCheckSchema = z.object({
  shiftId: z.string().uuid(),
  lat: z.number(),
  lng: z.number(),
});
