/**
 * Deep link the Expo app can receive and route to a screen — used as the `redirectTo` for
 * Supabase Auth's invite/recovery emails. Must match `app/app.config.ts`'s `scheme` and the
 * route file at `app/app/(auth)/reset-password.tsx`.
 */
export const RESET_PASSWORD_DEEP_LINK = 'shifttracker://reset-password';
