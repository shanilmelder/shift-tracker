import type { FastifyReply, FastifyRequest } from 'fastify';
import '../types.js';

/**
 * The only routes an account still on its temporary password may call. Everything else in the
 * API is refused until the person has chosen their own password.
 *
 * An allow-list rather than an opt-out, for the same reason app.ts's PUBLIC_ROUTES is one: a
 * route added later is locked down by default instead of silently inheriting an exemption.
 */
const ALLOWED_WHILE_PENDING = new Set<string>([
  // The way out of this state.
  'PATCH /v1/auth/password',
  // Needed for the app to discover it is in this state at all, right after signing in.
  'GET /v1/auth/me',
  'POST /v1/auth/logout',
]);

/**
 * Refuses every request from an account that has not yet moved off its manager-issued
 * temporary password (constitution: Security First — the prompt in the app is a convenience,
 * this is the actual gate).
 *
 * Without this the temp password would be a permanent credential: a user could sign in with
 * it, dismiss or never reach the app's prompt, and keep using the API indefinitely with a
 * secret their manager also knows and that was very likely emailed in plain text. The forced
 * change is the entire reason a temp password is acceptable, so it cannot live in the UI
 * alone — a direct API call would walk straight past it.
 *
 * Runs after authMiddleware, which is what establishes `caller.mustChangePassword`.
 */
export async function requirePasswordChange(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.caller?.mustChangePassword) return;

  const routeKey = `${request.method} ${request.routeOptions?.url ?? request.url}`;
  if (ALLOWED_WHILE_PENDING.has(routeKey)) return;

  await reply.code(403).send({
    error: {
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'Choose a new password before continuing.',
    },
  });
}
