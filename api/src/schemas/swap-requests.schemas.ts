import { z } from 'zod';

export const CreateSwapRequestSchema = z.object({
  shiftId: z.string().uuid(),
  targetEmployeeId: z.string().uuid(),
});

export const RespondSwapSchema = z.object({
  accept: z.boolean(),
});

export const DecideSwapSchema = z.object({
  approve: z.boolean(),
  comment: z.string().optional(),
});
