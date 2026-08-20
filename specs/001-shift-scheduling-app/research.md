# Research & Technical Decisions: Mobile Shift Scheduling App

**Input**: Technical direction supplied by the user for `/speckit-plan`, cross-checked against
[spec.md](spec.md) and [constitution.md](../../.specify/memory/constitution.md).

Each decision below resolves one `NEEDS CLARIFICATION` / open flag from the Technical Context
or from the user's planning brief.

---

## 1. Realtime update delivery mechanism

**Flagged by user as a decision to confirm.**

- **Decision**: The Node.js API exposes a **Server-Sent Events (SSE)** stream
  (`GET /v1/realtime/stream`) per authenticated user. Internally, the API subscribes once to
  Supabase Realtime's Postgres change feed (`postgres_changes`) for the tables that drive live
  updates (`shifts`, `shift_assignments`, `shift_swap_requests`, `time_off_requests`), filters
  each change server-side against the connected user's role/location/participation, and
  re-publishes only the events that user is authorized to see over their SSE connection.
- **Rationale**: Every realtime need named in the brief — live schedule changes, swap/time-off
  status changes, open shift board updates — is a one-directional, server-to-client push. SSE
  gives that with a plain HTTP response stream: no extra protocol, no connection-upgrade
  handshake, and it works over the same HTTPS the REST API already uses, which keeps the
  client's networking surface to one thing (HTTP) rather than two. It also keeps a strict rule
  the brief requires: **the Expo app never talks to Supabase directly**, including its Realtime
  service — the API is the only thing that holds a Supabase connection.
- **Alternatives considered**:
  - *WebSockets*: bidirectional, but nothing in this feature needs the client to push data over
    a persistent socket — mutations already go through normal REST calls. Adopting WebSockets
    anyway would add a second connection protocol, a second set of reconnect/backoff logic on
    the client, and a stateful-connection concern on the API's hosting side, for no capability
    the app actually uses. Rejected on the constitution's Simplicity Over Cleverness principle.
  - *Client subscribes to Supabase Realtime directly*: simplest to wire up, but violates the
    brief's explicit requirement that the app never call Supabase directly, and would leak the
    Supabase project's realtime channel structure (and RLS-dependent behavior) into the client,
    duplicating authorization logic that must otherwise live only in the API. Rejected.

## 2. Manager location scoping (spec follow-up)

- **Decision**: A manager/admin account is scoped to exactly one location (`profiles.location_id`),
  matching the schema the user specified. A manager can only read or write staff, shifts, area
  labels, and reports for their own location. Someone overseeing several locations holds one
  manager account per location in v1.
- **Rationale**: The user's own schema puts a single `location_id` on `profiles` (not a
  join table), so this is the data model already implied. It is also the simplest and most
  common case for single-site retail/hospitality/healthcare deployments, which the spec's
  domain examples target.
- **Alternatives considered**: A manager-to-many-locations join table, enabling one account to
  administer multiple sites. Deferred to a future version — it is a straightforward additive
  change (a `manager_locations` join table plus a location switcher in the UI) that does not
  need to block v1 and was not required by the user's schema.

## 3. Data retention for schedules and timesheets (spec follow-up)

- **Decision**: No automatic purge or archival in v1. Shift, staffing, swap, time-off, and
  timesheet records are retained indefinitely; deactivating a staff account never deletes their
  historical records.
- **Rationale**: The spec's own reporting requirements (labor cost vs. budget, attendance/
  no-show trends, overtime trends) and timesheet export need historical data to remain
  queryable, and no specific jurisdiction or compliance regime was named that would mandate a
  shorter retention window.
- **Alternatives considered**: A time-boxed retention/archival job. Deferred — revisit once a
  specific target region's labor-record retention law is known; the schema's timestamp columns
  make adding a scheduled archival job straightforward later without a migration to the core
  tables.

## 4. Backend web framework

- **Decision**: **Fastify** with TypeScript.
- **Rationale**: Fastify's built-in JSON Schema request/response validation and serialization
  removes the need for a bolted-on validation middleware stack, and its plugin/decorator model
  gives a clean place to attach the auth-verification and role/shift-leader permission checks
  the brief requires as middleware. This favors the constitution's Simplicity Over Cleverness
  principle (lean on a well-supported built-in capability) over hand-rolling equivalent
  behavior on top of a leaner framework.
- **Alternatives considered**: Express — more ubiquitous and more third-party examples exist,
  but request validation, typing, and serialization all need extra libraries wired in by hand.
  Either is compatible with the required layered structure; Fastify was chosen for the reasons
  above, not because Express is unsuitable.

## 5. Client server-state and local UI state

