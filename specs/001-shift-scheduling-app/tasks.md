---

description: "Task list for Mobile Shift Scheduling App"
---

# Tasks: Mobile Shift Scheduling App

**Input**: Design documents from `specs/001-shift-scheduling-app/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included — the user explicitly requested unit tests for conflict detection and
overtime calculation, and integration tests for swap approval, clock-in, and manager account
creation.

**Organization**: Tasks are grouped by user story (matching spec.md's P1–P8 priority order),
which also satisfies the requested ordering: database/auth foundations first (US1), then
employee-facing flows (US2, US4, US5, US6), then manager-facing flows (US3, US7, US8), then
notifications and polish last. Each phase header notes which of the user's requested groupings
(schema/RLS, auth/provisioning, employee screens, manager screens, notifications, shared UI,
testing) it covers.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps the task to a user story from spec.md (US1–US8)
- Every task names its exact file path(s)

## Path Conventions

Per [plan.md](plan.md)'s Project Structure: `api/src/...` and `api/tests/...` for the Node.js
backend, `app/app/...` (Expo Router file routes) and `app/src/...` (shared app code) for the
Expo client.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Repository and toolchain initialization for both projects.

- [X] T001 Create top-level repository structure: `api/` and `app/` directories per [plan.md](plan.md)'s Project Structure, plus a root `README.md` describing the two-project layout
- [X] T002 [P] Initialize the `api/` Node.js + TypeScript project: `api/package.json` (Fastify, `@supabase/supabase-js`, `zod`, `pino`, `node-cron`, `expo-server-sdk`, dev deps `vitest`, `supertest`, `typescript`), `api/tsconfig.json`
- [X] T003 [P] Initialize the `app/` Expo project: `app/package.json` (Expo Router, TanStack Query, Zustand, React Hook Form, `zod`, `expo-notifications`, `expo-location`, `@tanstack/query-async-storage-persister`, `@react-native-async-storage/async-storage`), `app/app.json`/`app/app.config.ts`, `app/eas.json` skeleton
- [X] T004 [P] Configure ESLint + Prettier for `api/` in `api/.eslintrc.cjs` and for `app/` in `app/.eslintrc.cjs`, both extending a shared root config
- [X] T005 [P] Create `api/src/config/env.ts` that loads and fails fast on missing `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`EXPO_PUSH_ACCESS_TOKEN`, plus `api/.env.example` and `app/.env.example` per [plan.md](plan.md)'s environment variable table

**Completion check**: `npm install` succeeds in both `api/` and `app/`; `api/` fails to boot with a clear error if `SUPABASE_URL` is unset; lint runs clean on both projects.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema + RLS, auth middleware, and the shared design system — everything every user story depends on. **No user story work may begin until this phase is complete.**

**⚠️ CRITICAL**: This phase covers the "database schema and row level security policies" and "shared UI and design system components" groupings in full, plus the auth *middleware* (account provisioning itself is US1, Phase 3).

### Database schema & RLS

- [X] T006 [P] Create migration for `locations` table per [data-model.md](data-model.md) in `api/supabase/migrations/0001_locations.sql`
- [X] T007 [P] Create migration for `profiles` table (FK → `auth.users`) in `api/supabase/migrations/0002_profiles.sql`
- [X] T008 [P] Create migration for `shift_areas` table (unique per location+name) in `api/supabase/migrations/0003_shift_areas.sql`
- [X] T009 [P] Create migration for `shifts` table (no employee column, `status` check constraint) in `api/supabase/migrations/0004_shifts.sql`
- [X] T010 [P] Create migration for `shift_assignments` table, including the partial unique index enforcing at most one `is_leader=true` row per shift, in `api/supabase/migrations/0005_shift_assignments.sql`
- [X] T011 [P] Create migration for `shift_swap_requests` table in `api/supabase/migrations/0006_shift_swap_requests.sql`
- [X] T012 [P] Create migration for `time_off_requests` table (reason `CHECK` non-blank) in `api/supabase/migrations/0007_time_off_requests.sql`
- [X] T013 [P] Create migration for `time_entries` table (unique `idempotency_key`) in `api/supabase/migrations/0008_time_entries.sql`
- [X] T014 [P] Create migration for `availability` table (mutually-exclusive recurring/blocked-date shape check) in `api/supabase/migrations/0009_availability.sql`
- [X] T015 [P] Create migration for `announcements` table in `api/supabase/migrations/0010_announcements.sql`
- [X] T016 [P] Create migration for `device_push_tokens` table in `api/supabase/migrations/0011_device_push_tokens.sql`
- [X] T017 [P] Create migration for `shift_reminders_sent` table in `api/supabase/migrations/0012_shift_reminders_sent.sql`
- [X] T018 Write and apply RLS policies for every table above per [data-model.md](data-model.md)'s RLS summary in `api/supabase/migrations/0013_rls_policies.sql` (depends on: T006–T017)

