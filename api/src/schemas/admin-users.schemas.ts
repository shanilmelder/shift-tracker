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
  phone: z.string().min(1).optional(),
  jobRole: z.string().min(1).optional(),
  payRate: z.number().positive().optional(),
  locationId: z.string().uuid().optional(),
  // Role is editable here, but never on the self-service profile route -- users.service.ts
  // refuses a self-change and refuses demoting the last active manager.
  role: z.enum(['employee', 'manager']).optional(),
});

export const SetActiveSchema = z.object({ isActive: z.boolean() });
export type UpdateUserBody = z.infer<typeof UpdateUserSchema>;
