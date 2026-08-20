import type { FastifyInstance } from 'fastify';
import { createSession, requestPasswordReset, getMe } from '../services/auth.service.js';
import { CreateSessionSchema, PasswordResetSchema } from '../schemas/auth.schemas.js';
import '../types.js';

/**
 * `POST /v1/auth/session` and `POST /v1/auth/password-reset` are the only two routes in this
 * entire API that do not require a bearer token (see app.ts's PUBLIC_ROUTES allow-list).
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

  app.post('/v1/auth/password-reset', async (request, reply) => {
    const parsed = PasswordResetSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    await requestPasswordReset(parsed.data.email);
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
