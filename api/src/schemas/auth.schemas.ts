import { z } from 'zod';

export const CreateSessionSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const PasswordResetSchema = z.object({
  email: z.string().email(),
});
