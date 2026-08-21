import type { FastifyInstance } from 'fastify';
import { requireManager } from '../middleware/require-role.middleware.js';
import {
  createUserHandler,
  listUsersHandler,
  getUserHandler,
  updateUserHandler,
  setUserActiveHandler,
  deactivateUserHandler,
  deleteUserHandler,
} from '../controllers/admin-users.controller.js';

/**
 * The only endpoints in this API that create an account. There is no corresponding
 * self-service sign-up route anywhere in this file or this codebase (FR-002/FR-005) — every
 * one of these requires `requireManager`, which itself requires a caller already
 * authenticated by the global auth hook in app.ts.
 */
export async function adminUsersRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/admin/users', { preHandler: requireManager }, createUserHandler);
  app.get('/v1/admin/users', { preHandler: requireManager }, listUsersHandler);
  app.get('/v1/admin/users/:id', { preHandler: requireManager }, getUserHandler);
  app.patch('/v1/admin/users/:id', { preHandler: requireManager }, updateUserHandler);
  app.post('/v1/admin/users/:id/deactivate', { preHandler: requireManager }, deactivateUserHandler);
  app.post('/v1/admin/users/:id/active', { preHandler: requireManager }, setUserActiveHandler);
  // Hard delete, refused for anyone with history -- deactivation is the path for those.
  app.delete('/v1/admin/users/:id', { preHandler: requireManager }, deleteUserHandler);
}
