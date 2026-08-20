import { z } from 'zod';

export const CreateTimeOffRequestSchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
  reason: z.string().min(1, 'A reason is required'),
});

export const DecideTimeOffSchema = z.object({
  approve: z.boolean(),
  comment: z.string().optional(),
});
