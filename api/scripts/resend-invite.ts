/**
 * Resends a Supabase Auth invite email to an existing profile, e.g. when the original invite
 * expired or was never received. Does not touch the profiles/locations rows — those already
 * exist; this only re-triggers the auth email.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npm run resend-invite -- --email owner@example.com
 */
import { createClient } from '@supabase/supabase-js';
import { RESET_PASSWORD_DEEP_LINK } from '../src/config/app-links.js';

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token?.startsWith('--')) {
      const key = token.slice(2);
      const value = argv[i + 1];
      if (value !== undefined) {
        args[key] = value;
        i += 1;
      }
    }
  }
  return args;
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment');
  }

  const args = parseArgs(process.argv.slice(2));
  const email = args.email;
  if (!email) {
    throw new Error('Missing required argument: --email');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: RESET_PASSWORD_DEEP_LINK,
  });
  if (!inviteError) {
    console.log(`Invite email resent to ${email}.`);
    return;
  }

  // inviteUserByEmail only works for brand-new users; this account already exists (created by
  // seed-first-manager or a manager's staff invite) but never set a password. A password-recovery
  // email serves the same purpose here: a link to set one.
  if (inviteError.code !== 'email_exists') throw inviteError;

  const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: RESET_PASSWORD_DEEP_LINK,
  });
  if (recoveryError) throw recoveryError;

  console.log(`${email} already has an account; sent a password-setup email instead of a new invite.`);
}

main().catch((error) => {
  console.error('Resend invite failed:', error);
  process.exit(1);
});
