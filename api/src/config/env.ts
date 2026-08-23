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

  /**
   * Where the reporting assistant sends its chat completions. Defaults to a local Ollama
   * daemon, which is right for `npm run dev` on a machine running Ollama.
   *
   * A deployed API cannot reach a developer's `localhost`, so any non-local deployment must
   * set this to a host it can actually reach — `https://ollama.com` (with OLLAMA_API_KEY) if
   * the model is a `-cloud` one, or a tunnel to the machine running the daemon.
   */
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  /**
   * Must advertise the `tools` capability — the assistant is built entirely on tool calls and
   * a model without them will answer from imagination instead of from the database.
   */
  OLLAMA_MODEL: z.string().min(1).default('gpt-oss:120b-cloud'),
  /** Only needed when OLLAMA_BASE_URL points at a host that authenticates (e.g. ollama.com). */
  OLLAMA_API_KEY: z.string().min(1).optional(),

  /**
   * Transactional email, used to send a new user their temporary password. Sent through
   * Resend's HTTP API directly rather than Supabase Auth, whose templates cannot carry a
   * generated credential.
   *
   * Both are optional: without them the API still creates accounts and still returns the temp
   * password to the manager, it just cannot mail it. That is deliberate — losing email must
   * not make onboarding impossible.
   *
   * RESEND_FROM must be on a domain verified at resend.com/domains. Until one is, Resend
   * refuses to send to anyone but the account owner's own address.
   */
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM: z.string().min(1).optional(),
  /** Shown in the email so the recipient knows which app it is about. */
  APP_NAME: z.string().min(1).default('Shift Tracker'),

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
