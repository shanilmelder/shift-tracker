import { describe, it, expect, vi } from 'vitest';
import { requirePasswordChange } from '../../src/middleware/require-password-change.middleware.js';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * The gate that makes a temporary password temporary.
 *
 * The app prompts for a new password after signing in with one, but a prompt is only a screen:
 * anyone calling the API directly could ignore it and keep using a credential their manager
 * also knows and that was emailed in plain text. This middleware is the real enforcement, so
 * these tests care most about what it does NOT let through.
 */
function makeReply(): FastifyReply & { code: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> } {
  const reply = {
    code: vi.fn(() => reply),
    send: vi.fn(async () => undefined),
  };
  return reply as unknown as FastifyReply & { code: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> };
}

function makeRequest(mustChangePassword: boolean, method: string, url: string): FastifyRequest {
  return {
    method,
    routeOptions: { url },
    caller: {
      id: 'user-1',
      name: 'Jordan',
      role: 'employee',
      locationId: 'loc-1',
      isActive: true,
      mustChangePassword,
    },
  } as unknown as FastifyRequest;
}

describe('requirePasswordChange', () => {
  it('lets a settled account through untouched', async () => {
    const reply = makeReply();
    await requirePasswordChange(makeRequest(false, 'GET', '/v1/shifts'), reply);
    expect(reply.code).not.toHaveBeenCalled();
  });

  it('blocks ordinary routes while the account is still on a temp password', async () => {
    const reply = makeReply();
    await requirePasswordChange(makeRequest(true, 'GET', '/v1/shifts'), reply);
    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({
      error: { code: 'PASSWORD_CHANGE_REQUIRED', message: 'Choose a new password before continuing.' },
    });
  });

  it('allows the route that ends the state', async () => {
    const reply = makeReply();
    await requirePasswordChange(makeRequest(true, 'PATCH', '/v1/auth/password'), reply);
    expect(reply.code).not.toHaveBeenCalled();
  });

  it('allows /auth/me, since the app learns it is in this state from there', async () => {
    const reply = makeReply();
    await requirePasswordChange(makeRequest(true, 'GET', '/v1/auth/me'), reply);
    expect(reply.code).not.toHaveBeenCalled();
  });

  it('blocks writes, not just reads', async () => {
    const reply = makeReply();
    await requirePasswordChange(makeRequest(true, 'POST', '/v1/time-entries/clock-in'), reply);
    expect(reply.code).toHaveBeenCalledWith(403);
  });

  it('blocks a pending manager from creating more accounts', async () => {
    // The case that matters most: the seeded first manager starts pending, and must not be
    // able to onboard anyone else before securing their own account.
    const reply = makeReply();
    const request = makeRequest(true, 'POST', '/v1/admin/users');
    (request.caller as { role: string }).role = 'manager';
    await requirePasswordChange(request, reply);
    expect(reply.code).toHaveBeenCalledWith(403);
  });

  it('matches on the route pattern, not the concrete URL', async () => {
    // Fastify's routeOptions.url is the template — an allow-list keyed on raw URLs would let a
    // pending caller past by varying the path.
    const reply = makeReply();
    await requirePasswordChange(makeRequest(true, 'GET', '/v1/auth/password'), reply);
    expect(reply.code).toHaveBeenCalledWith(403);
  });
});