**Completion check**: Running all migrations against a fresh Supabase project succeeds; querying any table as the anon key with no matching policy returns zero rows (RLS default-deny confirmed).

### Auth & permission middleware

- [X] T019 [P] Implement the server-side Supabase service-role client in `api/src/data/supabase-client.ts`
- [X] T020 [P] Implement `api/src/middleware/auth.middleware.ts`: verifies the bearer token against Supabase Auth and attaches the caller's `profiles` row to the request
- [X] T021 [P] Implement `api/src/middleware/require-role.middleware.ts`: rejects non-manager callers with 403
- [X] T022 [P] Implement `api/src/middleware/require-shift-leader.middleware.ts`: rejects callers who are not the `is_leader=true` assignment on the shift referenced by the request, with 403
- [X] T023 Assemble the Fastify app instance wiring the above middleware in `api/src/app.ts` (depends on: T019, T020, T021, T022)

**Completion check**: A request with no/garbage token gets 401 on every route; a valid employee token gets 403 from a manager-only route stub.

### Shared UI & design system

- [X] T024 [P] Define the single theme source (colors, spacing, typography) in `app/src/components/theme.ts`
- [X] T025 [P] Build the core shared component library (Button, TextInput, Card, ListRow, Badge, ConfirmDialog, EmptyState) in `app/src/components/`, each consuming only `theme.ts` values
- [X] T026 [P] Build the API client wrapper (base URL, auth header injection, standard error-shape parsing) in `app/src/api/client.ts` — the only module in the app allowed to know the API's base URL
- [X] T027 [P] Set up the TanStack Query provider with persisted query cache and persisted offline mutation queue in `app/src/offline/query-client.ts`, wired into `app/app/_layout.tsx`
- [X] T028 [P] Set up the Zustand store for sync-status and role/nav context in `app/src/stores/app.store.ts`
- [X] T029 Implement root layout session bootstrap and role-based route redirect (`(auth)` / `(employee)` / `(manager)`) in `app/app/_layout.tsx` (depends on: T026, T027, T028)
- [X] T030 [P] Scaffold the `(auth)` route group — `app/app/(auth)/login.tsx` (sign-in only) and `app/app/(auth)/forgot-password.tsx` — with no sign-up screen anywhere in the tree

**Completion check**: App boots to a login screen with only sign-in + forgot-password visible; a Storybook-less manual render of each shared component shows it pulling colors/spacing from `theme.ts` alone.

**🏁 Checkpoint**: Foundation ready — every user story phase below can now begin.

---

## Phase 3: User Story 1 - Manager onboards staff without public sign-up (Priority: P1) 🎯 MVP

**Goal**: Closed account provisioning — seeded manager, manager-created employee/manager accounts, invite-based first access, login screen with no sign-up path.

**Covers the "auth and account provisioning" grouping.**

**Independent Test**: Seeded manager logs in, creates one employee account, that employee completes the invite and logs in; no sign-up endpoint or screen exists anywhere.

### Tests for User Story 1

- [X] T031 [P] [US1] Integration test: manager creates an employee account end-to-end (auth user + profile created together, invite sent, no plaintext password returned) in `api/tests/integration/admin-users.test.ts`

### Implementation for User Story 1

