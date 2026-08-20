import { z } from 'zod';

export const ListShiftsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z.enum(['draft', 'scheduled', 'open', 'completed', 'cancelled']).optional(),
});

export const CreateShiftSchema = z.object({
  name: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  shiftAreaId: z.string().uuid().optional(),
  position: z.string().min(1).optional(),
  notes: z.string().optional(),
});
export type CreateShiftBody = z.infer<typeof CreateShiftSchema>;

export const ReplaceStaffingSchema = z.object({
  assignments: z
    .array(z.object({ employeeId: z.string().uuid(), isLeader: z.boolean() }))
    .refine((rows) => rows.filter((r) => r.isLeader).length <= 1, {
      message: 'At most one shift leader is allowed per shift',
    }),
});
export type ReplaceStaffingBody = z.infer<typeof ReplaceStaffingSchema>;

export const UpdateShiftSchema = z.object({
  name: z.string().min(1).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  shiftAreaId: z.string().uuid().nullable().optional(),
  position: z.string().min(1).nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type UpdateShiftBody = z.infer<typeof UpdateShiftSchema>;
