import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { env } from './config/env.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { authRoutes } from './routes/auth.routes.js';
import { adminUsersRoutes } from './routes/admin-users.routes.js';
import { shiftsRoutes } from './routes/shifts.routes.js';
import { shiftAssignmentsRoutes } from './routes/shift-assignments.routes.js';
import { timeEntriesRoutes } from './routes/time-entries.routes.js';
import { timesheetsRoutes } from './routes/timesheets.routes.js';
import { swapRequestsRoutes } from './routes/swap-requests.routes.js';
import { timeOffRequestsRoutes } from './routes/time-off-requests.routes.js';
import { openShiftsRoutes } from './routes/open-shifts.routes.js';
import { shiftAreasRoutes } from './routes/shift-areas.routes.js';
import { locationsRoutes } from './routes/locations.routes.js';
import { announcementsRoutes } from './routes/announcements.routes.js';
import { reportsRoutes } from './routes/reports.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { profileRoutes } from './routes/profile.routes.js';
import { availabilityRoutes } from './routes/availability.routes.js';
import { devicesRoutes } from './routes/devices.routes.js';
import { realtimeRoutes } from './routes/realtime.routes.js';
import { registerTimeOffConflictCheck } from './services/staffing.service.js';
import { hasApprovedTimeOff } from './services/time-off.service.js';

/**
 * Routes that must NOT require a caller identity. Kept as an explicit allow-list rather than
 * an opt-out per route, so a newly added route is authenticated by default (constitution:
 * Security First — the safe default is "requires auth", not "open unless marked").
 *
 * There is deliberately no sign-up route in this list, or anywhere in this codebase — account
 * creation is manager-only (FR-002/FR-005), enforced by never wiring such a route at all.
 */
const PUBLIC_ROUTES = new Set<string>(['POST /v1/auth/session', 'POST /v1/auth/password-reset']);

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
    },
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN?.split(',') ?? true,
  });
  await app.register(multipart);

  app.addHook('onRequest', async (request, reply) => {
    const routeKey = `${request.method} ${request.routeOptions?.url ?? request.url}`;
    if (PUBLIC_ROUTES.has(routeKey)) {
      return;
    }
    await authMiddleware(request, reply);
  });

  app.get('/health', async () => ({ status: 'ok' }));

  // Feature-area routes are registered here as they are implemented (Phase 3 onward);
  // each route file is self-contained and only needs `app.register(...)`.
  await app.register(authRoutes);
  await app.register(adminUsersRoutes);
  await app.register(shiftsRoutes);
  await app.register(shiftAssignmentsRoutes);
  await app.register(timeEntriesRoutes);
  await app.register(timesheetsRoutes);
  await app.register(swapRequestsRoutes);
  await app.register(timeOffRequestsRoutes);
  await app.register(openShiftsRoutes);
  await app.register(shiftAreasRoutes);
  await app.register(locationsRoutes);
  await app.register(announcementsRoutes);
  await app.register(reportsRoutes);
  await app.register(dashboardRoutes);
  await app.register(profileRoutes);
  await app.register(availabilityRoutes);
  await app.register(devicesRoutes);
  await app.register(realtimeRoutes);

  // FR-036: an approved time-off request must block/warn against staffing that employee over
  // it. staffing.service.ts exposes a registration hook rather than importing
  // time-off.service.ts directly (Phase 5 predates Phase 8) — wired here, once, at boot.
  registerTimeOffConflictCheck(hasApprovedTimeOff);

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const status = 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
    reply.code(status).send({
      error: {
        code: status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
        message: status === 500 ? 'Something went wrong' : error.message,
      },
    });
  });

  return app;
}
