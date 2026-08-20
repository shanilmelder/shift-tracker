import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Covers `setPassword` — the one auth-service path exercised by both a brand-new invite and a
 * password-reset link, since an invite/recovery access_token is a normal Supabase session JWT
 * that authMiddleware already accepts (see auth.service.ts's doc comment). Mocks the Supabase
 * client the same way admin-users.test.ts does, rather than a live project.
 */

const authAdminUpdateUserById = vi.fn();
const profilesUpdate = vi.fn();

vi.mock('../../src/data/supabase-client.js', () => ({
  supabase: {
    auth: {
      admin: {
        updateUserById: (...args: unknown[]) => authAdminUpdateUserById(...args),
      },
    },
    from: (table: string) => {
      if (table !== 'profiles') throw new Error(`Unexpected table ${table}`);
      return {
        update: (...args: unknown[]) => profilesUpdate(...args),
      };
    },
  },
}));

describe('auth.service.setPassword', () => {
  beforeEach(() => {
    authAdminUpdateUserById.mockReset();
    profilesUpdate.mockReset();
  });

  it('sets the password via the service-role client and flips invite_status to accepted', async () => {
    authAdminUpdateUserById.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    profilesUpdate.mockReturnValue({
      eq: () => ({
        select: () => ({
          single: async () => ({
            data: { id: 'user-1', invite_status: 'accepted' },
            error: null,
          }),
        }),
      }),
    });

    const { setPassword } = await import('../../src/services/auth.service.js');
    await setPassword('user-1', 'a-new-password');

    expect(authAdminUpdateUserById).toHaveBeenCalledWith('user-1', { password: 'a-new-password' });
    expect(profilesUpdate).toHaveBeenCalledWith({ invite_status: 'accepted' });
  });

  it('throws and does not touch the profile if the Supabase Auth update fails', async () => {
    authAdminUpdateUserById.mockResolvedValue({ data: null, error: new Error('update failed') });

    const { setPassword } = await import('../../src/services/auth.service.js');

    await expect(setPassword('user-1', 'a-new-password')).rejects.toThrow();
    expect(profilesUpdate).not.toHaveBeenCalled();
  });
});
