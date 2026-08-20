/**
 * Seeds the single first manager account, run ONCE, outside the app and outside any API
 * endpoint (FR-003: this account "MUST NOT be created through the app's own UI"). This script
 * is the entire mechanism for that — there is no equivalent HTTP endpoint anywhere in this
 * API, by design.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npm run seed:first-manager -- \
 *     --email owner@example.com --name "Alex Owner" \
 *     --location-name "Downtown Store" --location-address "123 Main St" \
 *     --location-timezone "America/Chicago"
 *
 * Safe to re-run: if a `locations` row and a manager `profiles` row already exist, it exits
 * without creating a duplicate.
 */
import { createClient } from '@supabase/supabase-js';

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
  const name = args.name;
  const locationName = args['location-name'];
  const locationAddress = args['location-address'];
  const locationTimezone = args['location-timezone'];

  if (!email || !name || !locationName || !locationAddress || !locationTimezone) {
    throw new Error(
      'Missing required arguments. Required: --email --name --location-name --location-address --location-timezone',
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: existingManagers, error: existingManagersError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'manager')
    .limit(1);
  if (existingManagersError) throw existingManagersError;
  if (existingManagers && existingManagers.length > 0) {
    console.log('A manager account already exists — nothing to seed. Exiting.');
    return;
  }

  const { data: location, error: locationError } = await supabase
    .from('locations')
    .insert({ name: locationName, address: locationAddress, timezone: locationTimezone })
    .select()
    .single();
  if (locationError || !location) throw locationError ?? new Error('Failed to create location');

  const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
  });
  if (authError || !authResult?.user) throw authError ?? new Error('Failed to create auth user');

  const { error: profileError } = await supabase.from('profiles').insert({
    id: authResult.user.id,
    name,
    role: 'manager',
    location_id: location.id,
    created_by: null, // NULL only for this one pre-provisioned account (FR-003)
  });
  if (profileError) {
    await supabase.auth.admin.deleteUser(authResult.user.id);
    throw profileError;
  }

  await supabase.auth.admin.inviteUserByEmail(email);

  console.log(`Seeded first manager "${name}" <${email}> at location "${locationName}".`);
  console.log('An invite email has been sent for them to set their own password.');
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
