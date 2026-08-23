import type { FastifyInstance } from 'fastify';
import { createSession, getMe, setPassword } from '../services/auth.service.js';
import { CreateSessionSchema, SetPasswordSchema } from '../schemas/auth.schemas.js';
import '../types.js';

/**
 * `POST /v1/auth/session` is the only route in this entire API that does not require a bearer
 * token (see app.ts's PUBLIC_ROUTES allow-list).
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

  // No password-reset route: a user who cannot sign in asks a manager, who issues a fresh
  // temporary password via POST /v1/admin/users/:id/reset-password. Self-service reset needed
  // an emailed deep link, which this app deliberately no longer depends on.

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