- **Decision**: **TanStack Query** owns all server state (every read/write that hits the Node
  API). **Zustand** holds cross-cutting local UI state that changes independently of any
  server data (e.g., the offline-queue/sync-status banner, active role-scoped nav context).
  **React Context** is reserved narrowly for the authenticated session object and the theme,
  which are genuinely static-until-changed values a large subtree needs to read.
- **Rationale**: Using React Query as the single source of truth for server data avoids a
  second, hand-maintained cache that could drift from it. Zustand avoids the re-render fan-out
  Context causes for state that changes often (sync status ticking during a queue flush).
- **Alternatives considered**: Context-only for everything — simpler mentally, but would cause
  broad re-renders for frequently-changing state like sync status; rejected on performance
  grounds for a schedule/timesheet-heavy UI with many list screens.

## 6. Offline queueing for clock-in/out and mutations

- **Decision**: TanStack Query's built-in offline mutation support (`onlineManager` +
  `MutationCache` persistence via `@tanstack/query-async-storage-persister` backed by
  `AsyncStorage`) queues mutations made while offline and replays them in original order once
  connectivity returns. Reads use `persistQueryClient` so the last-synced schedule remains
  viewable offline.
- **Rationale**: This is a well-supported, built-in capability of the same data-fetching layer
  already chosen for server state, rather than a bespoke sync engine — directly matching the
  constitution's Simplicity Over Cleverness and Offline Resilience principles. Each queued
  mutation carries a client-generated idempotency key so a retried clock-in/out (or swap
  action) cannot be double-applied if the network flaps mid-sync.
- **Alternatives considered**: A custom local queue table (e.g., in `expo-sqlite`) with manual
  replay logic. Rejected as unnecessary custom infrastructure for a problem the chosen
  data-fetching library already solves.

## 7. Push notifications

- **Decision**: **Expo push notification service**, via `expo-server-sdk` on the Node API.
  Devices register an Expo push token with the API (`POST /v1/devices`) after obtaining it via
  `expo-notifications` on the client; the API is the only thing that ever calls the Expo push
  API, triggered by the relevant domain event (shift assigned/changed, swap approved/denied,
  time-off approved/denied) or by the scheduled shift-reminder job.
- **Rationale**: Matches the brief exactly (push notifications triggered by the backend) and
  is the standard, built-in path for push in an Expo app — no custom push gateway needed.

## 8. Scheduled jobs (shift reminders)

- **Decision**: **node-cron** running in-process in the API for v1, in a dedicated `jobs/`
  module, checking on a short interval (e.g., every 5 minutes) for shifts starting within the
  reminder window and sending exactly one reminder push per shift assignment.
- **Rationale**: Matches the brief; for v1's expected scale, an in-process cron job is
  sufficient and avoids standing up a separate scheduler service. A `sent_at` marker on the
  reminder (or a small `shift_reminders_sent` table keyed by shift assignment) prevents
  duplicate sends if the process restarts mid-window.
- **Alternatives considered**: An external scheduler (e.g., a managed cron trigger calling a
  webhook). Left as a documented deployment-time swap if the API is later scaled to multiple
  instances, since in-process `node-cron` across N replicas would send duplicate reminders —
  see Deployment Notes in [plan.md](plan.md).

## 9. Testing tooling

- **Decision**: API: **Vitest** + **Supertest** for unit tests (conflict detection, overtime
  calculation, geofence validation, approval-routing logic — all as pure/isolated functions in
  the services layer) and integration tests (swap approval flow, clock-in flow, manager
  account creation flow) against a test Supabase project/schema. Expo app: **Jest** with the
  `jest-expo` preset and **React Native Testing Library** for component/screen tests.
- **Rationale**: Vitest gives fast native ESM/TS execution for the API without extra config;
  `jest-expo` is Expo's own supported preset, so the mobile app's test setup uses a built-in,
  well-supported capability rather than a custom Jest configuration.

## 10. Manager account creation transaction

- **Decision**: The admin-only `POST /v1/admin/users` endpoint calls Supabase Auth's admin
  `createUser` (via the service-role client) to create the auth user, then inserts the
  corresponding `profiles` row, inside a single service-layer function. If the profile insert
  fails after the auth user was created, the service deletes the just-created auth user
  (compensating action) so no orphaned auth user without a profile is left behind, and returns
  an error to the manager.
- **Rationale**: Supabase Auth user creation and the `profiles` insert are two separate calls
  against two different subsystems (GoTrue and Postgres) with no native cross-system
  transaction, so an explicit compensating-action pattern is required to keep them consistent.

---

All `NEEDS CLARIFICATION` markers from the Technical Context are resolved above. No open
decisions remain blocking Phase 1 design.