- [X] T032 [US1] Implement the profiles data-access repo in `api/src/data/profiles.repo.ts` (depends on: T007, T019)
- [X] T033 [US1] Implement `api/src/services/users.service.ts`: `createUser` (Supabase Auth admin `createUser` + `profiles` insert, with compensating delete of the auth user if the profile insert fails), `deactivateUser`, `updateUser` (depends on: T032)
- [X] T034 [US1] Implement admin-users controller + routes (`POST/GET/PATCH /v1/admin/users`, `POST /v1/admin/users/:id/deactivate`) in `api/src/controllers/admin-users.controller.ts` and `api/src/routes/admin-users.routes.ts` (depends on: T033, T021)
- [X] T035 [US1] Write the first-manager seed script (run once, outside the app/API) in `api/scripts/seed-first-manager.ts`, plus usage instructions in `api/scripts/README.md`
- [X] T036 [US1] Implement `api/src/services/auth.service.ts` and `api/src/routes/auth.routes.ts`: session exchange, password-reset trigger, logout, `GET /v1/auth/me` — with no sign-up handler defined anywhere (depends on: T020)
- [X] T037 [P] [US1] Build the Expo login + forgot-password screens wired to the auth API in `app/app/(auth)/login.tsx` and `app/app/(auth)/forgot-password.tsx` (depends on: T026, T030, T036)
- [X] T038 [US1] Build the manager "Create Staff" screen (name, role, job role, location, contact, initial access) with React Hook Form + Zod in `app/app/(manager)/staff/new.tsx` (depends on: T034, T025)

**🏁 Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP floor every later story needs accounts to exist.

---

## Phase 4: User Story 2 - Employee views schedule and shift details (Priority: P2)

**Goal**: Employee calendar (day/week/month) and shift detail view.

**Covers part of the "employee screens and flows" grouping (schedule, shift details).**

**Independent Test**: Staff an employee on shifts (via direct test data or Phase 5 once built), confirm they appear correctly in all three calendar views with full detail.

### Implementation for User Story 2

