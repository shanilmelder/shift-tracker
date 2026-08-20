import type { FastifyReply, FastifyRequest } from 'fastify';
import { supabase, createTokenVerifierClient } from '../data/supabase-client.js';
import '../types.js';

/**
 * Verifies the Supabase-issued bearer token on every request that needs a caller identity,
 * then attaches that caller's own `profiles` row to the request (constitution: Security
 * First — authorization decisions are made here, server-side, against the database; a
 * client-supplied role claim is never trusted).
 *
 * Register this as a Fastify `preHandler` on every route except the public auth endpoints
 * (`POST /v1/auth/session`, `POST /v1/auth/password-reset`).
 */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    await reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Missing bearer token' } });
    return;
  }

  const accessToken = header.slice('Bearer '.length);
  const { data: userResult, error: userError } = await createTokenVerifierClient().auth.getUser(accessToken);
  if (userError || !userResult?.user) {
    await reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired token' } });
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, role, location_id, is_active')
    .eq('id', userResult.user.id)
    .single();

  if (profileError || !profile) {
    await reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'No profile for this account' } });
    return;
  }

  if (!profile.is_active) {
    await reply.code(403).send({ error: { code: 'ACCOUNT_DEACTIVATED', message: 'This account has been deactivated' } });
    return;
  }

  request.accessToken = accessToken;
  request.caller = {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    locationId: profile.location_id,
    isActive: profile.is_active,
  };
}
