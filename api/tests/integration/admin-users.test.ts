import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration test for T031 / User Story 1: a manager creates an employee account, which is
 * provisioned with a generated temporary password and starts at invite_status='pending' so the
 * app and API both force a change before the account can be used (FR-007).
 *
 * This test exercises `users.service.ts` directly against a mocked Supabase client rather
 * than a live test project, so it runs in CI without external dependencies; the
 * quickstart.md Scenario 1 covers the same flow against a real Supabase project.
 *
 * Since the 0022 migration the service no longer inserts the profile itself — the
 * on_auth_user_created trigger does, from the app_metadata passed to admin.createUser, in the
 * same transaction as the auth user. These tests assert that contract from the caller's side:
 * the metadata carries what the trigger needs, and it goes in app_metadata rather than
 * user_metadata.
 */

const authAdminCreateUser = vi.fn();
const authAdminDeleteUser = vi.fn();
const sendTempPasswordEmail = vi.fn();
/** Present only so a regression back to the emailed-link flow fails loudly. Both were the
 * wrong call for an account that already exists, and both failed silently when used. */
const authAdminInviteUserByEmail = vi.fn();
const authResetPasswordForEmail = vi.fn();
const profilesMaybeSingle = vi.fn();
/** Records any write attempted against `profiles` — there should never be one. */
const profilesWrite = vi.fn();
const locationsMaybeSingle = vi.fn();

vi.mock('../../src/data/supabase-client.js', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: (...args: unknown[]) => authResetPasswordForEmail(...args),
      admin: {
        createUser: (...args: unknown[]) => authAdminCreateUser(...args),
        deleteUser: (...args: unknown[]) => authAdminDeleteUser(...args),
        inviteUserByEmail: (...args: unknown[]) => authAdminInviteUserByEmail(...args),
      },
    },
    from: (table: string) => {
      if (table === 'locations') {
        return { select: () => ({ eq: () => ({ maybeSingle: () => locationsMaybeSingle() }) }) };
      }
      if (table !== 'profiles') throw new Error(`Unexpected table ${table}`);
      return {
        insert: (...args: unknown[]) => profilesWrite('insert', ...args),
        upsert: (...args: unknown[]) => profilesWrite('upsert', ...args),
        select: () => ({
          eq: () => ({ maybeSingle: () => profilesMaybeSingle() }),
        }),
      };
    },
  },
}));

vi.mock('../../src/services/email.service.js', () => ({
  sendTempPasswordEmail: (...args: unknown[]) => sendTempPasswordEmail(...args),
}));

const PROFILE = {
  id: 'auth-user-1',
  name: 'Jordan Employee',
  role: 'employee',
  location_id: 'loc-1',
  invite_status: 'pending',
};

