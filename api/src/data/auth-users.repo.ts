import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from './supabase-client.js';

/**
 * Lookups against `auth.users`, which is not reachable through PostgREST — the auth schema is
 * not exposed to the API, so `.from('users')` cannot see it and every read here has to go
 * through GoTrue's admin endpoints.
 */

/** GoTrue's own ceiling for a single page. */
const PAGE_SIZE = 1000;
/**
 * Bounds the scan so a paging bug upstream cannot spin forever. 50k accounts is far beyond
 * anything this app is built for, and reaching it means something is wrong, not that the
 * lookup should keep going.
 */
const MAX_PAGES = 50;

export interface AuthUserSummary {
  id: string;
  email: string;
}

/**
 * Finds an account by email address, case-insensitively.
 *
 * Paginates deliberately: `admin.listUsers()` with no arguments returns only the FIRST page
 * (50 by default), so a straight `.users.find(...)` silently reports "no such account" for
 * everyone past the first page — a bug that stays invisible until the staff list grows.
 *
 * Comparison is lower-cased on both sides because GoTrue stores the address as given, while
 * the person typing it into a sign-in form will not match its capitalisation.
 */
export async function findAuthUserByEmail(
  email: string,
  client: SupabaseClient = defaultClient,
): Promise<AuthUserSummary | null> {
  const wanted = email.trim().toLowerCase();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;

    const users = data?.users ?? [];
    const match = users.find((candidate) => candidate.email?.toLowerCase() === wanted);
    if (match?.email) return { id: match.id, email: match.email };

    // A short page is the last page.
    if (users.length < PAGE_SIZE) return null;
  }
  return null;
}
