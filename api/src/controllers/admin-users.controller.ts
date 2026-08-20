import type { FastifyReply, FastifyRequest } from 'fastify';
import { createUser, deactivateUser, updateUser } from '../services/users.service.js';
import { listProfilesByLocation } from '../data/profiles.repo.js';
import { CreateUserSchema, UpdateUserSchema } from '../schemas/admin-users.schemas.js';
import '../types.js';

export async function createUserHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const parsed = CreateUserSchema.safeParse(request.body);
  if (!parsed.success) {
    await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }
  const caller = request.caller!;
  const created = await createUser({ ...parsed.data, createdBy: caller.id });
  await reply.code(201).send(created);
}

export async function listUsersHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const caller = request.caller!;
  const users = await listProfilesByLocation(caller.locationId);
  await reply.send(users);
}

export async function updateUserHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const parsed = UpdateUserSchema.safeParse(request.body);
  if (!parsed.success) {
    await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }
  const { id } = request.params as { id: string };
  const updated = await updateUser(id, parsed.data);
  await reply.send(updated);
}

export async function deactivateUserHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { id } = request.params as { id: string };
  const caller = request.caller!;

  // Edge case from spec.md: deactivating the sole shift leader on a future shift must not
  // leave that shift with an inaccessible staffing screen. Enforced here rather than only in
  // staffing.service.ts, since deactivation is the trigger event.
  // TODO(US3 integration): once shift-assignments repo exists, reassign/clear leader
  // designations for this employee's future led shifts before deactivating, or reject with a
  // 409 asking the manager to reassign leadership first. Tracked to close out in Phase 5.
  if (id === caller.id) {
    await reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Cannot deactivate your own account' } });
    return;
  }

  const updated = await deactivateUser(id);
  await reply.send(updated);
}
