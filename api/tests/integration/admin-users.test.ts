import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration test for T031 / User Story 1: a manager creates an employee account and the
 * result never contains a plaintext password (invite-based first access, FR-007), and the
 * created profile starts with invite_status='pending'.
 *
 * This test exercises `users.service.ts` directly against a mocked Supabase client rather
 * than a live test project, so it runs in CI without external dependencies; the
 * quickstart.md Scenario 1 covers the same flow against a real Supabase project.
 */

const authAdminCreateUser = vi.fn();
const authAdminDeleteUser = vi.fn();
const authAdminInviteUserByEmail = vi.fn();
const profilesInsert = vi.fn();

vi.mock('../../src/data/supabase-client.js', () => ({
  supabase: {
    auth: {
      admin: {
        createUser: (...args: unknown[]) => authAdminCreateUser(...args),
        deleteUser: (...args: unknown[]) => authAdminDeleteUser(...args),
        inviteUserByEmail: (...args: unknown[]) => authAdminInviteUserByEmail(...args),
      },
    },
    from: (table: string) => {
      if (table !== 'profiles') throw new Error(`Unexpected table ${table}`);
      return {
        insert: (...args: unknown[]) => profilesInsert(...args),
      };
    },
  },
}));

describe('users.service.createUser', () => {
  beforeEach(() => {
    authAdminCreateUser.mockReset();
    authAdminDeleteUser.mockReset();
    authAdminInviteUserByEmail.mockReset();
    profilesInsert.mockReset();
  });

  it('creates the auth user and profile together, with no plaintext password returned', async () => {
    authAdminCreateUser.mockResolvedValue({
      data: { user: { id: 'auth-user-1' } },
      error: null,
    });
    authAdminInviteUserByEmail.mockResolvedValue({ data: {}, error: null });
    profilesInsert.mockReturnValue({
      select: () => ({
        single: async () => ({
          data: {
            id: 'auth-user-1',
            name: 'Jordan Employee',
            role: 'employee',
            location_id: 'loc-1',
            invite_status: 'pending',
          },
          error: null,
        }),
      }),
    });

    const { createUser } = await import('../../src/services/users.service.js');
    const result = await createUser({
      name: 'Jordan Employee',
      role: 'employee',
      locationId: 'loc-1',
      email: 'jordan@example.com',
      createdBy: 'manager-1',
    });

    expect(authAdminCreateUser).toHaveBeenCalledTimes(1);
    // The Supabase invite call must not request/return a plaintext password.
    const createUserArgs = authAdminCreateUser.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(createUserArgs).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('password');
    expect(result.inviteStatus).toBe('pending');
  });

  it('deletes the just-created auth user if the profile insert fails (compensating action)', async () => {
    authAdminCreateUser.mockResolvedValue({
      data: { user: { id: 'auth-user-2' } },
      error: null,
    });
    profilesInsert.mockReturnValue({
      select: () => ({
        single: async () => ({ data: null, error: new Error('insert failed') }),
      }),
    });
    authAdminDeleteUser.mockResolvedValue({ error: null });

    const { createUser } = await import('../../src/services/users.service.js');

    await expect(
      createUser({
        name: 'Broken Profile',
        role: 'employee',
        locationId: 'loc-1',
        email: 'broken@example.com',
        createdBy: 'manager-1',
      }),
    ).rejects.toThrow();

    expect(authAdminDeleteUser).toHaveBeenCalledWith('auth-user-2');
  });
});
