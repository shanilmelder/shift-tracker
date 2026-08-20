import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/**
 * The ONE place in this codebase that constructs a Supabase client with the service-role key.
 * Every data-access module (`src/data/*.repo.ts`) imports this, never the raw
 * `@supabase/supabase-js` package directly — that keeps "who can talk to Supabase" auditable
 * to a single import graph, matching the plan's requirement that the Expo app never touches
 * Supabase and that the API is the sole trusted caller.
 *
 * This client intentionally bypasses RLS (service-role key) because the API has already made
 * the authorization decision before ever issuing a query — RLS (see the 0013 migration) is a
 * backstop for everything else, not the primary gate for these calls.
 */
export const supabase: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * A per-request client scoped to the caller's own access token, used only where we
 * deliberately want RLS to apply (rare — most reads/writes go through the service-role
 * client above, with authorization decided in the services layer).
 */
export function supabaseAsUser(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
