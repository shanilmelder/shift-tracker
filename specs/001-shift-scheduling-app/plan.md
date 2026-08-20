# Implementation Plan: Mobile Shift Scheduling App

**Branch**: `001-shift-scheduling-app` | **Date**: 2026-08-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-shift-scheduling-app/spec.md`

## Summary

A mobile app (Expo/React Native) for employees and managers at hourly, shift-based workplaces
(retail, hospitality, healthcare) to view schedules, clock in/out with location verification,
request swaps and time off, and claim open shifts — with managers separately creating and
staffing shifts, managing staff/areas/locations, and reviewing reports. The Expo app talks to
no backend directly except a custom Node.js/TypeScript API; that API is the single place all
business logic, authorization, and Supabase (Postgres/Auth/Storage/Realtime) access live. This
plan defines that API's structure and endpoints, the Postgres schema and RLS backstop, the
Expo app's structure and state layers, the realtime and notification delivery paths, and the
non-functional approach for offline resilience, testing, builds, and environment management.

## Technical Context

**Language/Version**: TypeScript throughout (Node.js 20 LTS for the API; React Native via
Expo SDK, current stable, for the app).

**Primary Dependencies**:
- API: Fastify, `@supabase/supabase-js` (service-role client), `node-cron`, `expo-server-sdk`,
  Zod (request/response validation), `pino` (structured logging).
- App: Expo Router, TanStack Query, Zustand, React Hook Form + Zod, `expo-notifications`,
  `expo-location`, `@tanstack/query-async-storage-persister` + `@react-native-async-storage/async-storage`.

**Storage**: Postgres on Supabase (schema in [data-model.md](data-model.md)); Supabase Storage
for avatar files, uploaded only via the API.

**Testing**: API — Vitest (unit: conflict detection, overtime calc, geofence check, approval
routing; integration: swap approval, clock-in, manager account creation, via Supertest against
a test Supabase schema). App — Jest (`jest-expo` preset) + React Native Testing Library.

**Target Platform**: iOS 15+ and Android 8+ (Expo-supported range) for the app; a Linux
container/server target for the API (host-agnostic — see Deployment Notes).

**Project Type**: Mobile app + separate backend API ("mobile + API" structure).

**Performance Goals**: Calendar/shift list screens render from cache in well under 1s
(supports SC-002's 10-second shift-lookup target with wide margin); API p95 latency under
300ms for read endpoints under expected single-location traffic (tens of concurrent staff, not
a high-throughput system).

**Constraints**: Offline-capable clock-in/out and schedule viewing (constitution: Offline
Resilience); no direct client-to-Supabase calls of any kind (explicit project constraint);
authorization enforced server-side/RLS, never client-only (constitution: Security First);
timestamps stored UTC/timezone-independent, converted to local only at display (constitution
non-negotiable).

**Scale/Scope**: Single-location-per-manager-account v1 (see research.md #2); designed so a
future multi-location-per-manager or multi-tenant layer can be added additively. Expect
dozens of staff and shifts per location, not thousands — no need for premature horizontal
scaling of the API.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design below.*

| Principle | Check | Status |
|---|---|---|
| I. Security First | All authorization (role, shift-leader scope, location scope) is enforced in the API's services/middleware layer against the database, backstopped by RLS on every table (data-model.md). The client never receives a capability it wasn't independently authorized for server-side. | **PASS** |
| II. Two-Role Clarity | Every functional requirement in spec.md is written per-role; every contract endpoint above states its role gate for both employee and manager paths. | **PASS** |
| III. Offline Resilience | Clock-in/out and schedule viewing use TanStack Query's persisted cache (reads) and persisted mutation queue (writes) — research.md #6. Actions never block on connectivity; they queue and sync (FR-040). | **PASS** |
| IV. Simplicity Over Cleverness | Realtime uses SSE, not WebSockets, because nothing here needs bidirectional push (research.md #1). Offline queueing reuses TanStack Query's built-in support rather than a custom sync engine (research.md #6). Fastify's built-in schema validation is used instead of a hand-assembled middleware stack (research.md #4). | **PASS** |
| V. Consistent Design System | Single `theme.ts` (colors/spacing/typography) + one `src/components/` library shared by both the employee and manager route groups — see Project Structure. | **PASS** |
| VI. Type Safety | TypeScript throughout both projects; Zod schemas on the API double as runtime validation and the source for generated/checked request-response types consumed by the app's `src/types/api/` (quickstart.md's Type Sync check). | **PASS** |
| VII. Testable Business Logic | Conflict detection, overtime calculation, geofence validation, and swap/time-off approval routing are implemented as pure functions in the API's `services/` layer, unit-tested independent of any route/UI (research.md #9). | **PASS** |
| VIII. Accessibility | Shared component library (Project Structure) is the single place tap-target sizing and screen-reader labeling are implemented once and reused everywhere, rather than per-screen. Enforced during implementation/review, not automatically satisfied by this plan alone — flagged as an implementation-phase checklist item. | **PASS (pending impl. verification)** |
| Non-negotiable: no committed secrets | Service-role key and Supabase URL live only in the API's environment (Deployment Notes); the Expo app holds no Supabase credential at all, only its own API's base URL. | **PASS** |
| Non-negotiable: timezone-independent storage | All timestamps `timestamptz`; `locations.timezone` used only for display conversion. | **PASS** |
| Non-negotiable: confirmation on destructive actions | Deactivating staff, removing an area label, cancelling a shift all require explicit client-side confirmation before the corresponding endpoint is called (contracts/rest-api.md notes). | **PASS** |
| Non-negotiable: closed account creation | No sign-up endpoint exists in the API (contracts/rest-api.md's Auth section states this explicitly); the only account-creation path is the manager-only `POST /v1/admin/users`; the first manager is seeded outside the app/API entirely. | **PASS** |

No violations requiring justification — **Complexity Tracking is empty by design.**

## Project Structure

### Documentation (this feature)

```text
specs/001-shift-scheduling-app/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   ├── rest-api.md       # Phase 1 output
│   └── realtime-events.md
└── tasks.md              # Phase 2 output (/speckit-tasks — not created by this command)
```

### Source Code (repository root)

```text
api/                              # Node.js/TypeScript backend
├── src/
│   ├── routes/                   # One file per feature area; thin — parse/validate, call controller
│   │   ├── auth.routes.ts
│   │   ├── admin-users.routes.ts
│   │   ├── profile.routes.ts
│   │   ├── locations.routes.ts
│   │   ├── shift-areas.routes.ts
│   │   ├── shifts.routes.ts
│   │   ├── shift-assignments.routes.ts
│   │   ├── open-shifts.routes.ts
│   │   ├── swap-requests.routes.ts
│   │   ├── time-off-requests.routes.ts
│   │   ├── time-entries.routes.ts
│   │   ├── availability.routes.ts
│   │   ├── announcements.routes.ts
│   │   ├── reports.routes.ts
│   │   ├── dashboard.routes.ts
│   │   ├── devices.routes.ts
│   │   └── realtime.routes.ts     # SSE endpoint
│   ├── controllers/               # One per feature area; orchestrates request → service → response
│   │   └── ...mirrors routes/
│   ├── services/                  # ALL business logic + authorization decisions live here; pure/unit-testable
│   │   ├── auth.service.ts
│   │   ├── users.service.ts
│   │   ├── shifts.service.ts
│   │   ├── staffing.service.ts        # conflict detection (double-booking, insufficient rest)
│   │   ├── swaps.service.ts           # eligibility + approval routing (manager-or-leader)
│   │   ├── time-off.service.ts
│   │   ├── time-entries.service.ts    # geofence check, idempotency, overtime calc
│   │   ├── open-shifts.service.ts
│   │   ├── announcements.service.ts
│   │   ├── reports.service.ts
│   │   ├── notifications.service.ts   # Expo push send, called by other services + jobs
│   │   └── realtime.service.ts        # Supabase Realtime → SSE relay/fan-out
│   ├── data/                      # Data-access layer — the ONLY module that imports the Supabase client
│   │   ├── supabase-client.ts     # service-role client construction, from env
│   │   ├── profiles.repo.ts
│   │   ├── shifts.repo.ts
│   │   ├── shift-assignments.repo.ts
│   │   ├── swap-requests.repo.ts
│   │   ├── time-off-requests.repo.ts
│   │   ├── time-entries.repo.ts
│   │   └── ... one per table
│   ├── middleware/
│   │   ├── auth.middleware.ts     # verifies bearer token against Supabase Auth, attaches caller profile
│   │   ├── require-role.middleware.ts     # manager-only gate
│   │   └── require-shift-leader.middleware.ts   # per-shift leader scope gate
│   ├── jobs/
│   │   ├── shift-reminders.job.ts # node-cron: upcoming-shift push reminders
│   │   └── scheduler.ts           # registers all cron jobs at boot
│   ├── schemas/                   # Zod request/response schemas (Fastify schema + type source)
│   ├── config/                    # env loading/validation (fails fast on missing var)
│   └── app.ts                     # Fastify instance assembly
├── tests/
│   ├── unit/                      # services/ logic, no network/db
│   ├── integration/               # Supertest + test Supabase schema
│   └── setup/
├── package.json
└── .env.example

