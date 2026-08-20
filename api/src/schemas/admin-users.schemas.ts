import { z } from 'zod';

export const CreateUserSchema = z.object({
  name: z.string().min(1),
  role: z.enum(['employee', 'manager']),
  email: z.string().email(),
  phone: z.string().min(1).optional(),
  locationId: z.string().uuid(),
  jobRole: z.string().min(1).optional(),
  payRate: z.number().positive().optional(),
});
export type CreateUserBody = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  jobRole: z.string().min(1).optional(),
  payRate: z.number().positive().optional(),
  locationId: z.string().uuid().optional(),
});
export type UpdateUserBody = z.infer<typeof UpdateUserSchema>;
