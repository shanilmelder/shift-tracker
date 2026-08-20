/**
 * Loaded before any test file via vitest.config.ts's `setupFiles`. Supplies dummy Supabase
 * env values so importing a module that transitively pulls in `data/supabase-client.ts` (and
 * therefore `config/env.ts`'s fail-fast validation) doesn't crash purely-unit-testable
 * business logic that never actually needs a real connection — e.g. staffing.service.ts's
 * pure conflict-detection functions, imported alongside its I/O-dependent ones from the same
 * module. Real DB/network calls are still mocked per-test where needed (see
 * tests/integration/*.test.ts), never actually hitting these dummy values.
 */
process.env.SUPABASE_URL ??= 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';