- [X] T039 [US2] Implement read queries (list + detail, scoped to caller's role/location/assignment) in `api/src/data/shifts.repo.ts` (depends on: T009, T019)
- [X] T040 [US2] Implement `GET /v1/shifts` and `GET /v1/shifts/:id` in `api/src/services/shifts.service.ts` and `api/src/routes/shifts.routes.ts` (depends on: T039)
- [X] T041 [P] [US2] Build the employee calendar screen (day/week/month toggle) in `app/app/(employee)/schedule/index.tsx` (depends on: T043)
- [X] T042 [P] [US2] Build the shift detail screen (time, location, area, role, notes) in `app/app/(employee)/schedule/[shiftId].tsx` (depends on: T043)
- [X] T043 [P] [US2] Implement TanStack Query hooks for shift list/detail in `app/src/queries/shifts.queries.ts` (depends on: T026, T040)

**🏁 Checkpoint**: An employee can browse and inspect their schedule end-to-end.

---

## Phase 5: User Story 3 - Manager builds and staffs the schedule (Priority: P3)

**Goal**: Two-step shift creation/staffing, with double-booking and insufficient-rest conflict detection, and shift-leader-scoped staffing access.

**Covers part of the "manager screens and flows" grouping (schedule builder) and the "unit tests for conflict detection" testing requirement.**

**Independent Test**: Create a shift with no staff, confirm it's unstaffed; staff it separately; attempt a conflicting staffing assignment and confirm it's rejected with a specific conflict reason.

### Tests for User Story 3

- [X] T044 [P] [US3] Unit tests for double-booking and insufficient-rest conflict detection (pure functions, no DB) in `api/tests/unit/staffing.service.test.ts`

### Implementation for User Story 3

- [X] T045 [US3] Implement conflict-detection pure functions (`detectDoubleBooking`, `detectInsufficientRest`) in `api/src/services/staffing.service.ts` (depends on: T044 written first and failing)
- [X] T046 [US3] Implement the shift-assignments data-access repo in `api/src/data/shift-assignments.repo.ts` (depends on: T010)
- [X] T047 [US3] Implement `POST /v1/shifts` (create step, name + start/end time only, `status='draft'`) in `shifts.service.ts` + `shifts.routes.ts` (depends on: T040)
- [X] T048 [US3] Implement `PATCH /v1/shifts/:id` (edit name/time/area/notes only, never staffing) in `shifts.service.ts` + `shifts.routes.ts` (depends on: T047)
- [X] T049 [US3] Implement `PUT /v1/shifts/:id/assignments` (staff step, manager-or-current-leader gate, runs T045's conflict checks and returns 409 with details before writing) in `api/src/services/staffing.service.ts` + `api/src/routes/shift-assignments.routes.ts` (depends on: T045, T046, T022)
- [X] T050 [US3] Implement `DELETE /v1/shifts/:id/assignments/:employeeId` in `shift-assignments.routes.ts` (depends on: T049)
- [X] T051 [P] [US3] Build the manager "New Shift" screen (step 1 only — no staffing fields) in `app/app/(manager)/schedule/new.tsx` (depends on: T047, T025)
- [X] T052 [P] [US3] Build the manager "Staff Shift" screen, a separate route from creation, showing conflict warnings inline (step 2) in `app/app/(manager)/schedule/[shiftId]/staff.tsx` (depends on: T049)
- [X] T053 [P] [US3] Build the manager schedule list/calendar screen in `app/app/(manager)/schedule/index.tsx` (depends on: T040)

**🏁 Checkpoint**: Manager can build and staff the schedule with conflicts caught before confirmation; combined with US2, employees now see real staffed shifts.

---

## Phase 6: User Story 4 - Employee clocks in/out with location verification (Priority: P4)

**Goal**: Geofenced clock-in/out that never blocks, automatic timesheet population, offline queueing.

**Covers part of the "employee screens and flows" grouping (clock in/out, timesheet) and both the "overtime calculation" unit test and "clock-in" integration test requirements.**

**Independent Test**: Clock in/out inside and outside the geofence (both succeed; only the outside case is flagged); go offline, clock out, confirm it queues and later syncs into the timesheet.

### Tests for User Story 4

- [X] T054 [P] [US4] Unit tests for the fixed 8-hour/day overtime split (pure function, no DB) in `api/tests/unit/time-entries.service.test.ts`
- [X] T055 [P] [US4] Integration test for clock-in/out (inside geofence, outside geofence flagged, duplicate idempotency key not double-applied) in `api/tests/integration/time-entries.test.ts`

### Implementation for User Story 4

- [X] T056 [US4] Implement the time-entries data-access repo in `api/src/data/time-entries.repo.ts` (depends on: T013)
- [X] T057 [US4] Implement geofence distance check and clock-in/clock-out service logic (idempotency-key dedup, never blocks, sets `flagged_for_review`) in `api/src/services/time-entries.service.ts` (depends on: T056, T055 written first and failing)
- [X] T058 [US4] Implement the regular/overtime hours aggregation pure function in `time-entries.service.ts` (depends on: T054 written first and failing)
- [X] T059 [US4] Implement `POST /v1/time-entries/clock-in`, `POST /v1/time-entries/:id/clock-out`, `GET /v1/time-entries` in `api/src/routes/time-entries.routes.ts` (depends on: T057)
- [X] T060 [US4] Implement `GET /v1/timesheets/mine` and `GET /v1/timesheets/export` in `api/src/services/reports.service.ts` + `api/src/routes/dashboard.routes.ts`-adjacent `timesheets.routes.ts` (depends on: T058)
- [X] T061 [P] [US4] Build the employee clock-in/out screen using `expo-location` and the offline mutation queue (T027) in `app/app/(employee)/clock/index.tsx` (depends on: T027, T059)
- [X] T062 [P] [US4] Build the employee timesheet screen (per-day and per-pay-period, regular vs. overtime) in `app/app/(employee)/timesheet/index.tsx` (depends on: T060)

**🏁 Checkpoint**: Employees can reliably clock in/out online or offline, and see a correct timesheet.

---

## Phase 7: User Story 5 - Employee requests a shift swap and it is approved (Priority: P5)

**Goal**: Swap request → coworker accept/decline → manager-or-shift-leader final approval.

**Covers part of both the "employee screens and flows" and "manager screens and flows" groupings (swap request + approvals queue), and the "integration test for swap approval" requirement.**

**Independent Test**: Request a swap, have the coworker accept, have the shift's leader (not the manager) approve it, confirm staffing updates and both parties are notified; confirm a non-leader employee cannot approve.

### Tests for User Story 5

- [X] T063 [P] [US5] Integration test for the full swap flow, including the manager-vs-shift-leader approver branching and the leader-scope rejection case, in `api/tests/integration/swap-requests.test.ts`

### Implementation for User Story 5

- [X] T064 [US5] Implement the swap-requests data-access repo in `api/src/data/swap-requests.repo.ts` (depends on: T011)
- [X] T065 [US5] Implement `api/src/services/swaps.service.ts`: eligibility check (no conflicts), request/respond/decide logic, manager-or-current-leader authorization for `decide` (depends on: T064, T022, T063 written first and failing)
- [X] T066 [US5] Implement swap-requests routes (`GET .../eligible-coworkers`, `POST /v1/swap-requests`, `POST /:id/respond`, `POST /:id/decide`, `GET ?mine=true`) in `api/src/routes/swap-requests.routes.ts` (depends on: T065)
- [X] T067 [P] [US5] Build the employee "Request Swap" flow (pick shift → eligible coworkers → send request) in `app/app/(employee)/swaps/` (depends on: T066, T025)
- [X] T068 [P] [US5] Build the swap approval UI, surfaced both in the manager approvals queue and on a shift-leader's own led-shift view, in `app/app/(manager)/approvals/swaps.tsx` (depends on: T066)

**🏁 Checkpoint**: The full swap workflow works end-to-end, including the shift-leader-as-approver path.

---

## Phase 8: User Story 6 - Employee requests time off and manager reviews it (Priority: P6)

**Goal**: Time-off request with required reason, manager approve/deny with comment, approved time off blocks future staffing.

**Covers part of both the "employee screens and flows" and "manager screens and flows" groupings.**

**Independent Test**: Submit a time-off request, approve it, confirm the manager can no longer staff that employee on a shift inside the approved range.

### Implementation for User Story 6

- [X] T069 [US6] Implement the time-off-requests data-access repo in `api/src/data/time-off-requests.repo.ts` (depends on: T012)
- [X] T070 [US6] Implement `api/src/services/time-off.service.ts`: submit (rejects blank reason), decide, and a `hasApprovedTimeOff(employeeId, date)` helper (depends on: T069)
- [X] T071 [US6] Implement time-off-requests routes (`POST`, `GET ?mine=true`, `GET` for managers, `POST /:id/decide`) in `api/src/routes/time-off-requests.routes.ts` (depends on: T070)
- [X] T072 [US6] Wire `hasApprovedTimeOff` into the staffing conflict checks from `staffing.service.ts` so staffing during approved time off is flagged/blocked (depends on: T045, T070)
- [X] T073 [P] [US6] Build the employee "Request Time Off" screen (date range + required reason field) with React Hook Form + Zod in `app/app/(employee)/time-off/index.tsx` (depends on: T071, T025)
- [X] T074 [P] [US6] Build the manager time-off review screen (approve/deny + optional comment) in `app/app/(manager)/approvals/time-off.tsx` (depends on: T071)

**🏁 Checkpoint**: Time-off workflow enforces its scheduling block end-to-end.

---

## Phase 9: User Story 7 - Manager posts an open shift and an employee claims it (Priority: P7)

**Goal**: Open shift board with manager-chooses-any-claimant confirmation (no first-come priority).

**Covers part of both the "employee screens and flows" and "manager screens and flows" groupings.**

**Independent Test**: Post an open shift, have two employees claim it, confirm the manager sees both with no ordering and can confirm whichever they choose.

### Implementation for User Story 7

- [X] T075 [US7] Implement `api/src/services/open-shifts.service.ts`: post-open, eligibility (reusing US5's eligibility logic), claim, list-claimants (unordered), confirm-one (depends on: T046, T065)
- [X] T076 [US7] Implement open-shift routes (`POST /v1/shifts/:id/post-open`, `GET /v1/open-shifts`, `POST /v1/open-shifts/:id/claim`, `GET /v1/shifts/:id/claims`, `POST /v1/shifts/:id/claims/:claimId/confirm`) in `api/src/routes/open-shifts.routes.ts` (depends on: T075)
- [X] T077 [P] [US7] Build the employee open shift board screen (list + claim) in `app/app/(employee)/open-shifts/index.tsx` (depends on: T076, T025)
- [X] T078 [P] [US7] Build the manager open-shift claims review screen (all claimants shown, pick any) in `app/app/(manager)/open-shifts/[shiftId]/claims.tsx` (depends on: T076)

**🏁 Checkpoint**: Open shift board works with manager-picks-any-claimant behavior confirmed.

---

## Phase 10: User Story 8 - Manager oversees coverage, reporting, and communication (Priority: P8)

**Goal**: Dashboard, area-label management, reports, announcements, plus the remaining shared employee screens (directory, profile, availability) that no earlier story needed yet.

**Covers the remainder of both the "employee screens and flows" grouping (availability, directory, profile) and the "manager screens and flows" grouping (dashboard, staff management, reports, locations, announcements).**

**Independent Test**: Dashboard reflects real data; a manager can create/rename/remove an area label with no employee-facing path to that screen; a shift-scoped broadcast reaches only that shift's staff.

### Implementation for User Story 8

- [X] T079 [US8] Implement shift-areas repo + service + routes (manager-only create/rename/remove, employee read-only) in `api/src/data/shift-areas.repo.ts`, `api/src/services/shift-areas.service.ts`, `api/src/routes/shift-areas.routes.ts` (depends on: T008, T021)
- [X] T080 [US8] Implement locations service + routes (`GET /v1/locations/mine`, `PATCH /v1/locations/mine`) in `api/src/services/locations.service.ts` + `api/src/routes/locations.routes.ts` (depends on: T006)
- [X] T081 [US8] Implement `api/src/services/announcements.service.ts` (resolves the exact recipient set per `target_scope`) + `api/src/routes/announcements.routes.ts` (depends on: T015)
- [X] T082 [US8] Implement `api/src/services/reports.service.ts` (labor cost vs. budget, hours by employee, attendance/no-show trend, overtime trend) + `api/src/routes/reports.routes.ts` (depends on: T056, T046, T069)
- [X] T083 [US8] Implement the dashboard aggregate endpoint (today's coverage, open unfilled shifts, pending approvals count, single call) in `api/src/services/dashboard.service.ts` + `api/src/routes/dashboard.routes.ts` (depends on: T039, T046, T064, T069, T075)
- [X] T084 [P] [US8] Build the manager dashboard screen in `app/app/(manager)/dashboard/index.tsx` (depends on: T083, T025)
- [X] T085 [P] [US8] Build the manager shift-areas management screen in `app/app/(manager)/shift-areas/index.tsx` (depends on: T079)
- [X] T086 [P] [US8] Build the manager reports screens (labor cost, hours by employee, attendance, overtime — 4 views) in `app/app/(manager)/reports/` (depends on: T082)
- [X] T087 [P] [US8] Build the manager announcements composer screen in `app/app/(manager)/announcements/index.tsx` (depends on: T081)
- [X] T088 [US8] Implement `GET /v1/team` (coworker directory) in `api/src/routes/profile.routes.ts` and build the employee directory screen in `app/app/(employee)/team/index.tsx` (depends on: T032)
- [X] T089 [US8] Implement `GET/PATCH /v1/profile` + avatar upload, and build the shared profile screen (used by both role groups) in `app/app/(employee)/profile/index.tsx` (depends on: T032)
- [X] T090 [US8] Implement availability repo/service/routes and build the employee availability screen (recurring windows + block-out dates) in `api/src/{data,services,routes}/availability.*` + `app/app/(employee)/availability/index.tsx` (depends on: T032)

**🏁 Checkpoint**: All manager oversight screens are complete; every functional requirement in spec.md now has a corresponding endpoint and screen.

---

## Phase 11: Notifications (Cross-Cutting)

**Purpose**: Push setup and a trigger for every event type named in FR-022, plus the realtime relay.

**Covers the "notifications" grouping in full.**

- [X] T091 Implement `api/src/services/notifications.service.ts` (Expo push send via `expo-server-sdk`) (depends on: T016)
- [X] T092 Implement `POST /v1/devices` / `DELETE /v1/devices/:token` in `api/src/routes/devices.routes.ts` (depends on: T091)
- [X] T093 [P] Wire the "shift assigned" / "shift changed" / "shift cancelled" push triggers into `shifts.service.ts` / `staffing.service.ts` (depends on: T091, T047, T049)
- [X] T094 [P] Wire the "swap approved" / "swap denied" push triggers into `swaps.service.ts` (depends on: T091, T065)
- [X] T095 [P] Wire the "time-off approved" / "time-off denied" push triggers into `time-off.service.ts` (depends on: T091, T070)
- [X] T096 Implement the upcoming-shift-reminder `node-cron` job with exactly-once delivery via `shift_reminders_sent` in `api/src/jobs/shift-reminders.job.ts` + `api/src/jobs/scheduler.ts` (depends on: T017, T091)
- [X] T097 [P] Implement Expo push token registration on app launch in `app/src/notifications/register.ts`, calling T092 (depends on: T092)
- [X] T098 [P] Build the notification preferences UI within the profile screen in `app/app/(employee)/profile/notifications.tsx` (depends on: T089)
- [X] T099 Implement the realtime SSE endpoint and Supabase-Realtime-to-SSE relay per [contracts/realtime-events.md](contracts/realtime-events.md) in `api/src/services/realtime.service.ts` + `api/src/routes/realtime.routes.ts` (depends on: T019)
- [X] T100 [P] Wire the Expo app to consume the SSE stream and invalidate the matching TanStack Query caches in `app/src/offline/realtime-client.ts` (depends on: T027, T099)

**Completion check**: Triggering each event in a manual test (assign a shift, approve a swap, approve time off, wait for the reminder window) produces exactly one push per recipient; killing/restarting the API mid-reminder-window does not double-send.

---

## Phase 12: Polish & Cross-Cutting Concerns

- [X] T101 [P] Accessibility pass on the shared component library (screen-reader labels, minimum tap target size) in `app/src/components/` (depends on: T025)
- [X] T102 [P] Finalize EAS build profiles for iOS and Android (dev/preview/production) in `app/eas.json`
- [X] T103 [P] Finalize environment variable documentation for dev/staging/production across both projects in `api/.env.example` and `app/.env.example`
- [X] T104 Run every scenario in [quickstart.md](quickstart.md) end-to-end against a staging-like environment and fix any gap found
- [X] T105 [P] Security review pass: confirm every write endpoint in [contracts/rest-api.md](contracts/rest-api.md) rejects an unauthorized role/scope with 403/404, per its stated role gate

**Completion check**: All quickstart.md scenarios pass; no endpoint accepts a request its documented role gate should reject.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup — **blocks every user story**.
- **User Stories (Phases 3–10)**: each depends only on Phase 2, in this priority order:
  - US1 (Phase 3) → US2 (Phase 4) → US3 (Phase 5) → US4 (Phase 6) → US5 (Phase 7) → US6 (Phase 8) → US7 (Phase 9) → US8 (Phase 10)
  - This order is both the spec's priority order and the requested "auth/DB → employee flows → manager flows" sequencing, since US1 is the account foundation, US2/US4/US5/US6 are employee-primary, and US3/US7/US8 are manager-primary.
  - Note some later stories read data created by earlier ones (e.g., US4's clock-in needs a staffed shift from US3) — for solo/sequential delivery, build in the listed order; for parallel team delivery, stub the missing upstream data in tests rather than blocking.
- **Notifications (Phase 11)**: depends on the service files each trigger wires into (US3, US5, US6 services) — do last among functional work since it touches every earlier service file.
- **Polish (Phase 12)**: depends on all desired stories + Phase 11 being complete.

### Parallel Opportunities

- All `[P]` tasks within Phase 1 and within Phase 2's three subsections (schema, auth middleware, shared UI) run in parallel — they touch disjoint files.
- Within any user-story phase, `[P]`-marked screen-building tasks run in parallel once their listed backend dependency task is done.
- Phase 11's four trigger-wiring tasks (T093–T095, T097) can run in parallel once T091/T092 exist, since each touches a different service file.

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Schema migrations (all independent files):
Task: "Create migration for locations table in api/supabase/migrations/0001_locations.sql"
Task: "Create migration for profiles table in api/supabase/migrations/0002_profiles.sql"
Task: "Create migration for shift_areas table in api/supabase/migrations/0003_shift_areas.sql"

# Shared UI (all independent files):
Task: "Define theme.ts in app/src/components/theme.ts"
Task: "Build core shared component library in app/src/components/"
Task: "Build API client wrapper in app/src/api/client.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (schema, RLS, auth middleware, shared UI) — critical, blocks everything
3. Phase 3: User Story 1 (closed account provisioning)
4. **STOP and VALIDATE**: seeded manager creates an employee, employee logs in, no sign-up path exists anywhere — this is the MVP.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → validate → demo (closed-account MVP).
3. US2 → validate → demo (employees can see their schedule).
4. US3 → validate → demo (managers can actually build that schedule, with conflict detection).
5. US4 → validate → demo (clock-in/out + timesheet, including offline).
6. US5 → validate → demo (shift swaps with leader-or-manager approval).
7. US6 → validate → demo (time off with scheduling block).
8. US7 → validate → demo (open shift board).
9. US8 → validate → demo (dashboard, reports, areas, announcements, directory, profile, availability).
10. Notifications (Phase 11) → every event type now pushes + realtime updates flow.
11. Polish (Phase 12) → accessibility, builds, env docs, full quickstart pass, security review.

### Notes

- `[P]` tasks touch different files with no incomplete dependency — safe to run concurrently.
- Tests marked in Phases 3–7 should be written and confirmed failing before their paired implementation task, per the constitution's Testable Business Logic principle.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently before moving on.
