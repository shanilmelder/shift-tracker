/**
 * Backfills `app_metadata` on existing auth users from their `profiles` row.
 *
 * Accounts created before the 0022 migration were provisioned by inserting the profile
 * separately, so their auth user carries no app_metadata. Nothing reads that metadata after
 * creation — the on_auth_user_created trigger only fires on insert, and every authorization
 * decision reads `profiles` live — so this is purely to make old accounts look like ones
 * created now. Idempotent: safe to run repeatedly.
 *
 * Run with:  npx tsx --env-file=.env scripts/backfill-auth-app-metadata.ts
 */
import { createClient } from '@supabase/supabase-js';

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, role, phone, location_id, job_role, pay_rate, created_by');
  if (error) throw error;

  for (const profile of profiles ?? []) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(profile.id, {
      app_metadata: {
        name: profile.name,
        role: profile.role,
        location_id: profile.location_id,
        ...(profile.phone ? { phone: profile.phone } : {}),
        ...(profile.job_role ? { job_role: profile.job_role } : {}),
        ...(profile.pay_rate !== null ? { pay_rate: String(profile.pay_rate) } : {}),
        ...(profile.created_by ? { created_by: profile.created_by } : {}),
      },
    });
    if (updateError) throw updateError;
    console.log(`Backfilled ${profile.name} (${profile.role})`);
  }

  console.log(`Done — ${(profiles ?? []).length} account(s) updated.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
