import type { FastifyInstance } from 'fastify';
import { createSession, getMe, setPassword, requestTempPassword } from '../services/auth.service.js';
import { CreateSessionSchema, SetPasswordSchema, ForgotPasswordSchema } from '../schemas/auth.schemas.js';
import '../types.js';

/**
 * `POST /v1/auth/session` and `POST /v1/auth/forgot-password` are the only routes in this entire
 * API that do not require a bearer token (see app.ts's PUBLIC_ROUTES allow-list).
 * There is no `POST /v1/auth/signup` route defined here, or anywhere else — this is the
 * enforcement mechanism for the closed account model, not just a policy statement (FR-002).
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/auth/session', async (request, reply) => {
    const parsed = CreateSessionSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const session = await createSession(parsed.data.email, parsed.data.password);
    await reply.send(session);
  });

  /**
   * Emails a fresh temporary password to a registered address.
   *
   * Always 204, whether or not the address exists, and never returns the password itself. Both
   * matter because this route is unauthenticated: a distinct response for a known address turns
   * it into an account-enumeration oracle, and returning the password would let anyone reset an
   * account they do not own and read the new credential out of the response. See
   * auth.service.ts's requestTempPassword for the rest of the reasoning.
   */
  app.post('/v1/auth/forgot-password', async (request, reply) => {
    const parsed = ForgotPasswordSchema.safeParse(request.body);
    // Even a malformed address gets the same 204: telling the caller their input was rejected
    // is harmless, but keeping one response shape here removes any doubt about it.
    if (parsed.success) {
      await requestTempPassword(parsed.data.email);
    }
    await reply.code(204).send();
  });

  // Authenticated, and one of the few routes reachable while the caller is still on a
  // temporary password (see require-password-change.middleware.ts's allow-list) — it is the
  // only way out of that state.
  app.patch('/v1/auth/password', async (request, reply) => {
    const parsed = SetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    await setPassword(request.caller!.id, parsed.data.password);
    await reply.code(204).send();
  });

  app.post('/v1/auth/logout', async (_request, reply) => {
    // Supabase session invalidation is client-driven (the client discards its token); nothing
    // server-side to revoke for the MVP auth flow beyond that.
    await reply.code(204).send();
  });

  app.get('/v1/auth/me', async (request, reply) => {
    const caller = request.caller!;
    const profile = await getMe(caller.id);
    await reply.send(profile);
  });
}