describe('users.service.createUser', () => {
  beforeEach(() => {
    authAdminCreateUser.mockReset();
    authAdminDeleteUser.mockReset();
    authAdminInviteUserByEmail.mockReset();
    authResetPasswordForEmail.mockReset();
    sendTempPasswordEmail.mockReset();
    sendTempPasswordEmail.mockResolvedValue({ sent: true });
    profilesMaybeSingle.mockReset();
    profilesWrite.mockReset();
    locationsMaybeSingle.mockReset();
  });

  it('creates the auth user and profile together, with a temporary password', async () => {
    authAdminCreateUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null });

    profilesMaybeSingle.mockResolvedValue({ data: PROFILE, error: null });

    const { createUser } = await import('../../src/services/users.service.js');
    const result = await createUser({
      name: 'Jordan Employee',
      role: 'employee',
      locationId: 'loc-1',
      email: 'jordan@example.com',
      createdBy: 'manager-1',
    });

    expect(authAdminCreateUser).toHaveBeenCalledTimes(1);
    const createUserArgs = authAdminCreateUser.mock.calls[0]?.[0] as Record<string, unknown>;
    // The account is provisioned WITH a password now, and confirmed outright — without
    // email_confirm GoTrue refuses the password sign-in the whole flow depends on.
    expect(createUserArgs.password).toEqual(expect.any(String));
    expect(createUserArgs.email_confirm).toBe(true);

    // Returned to the manager exactly once, so onboarding survives a failed email.
    expect(result.tempPassword).toEqual(expect.any(String));
    expect(result.tempPassword.length).toBeGreaterThanOrEqual(12);
    expect(result.tempPassword).toBe(createUserArgs.password);
    // 'pending' is what both the app prompt and the API gate key off.
    expect(result.inviteStatus).toBe('pending');

    // The profile is the trigger's job now; the service must not write to that table at all.
    expect(profilesWrite).not.toHaveBeenCalled();

    // The temp password is mailed to the new user as well as returned.
    expect(sendTempPasswordEmail).toHaveBeenCalledTimes(1);
    expect(sendTempPasswordEmail).toHaveBeenCalledWith({
      to: 'jordan@example.com',
      name: 'Jordan Employee',
      tempPassword: result.tempPassword,
      isReset: false,
    });
    expect(result.emailSent).toBe(true);

    // Neither emailed-link call belongs in this flow any more.
    expect(authAdminInviteUserByEmail).not.toHaveBeenCalled();
    expect(authResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('passes the profile fields the trigger needs via app_metadata, never user_metadata', async () => {
    authAdminCreateUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null });

    profilesMaybeSingle.mockResolvedValue({ data: PROFILE, error: null });

    const { createUser } = await import('../../src/services/users.service.js');
    await createUser({
      name: 'Jordan Employee',
      role: 'employee',
      locationId: 'loc-1',
      email: 'jordan@example.com',
      createdBy: 'manager-1',
    });

    const args = authAdminCreateUser.mock.calls[0]?.[0] as Record<string, Record<string, unknown>>;
    expect(args.app_metadata).toMatchObject({ name: 'Jordan Employee', role: 'employee', location_id: 'loc-1' });
    // user_metadata is writable by the user themselves through GoTrue, so role and location
    // must never be sourced from it — a privilege-escalation path if they were.
    expect(args).not.toHaveProperty('user_metadata');
  });

  /**
   * A deliberate reversal of the previous behaviour, which deleted the account when the mail
   * failed. Email is the least reliable part of this flow — an unverified sending domain took
   * onboarding down completely — and the manager now holds the temp password regardless, so a
   * failed send is a degraded result, not a failed one.
   */
  it('keeps the account and still returns the password when the email cannot be sent', async () => {
    authAdminCreateUser.mockResolvedValue({ data: { user: { id: 'auth-user-2' } }, error: null });
    profilesMaybeSingle.mockResolvedValue({ data: { ...PROFILE, id: 'auth-user-2' }, error: null });
    sendTempPasswordEmail.mockResolvedValue({ sent: false, error: 'The domain is not verified.' });
    authAdminDeleteUser.mockResolvedValue({ error: null });

    const { createUser } = await import('../../src/services/users.service.js');
    const result = await createUser({
      name: 'Broken Email',
      role: 'employee',
      locationId: 'loc-1',
      email: 'broken@example.com',
      createdBy: 'manager-1',
    });

    expect(result.tempPassword).toEqual(expect.any(String));
    expect(result.emailSent).toBe(false);
    // Surfaced verbatim so the manager is told what to fix rather than just "it didn't send".
    expect(result.emailError).toBe('The domain is not verified.');
    expect(authAdminDeleteUser).not.toHaveBeenCalled();
  });

  it('still deletes the auth user when the trigger produced no profile', async () => {
    // An auth user with no profile can neither sign in usefully nor be managed, so this one
    // really is unrecoverable and must not be left behind.
    authAdminCreateUser.mockResolvedValue({ data: { user: { id: 'auth-user-3' } }, error: null });
    profilesMaybeSingle.mockResolvedValue({ data: null, error: null });
    authAdminDeleteUser.mockResolvedValue({ error: null });

    const { createUser } = await import('../../src/services/users.service.js');
    await expect(
      createUser({
        name: 'No Profile',
        role: 'employee',
        locationId: 'loc-1',
        email: 'noprofile@example.com',
        createdBy: 'manager-1',
      }),
    ).rejects.toThrow();

    expect(authAdminDeleteUser).toHaveBeenCalledWith('auth-user-3');
  });

  // GoTrue reports anything the database refuses as a bare "Database error creating new user"
  // with no detail, which surfaced to managers as a 500 "Something went wrong". These cover
  // translating it into something actionable.
  describe('when the database refuses the account', () => {
    beforeEach(() => {
      authAdminCreateUser.mockResolvedValue({
        data: { user: null },
        error: Object.assign(new Error('Database error creating new user'), { status: 500 }),
      });
    });

    it('names the missing location, the one cause reachable through the API', async () => {
      locationsMaybeSingle.mockResolvedValue({ data: null, error: null });

      const { createUser, AccountProvisioningError } = await import('../../src/services/users.service.js');
      const promise = createUser({
        name: 'No Such Location',
        role: 'employee',
        locationId: 'loc-does-not-exist',
        email: 'x@example.com',
        createdBy: 'manager-1',
      });

      await expect(promise).rejects.toBeInstanceOf(AccountProvisioningError);
      await expect(promise).rejects.toThrow(/No location exists with id loc-does-not-exist/);
      // Nothing was created, so nothing to compensate for.
      expect(authAdminDeleteUser).not.toHaveBeenCalled();
    });

    it('falls back to pointing at the trigger when the location does exist', async () => {
      locationsMaybeSingle.mockResolvedValue({ data: { id: 'loc-1' }, error: null });

      const { createUser } = await import('../../src/services/users.service.js');
      await expect(
        createUser({ name: 'Other', role: 'employee', locationId: 'loc-1', email: 'y@example.com', createdBy: 'manager-1' }),
      ).rejects.toThrow(/on_auth_user_created trigger/);
    });

    it('carries a 4xx status so it is not rendered as a generic 500', async () => {
      locationsMaybeSingle.mockResolvedValue({ data: null, error: null });

      const { createUser } = await import('../../src/services/users.service.js');
      let caught: { statusCode?: number; code?: string } | undefined;
      try {
        await createUser({ name: 'Z', role: 'employee', locationId: 'loc-9', email: 'z@example.com', createdBy: 'manager-1' });
      } catch (err) {
        caught = err as { statusCode?: number; code?: string };
      }

      expect(caught?.statusCode).toBe(422);
      expect(caught?.code).toBe('ACCOUNT_PROVISIONING_FAILED');
    });
  });

  it('rethrows a non-database auth error unchanged', async () => {
    authAdminCreateUser.mockResolvedValue({
      data: { user: null },
      error: new Error('A user with this email address has already been registered'),
    });

    const { createUser } = await import('../../src/services/users.service.js');
    await expect(
      createUser({ name: 'Dupe', role: 'employee', locationId: 'loc-1', email: 'dupe@example.com', createdBy: 'manager-1' }),
    ).rejects.toThrow(/already been registered/);
  });
});
