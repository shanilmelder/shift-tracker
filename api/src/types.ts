import 'fastify';

/** The authenticated caller's own `profiles` row, attached by auth.middleware.ts. */
export interface CallerProfile {
  id: string;
  name: string;
  role: 'employee' | 'manager';
  locationId: string;
  isActive: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by auth.middleware.ts after verifying the bearer token. Never set on public routes. */
    caller?: CallerProfile;
    /** The raw Supabase access token from the Authorization header, for pass-through calls. */
    accessToken?: string;
  }
}