app/                               # Expo app (Expo Router convention: file-based routing)
├── app/
│   ├── (auth)/                   # Unauthenticated route group
│   │   ├── login.tsx             # Sign-in only — no signup route exists anywhere in this tree
│   │   └── forgot-password.tsx
│   ├── (employee)/               # Employee route group; router-level guard redirects non-employees out
│   │   ├── _layout.tsx           # Role guard + employee tab navigator
│   │   ├── schedule/
│   │   │   ├── index.tsx         # Calendar (day/week/month)
│   │   │   └── [shiftId].tsx     # Shift detail
│   │   ├── swaps/
│   │   ├── time-off/
│   │   ├── clock/
│   │   ├── timesheet/
│   │   ├── open-shifts/
│   │   ├── team/
│   │   └── profile/
│   ├── (manager)/                # Manager route group; router-level guard redirects non-managers out
│   │   ├── _layout.tsx
│   │   ├── dashboard/
│   │   ├── schedule/
│   │   │   ├── index.tsx
│   │   │   ├── new.tsx           # Step 1: create shift (name + time only)
│   │   │   └── [shiftId]/
│   │   │       └── staff.tsx     # Step 2: staffing, separate screen/route
│   │   ├── open-shifts/
│   │   ├── approvals/            # swap + time-off review
│   │   ├── staff/
│   │   ├── shift-areas/          # manager-only; no employee route reaches this
│   │   ├── reports/
│   │   └── announcements/
│   └── _layout.tsx                # Root: loads session, decides (auth)/(employee)/(manager) redirect
├── src/
│   ├── api/                       # The ONLY module that knows the API's base URL / makes fetch calls
│   │   ├── client.ts               # fetch wrapper: auth header injection, error shape parsing
│   │   ├── auth.api.ts
│   │   ├── shifts.api.ts
│   │   └── ... one per feature area, matching contracts/rest-api.md
│   ├── queries/                    # TanStack Query hooks wrapping src/api/*
│   ├── stores/                     # Zustand stores (sync-status, nav/role context)
│   ├── components/                 # Shared component library
│   │   └── theme.ts                # Single source of colors, spacing, typography
│   ├── offline/                    # Query/mutation persister setup, idempotency-key generation
│   └── types/
│       └── api/                    # Request/response types generated from/checked against api/src/schemas
├── app.json / app.config.ts        # Expo config, EAS project link
├── eas.json                        # EAS build profiles (dev/preview/production)
└── package.json
```

**Structure Decision**: Mobile app + separately deployed API, in two top-level directories
(`api/`, `app/`) within this repository, each with its own `package.json`/build pipeline. This
matches the user's explicit requirement that the Expo app and the Node.js API are hosted and
deployed independently, while keeping both in one repo for now (a monorepo tool like Turborepo/
npm workspaces is an implementation-time choice, not a planning-level structural change).

## Deployment Notes

- **API**: deployed separately from the Expo app, as a long-running Node process (container or
  PaaS — e.g., a small container behind a load balancer, or a managed Node host). Because
  `node-cron` (research.md #8) runs in-process, the API must run as a **single instance** in
  v1, or the reminder job must be moved to a locked/leader-elected runner before scaling to
  multiple instances — documented here so it isn't rediscovered as a bug later.
- **Environment variables**:

  | Variable | Where | Dev | Staging | Production |
  |---|---|---|---|---|
  | `SUPABASE_URL` | API only | dev project | staging project | prod project |
  | `SUPABASE_SERVICE_ROLE_KEY` | API only, never logged, never sent to client | dev project's key | staging key | prod key, restricted secret store |
  | `EXPO_PUSH_ACCESS_TOKEN` | API only | shared dev creds | staging | prod |
  | `API_BASE_URL` | Expo app (via `app.config.ts` per EAS build profile) | `http://localhost:PORT` or LAN IP | staging API URL | production API URL |

  The service-role key is a non-negotiable secret: it is read only from the API's runtime
  environment (never committed, per the constitution's non-negotiables) and is the one thing
  that must never appear in any Expo build, since Expo bundles are extractable by end users.

## Complexity Tracking

*(empty — Constitution Check passed with no violations)*
