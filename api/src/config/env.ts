import { z } from 'zod';

/**
 * Fails fast at boot if a required environment variable is missing, rather than surfacing a
 * confusing downstream error the first time it's needed (constitution: Simplicity Over
 * Cleverness — validate once, at the edge, using a built-in schema library already in use
 * elsewhere in this codebase).
 *
 * SUPABASE_SERVICE_ROLE_KEY is a non-negotiable secret: it must never be logged, never sent to
 * the client, and only ever read from this module.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  SUPABASE_URL: z.string().url({ message: 'SUPABASE_URL must be a valid URL' }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  EXPO_PUSH_ACCESS_TOKEN: z.string().min(1).optional(),
  CORS_ORIGIN: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    // Fail fast and loud: a missing/invalid env var must stop boot, not surface as a
    // mysterious runtime error the first time it's used.
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env: Env = loadEnv();
