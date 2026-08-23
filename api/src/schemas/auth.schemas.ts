import { z } from 'zod';

export const CreateSessionSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Also the floor for a password chosen to replace a temporary one — the generated temp is
 * longer than this, so a user can never "change" to something weaker than what they were sent. */
export const SetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
