import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Self-service recovery. This is the only unauthenticated route that mutates anything, so the
 * tests here are mostly about what it must NOT do: reveal whether an address is registered,
 * hand back the password it generated, or destroy a working password when the email fails.
 */

const listUsers = vi.fn();
const updateUserById = vi.fn();
const profilesMaybeSingle = vi.fn();
const profilesUpdate = vi.fn();
const sendTempPasswordEmail = vi.fn();

vi.mock('../../src/data/supabase-client.js', () => ({
  supabase: {
    auth: { admin: { listUsers: (...a: unknown[]) => listUsers(...a), updateUserById: (...a: unknown[]) => updateUserById(...a) } },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => profilesMaybeSingle() }) }),
      update: (patch: unknown) => ({
        eq: () => ({ select: () => ({ single: () => profilesUpdate(patch) }) }),
      }),
    }),
  },
}));

vi.mock('../../src/services/email.service.js', () => ({
  sendTempPasswordEmail: (...a: unknown[]) => sendTempPasswordEmail(...a),
}));

const PROFILE = { id: 'user-1', name: 'Dan Wu', is_active: true, invite_status: 'accepted' };

/** Each test uses a distinct address — the service throttles per email, and reusing one would
 * make later assertions pass for the wrong reason. */
let counter = 0;
const freshEmail = (): string => `user${(counter += 1)}@example.com`;

async function load() {
  return import('../../src/services/auth.service.js');
}

describe('requestTempPassword', () => {
  beforeEach(() => {
    listUsers.mockReset();
    updateUserById.mockReset();
    profilesMaybeSingle.mockReset();
    profilesUpdate.mockReset();
    sendTempPasswordEmail.mockReset();

    updateUserById.mockResolvedValue({ error: null });
    profilesUpdate.mockResolvedValue({ data: PROFILE, error: null });
    sendTempPasswordEmail.mockResolvedValue({ sent: true });
    profilesMaybeSingle.mockResolvedValue({ data: PROFILE, error: null });
  });

  it('emails a temporary password and marks the account pending', async () => {
    const email = freshEmail();
    listUsers.mockResolvedValue({ data: { users: [{ id: 'user-1', email }] }, error: null });

    const { requestTempPassword } = await load();
    await requestTempPassword(email);

    expect(sendTempPasswordEmail).toHaveBeenCalledTimes(1);
    const sent = sendTempPasswordEmail.mock.calls[0]?.[0] as { tempPassword: string; isReset: boolean };
    expect(sent.isReset).toBe(true);

    // The password that was mailed is the one that gets set — not a second, different draw.
    expect(updateUserById).toHaveBeenCalledWith('user-1', { password: sent.tempPassword });
    // 'pending' is what forces the change on next sign-in.
    expect(profilesUpdate).toHaveBeenCalledWith({ invite_status: 'pending' });
  });

  it('resolves silently for an unregistered address, changing nothing', async () => {
    listUsers.mockResolvedValue({ data: { users: [] }, error: null });

    const { requestTempPassword } = await load();
    // Must not throw: a thrown error would surface as a different status and reveal that the
    // address is unknown.
    await expect(requestTempPassword(freshEmail())).resolves.toBeUndefined();

    expect(sendTempPasswordEmail).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('never returns the generated password to the caller', async () => {
    const email = freshEmail();
    listUsers.mockResolvedValue({ data: { users: [{ id: 'user-1', email }] }, error: null });

    const { requestTempPassword } = await load();
    // Public and unauthenticated: returning it would let anyone reset an account they do not
    // own and read the new credential straight out of the response.
    expect(await requestTempPassword(email)).toBeUndefined();
  });

  it('leaves the existing password intact when the email cannot be sent', async () => {
    const email = freshEmail();
    listUsers.mockResolvedValue({ data: { users: [{ id: 'user-1', email }] }, error: null });
    sendTempPasswordEmail.mockResolvedValue({ sent: false, error: 'Domain is not verified.' });

    const { requestTempPassword } = await load();
    await requestTempPassword(email);

    // The whole reason the send happens before the update: otherwise a bounce would lock the
    // user out of an account they could previously use, with no way to learn the new password.
    expect(updateUserById).not.toHaveBeenCalled();
    expect(profilesUpdate).not.toHaveBeenCalled();
  });

  it('refuses to let a deactivated account recover its way back in', async () => {
    const email = freshEmail();
    listUsers.mockResolvedValue({ data: { users: [{ id: 'user-1', email }] }, error: null });
    profilesMaybeSingle.mockResolvedValue({ data: { ...PROFILE, is_active: false }, error: null });

    const { requestTempPassword } = await load();
    await requestTempPassword(email);

    expect(sendTempPasswordEmail).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('matches the address case-insensitively', async () => {
    const email = freshEmail();
    listUsers.mockResolvedValue({ data: { users: [{ id: 'user-1', email }] }, error: null });

    const { requestTempPassword } = await load();
    await requestTempPassword(email.toUpperCase());

    expect(sendTempPasswordEmail).toHaveBeenCalledTimes(1);
  });

  it('throttles a repeat request for the same address', async () => {
    const email = freshEmail();
    listUsers.mockResolvedValue({ data: { users: [{ id: 'user-1', email }] }, error: null });

    const { requestTempPassword } = await load();
    await requestTempPassword(email);
    await requestTempPassword(email);

    // Otherwise anyone knowing a colleague's address could lock them out on repeat by
    // invalidating their password over and over.
    expect(sendTempPasswordEmail).toHaveBeenCalledTimes(1);
  });

  it('finds an account beyond the first page of results', async () => {
    const email = freshEmail();
    // A bare listUsers() returns only page 1. Without pagination this address would come back
    // as "not registered" and recovery would silently stop working as the team grew.
    const firstPage = Array.from({ length: 1000 }, (_unused, index) => ({
      id: `other-${index}`,
      email: `other${index}@example.com`,
    }));
    listUsers.mockImplementation(({ page }: { page: number }) =>
      Promise.resolve({ data: { users: page === 1 ? firstPage : [{ id: 'user-1', email }] }, error: null }),
    );

    const { requestTempPassword } = await load();
    await requestTempPassword(email);

    expect(sendTempPasswordEmail).toHaveBeenCalledTimes(1);
  });
});
