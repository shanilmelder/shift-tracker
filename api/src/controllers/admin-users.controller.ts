import type { FastifyReply, FastifyRequest } from 'fastify';
import { createUser, updateUser, setUserActive, deleteUser, AccountProvisioningError } from '../services/users.service.js';
import { listProfilesByLocation, findProfileById } from '../data/profiles.repo.js';
import { CreateUserSchema, UpdateUserSchema, SetActiveSchema } from '../schemas/admin-users.schemas.js';
import '../types.js';

export async function createUserHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const parsed = CreateUserSchema.safeParse(request.body);
  if (!parsed.success) {
    await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }
  const caller = request.caller!;
  try {
    const created = await createUser({ ...parsed.data, createdBy: caller.id });
    await reply.code(201).send(created);
  } catch (err) {
    // Handled here rather than left to the global handler so the response carries a specific
    // code the client can branch on, not the generic REQUEST_ERROR.
    if (err instanceof AccountProvisioningError) {
      await reply.code(422).send({ error: { code: err.code, message: err.message } });
      return;
    }
    throw err;
  }
}

export async function listUsersHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const caller = request.caller!;
  const users = await listProfilesByLocation(caller.locationId);
  await reply.send(users);
}

/** Shared mapping for the guard failures update / set-active / delete have in common. */
async function sendGuardFailure(
  reply: FastifyReply,
  result: { reason: string; references?: string[] },
): Promise<void> {
  switch (result.reason) {
    case 'not_found':
      await reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Staff member not found' } });
      return;
    case 'own_role':
      await reply.code(409).send({
        error: {
          code: 'CANNOT_CHANGE_OWN_ROLE',
          message: "You can't change your own role \u2014 ask another manager to do it.",
        },
      });
      return;
    case 'last_manager':
      await reply.code(409).send({
        error: {
          code: 'LAST_MANAGER',
          message: 'This is the only active manager at this location. Promote someone else first.',
        },
      });
      return;
    case 'self':
      await reply.code(409).send({
        error: { code: 'CANNOT_DELETE_SELF', message: "You can't delete your own account." },
      });
      return;
    case 'has_history':
      await reply.code(409).send({
        error: {
          code: 'STAFF_HAS_HISTORY',
          message:
            `This person has ${(result.references ?? []).join(', ')} on record, so they can't be deleted. ` +
            'Deactivate them instead: they keep their history but can no longer sign in.',
          details: { references: result.references ?? [] },
        },
      });
      return;
    default:
      await reply.code(409).send({ error: { code: 'CONFLICT', message: 'That change is not allowed.' } });
  }
}

export async function getUserHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { id } = request.params as { id: string };
  const caller = request.caller!;
  const profile = await findProfileById(id);
  // Scoped to the caller's own location, so a manager cannot read another location's staff.
  if (!profile || profile.location_id !== caller.locationId) {
    await reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Staff member not found' } });
    return;
  }
  await reply.send(profile);
}

export async function updateUserHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const parsed = UpdateUserSchema.safeParse(request.body);
  if (!parsed.success) {
    await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }
  const { id } = request.params as { id: string };
  const result = await updateUser(request.caller!.id, id, parsed.data);
  if (!result.ok) {
    await sendGuardFailure(reply, result);
    return;
  }
  await reply.send(result.profile);
}

export async function setUserActiveHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const parsed = SetActiveSchema.safeParse(request.body);
  if (!parsed.success) {
    await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }
  const { id } = request.params as { id: string };
  const caller = request.caller!;
  if (id === caller.id && !parsed.data.isActive) {
    await reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Cannot deactivate your own account' } });
    return;
  }
  const result = await setUserActive(caller.id, id, parsed.data.isActive);
  if (!result.ok) {
    await sendGuardFailure(reply, result);
    return;
  }
  await reply.send(result.profile);
}

export async function deleteUserHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { id } = request.params as { id: string };
  const result = await deleteUser(request.caller!.id, id);
  if (!result.ok) {
    await sendGuardFailure(reply, result);
    return;
  }
  await reply.code(204).send();
}

export async function deactivateUserHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Kept as its own route for the existing POST /:id/deactivate contract. The active toggle is
  // what the staff edit screen uses, since that one can also reactivate.
  request.body = { isActive: false };
  await setUserActiveHandler(request, reply);
}
