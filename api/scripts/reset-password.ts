/**
 * Issues a fresh temporary password for an existing account, from the command line.
 *
 * Staff normally get this from a manager (POST /v1/admin/users/:id/reset-password). This script
 * exists for the one account that has no manager above it — the first manager seeded by
 * seed-first-manager.ts — and as a break-glass path if nobody can sign in at all.
 *
 * Replaces the old resend-invite script: there are no invite links any more (see
 * src/services/auth.service.ts), so there is nothing to resend.
 *
 * Usage:
 *   npm run reset-password -- --email owner@example.com
 */
import { createClient } from '@supabase/supabase-js';
import { generateTempPassword } from '../src/lib/temp-password.js';

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

  const email = parseArgs(process.argv.slice(2)).email;
  if (!email) throw new Error('Missing required argument: --email');

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // listUsers rather than a profiles lookup: the address lives on the auth user, and this
  // script must work even when the profile row is what is broken.
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  const user = list.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`No account found for ${email}`);

  const tempPassword = generateTempPassword();
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { password: tempPassword });
  if (updateError) throw updateError;

  // Back to 'pending' so the forced change on next sign-in applies, exactly as it does for a
  // manager-issued reset. Without it this would hand out a permanent password.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ invite_status: 'pending' })
    .eq('id', user.id);
  if (profileError) throw profileError;

  console.log(`Temporary password issued for ${email}:`);
  console.log('');
  console.log(`  ${tempPassword}`);
  console.log('');
  console.log('They will be required to choose a new password on their next sign-in.');
}

main().catch((error) => {
  console.error('Reset failed:', error);
  process.exit(1);
});
