# Quickstart: Validating the Mobile Shift Scheduling App

This is a validation guide, not an implementation guide — it proves the feature works
end-to-end against the contracts in [contracts/](contracts/) and the schema in
[data-model.md](data-model.md). Full implementation steps belong in `tasks.md`.

## Prerequisites

- A Supabase project with the schema from `data-model.md` applied and RLS policies enabled.
- The Node.js API running locally (`.env` populated per plan.md's environment variable table)
  against that Supabase project.
- The Expo app running (`expo start`) pointed at the local API's base URL.
- One row seeded directly in Supabase (dashboard or a one-off seed script, **not** through the
  app or API — per FR-003): one `locations` row, and one `profiles` row with `role='manager'`
  linked to a Supabase Auth user created via the dashboard.

## Scenario 1 — Closed account model (validates User Story 1)

1. Sign in as the seeded manager via `POST /v1/auth/session`. Confirm the login screen in the
   Expo app shows only sign-in + forgot-password — no sign-up control anywhere.
2. As the manager, call `POST /v1/admin/users` to create one employee account. Confirm:
   - The response contains no plaintext password (invite-based, per FR-007).
   - The new `profiles` row has `invite_status='pending'`.
   - No endpoint anywhere in `contracts/rest-api.md` allows self-registration.
3. Complete the invite flow for the new employee (Supabase Auth's invite/magic-link
   acceptance) and sign in as them. Confirm `GET /v1/auth/me` returns `role='employee'`.

**Expected outcome**: an account exists and can sign in without ever having called a sign-up
endpoint; every account traces to `created_by`.

## Scenario 2 — Two-step shift creation and staffing (validates User Story 3)

1. As the manager: `POST /v1/shifts` with only `name`, `start_time`, `end_time`. Confirm
   `GET /v1/shifts/:id` shows `status='draft'` and an empty assignments list.
2. `PUT /v1/shifts/:id/assignments` with the employee from Scenario 1 as `is_leader: true`,
   plus a second seeded employee as a worker. Confirm both appear in
   `GET /v1/shifts/:id/assignments`, and `shifts.name`/`start_time`/`end_time` are unchanged.
3. Attempt to staff the same employee onto a second shift whose time window overlaps the
   first. Confirm the response is `409` with a double-booking detail (FR-028), and no row was
   written.
4. As the shift leader from step 2, call `PUT /v1/shifts/:id/assignments` on their own shift —
   confirm it succeeds. Attempt the same call against a different shift they do not lead —
   confirm `403` (FR-009, FR-012).

**Expected outcome**: shifts can exist unstaffed, staffing is independently editable, and
shift-leader write access is scoped to exactly the shift they lead.

## Scenario 3 — Clock in/out with geofence + offline queue (validates User Story 4)

1. As the staffed worker employee, call `POST /v1/time-entries/clock-in` with `lat`/`lng`
   inside the location's `geofence_radius_m`. Confirm `flagged_for_review=false`.
2. Repeat from coordinates outside the radius. Confirm the call still succeeds (`201`, not
   blocked) with `flagged_for_review=true`, and it appears in
   `GET /v1/time-entries?flagged=true` for the manager.
3. In the Expo app, disable network connectivity, tap clock-out, confirm the UI shows the
   action as "pending sync" rather than confirmed. Re-enable connectivity and confirm it syncs
   within the SC-009 target (1 minute) and the entry appears via `GET /v1/time-entries?mine=true`.
4. Call `GET /v1/timesheets/mine?period=<current>` and confirm hours split into regular vs.
   overtime using the fixed 8-hour/day threshold (FR-020).

**Expected outcome**: clock actions never block on location, always resolve (recorded, flagged,
or queued), and offline actions reliably sync.

## Scenario 4 — Shift swap with shift-leader approval (validates User Story 5)

1. As a worker staffed on the shift from Scenario 2, call `GET /v1/shifts/:id/eligible-coworkers`
   and confirm only conflict-free coworkers are listed.
2. `POST /v1/swap-requests` targeting one eligible coworker; as that coworker,
   `POST /v1/swap-requests/:id/respond` with `accept: true`.
3. As the shift's designated leader (not the manager), call
   `POST /v1/swap-requests/:id/decide` with `approve: true`. Confirm it succeeds (FR-011),
   `shift_assignments` reflects the swap, and both original parties would receive a
   `swap.status_changed` SSE event.
4. Repeat steps 1–2 on a different shift with no designated leader; confirm only the manager
   (not any employee) can call `decide` successfully.

**Expected outcome**: swap approval routes correctly to manager-or-leader exactly as specified,
and a non-leader employee cannot approve.

## Scenario 5 — Open shift claim with manager choice (validates User Story 7)

1. As the manager, `POST /v1/shifts/:id/post-open` on an unstaffed shift.
2. As two different eligible employees, `POST /v1/open-shifts/:id/claim`.
3. As the manager, `GET /v1/shifts/:id/claims` — confirm both claimants are listed with no
   ordering implying priority (FR-046).
4. `POST /v1/shifts/:id/claims/:claimId/confirm` for the second claimant (not the first).
   Confirm that claimant is staffed and the first claimant receives an `open_shift.confirmed`
   notification that the shift is no longer available.

**Expected outcome**: claim order never determines the outcome; the manager's choice is final.

## Scenario 6 — Manager-only shift areas (validates User Story 8, FR-032/FR-033)

1. As the manager, `POST /v1/shift-areas` to create "Stockroom".
2. Confirm `POST /v1/shift-areas` as an employee token returns `403`.
3. Attach the area via `PATCH /v1/shifts/:id` and confirm an employee viewing that shift sees
   the area label via `GET /v1/shifts/:id`, with no path in the API that would let them reach
   the area-management endpoints.

**Expected outcome**: area label management is fully manager-only; employees only ever see the
already-attached label.

## Non-functional checks

- **Offline resilience**: airplane-mode the device, open the app — the last-synced schedule
  (Scenario 2/3 data) must still render from the persisted query cache (constitution:
  Offline Resilience).
- **Security boundary**: attempt every write endpoint above with a token for a profile lacking
  the required role/scope, confirm `403`/`404` for every one — and separately, attempt the
  equivalent direct Postgres write with the anon key (no service role) to confirm RLS denies it
  even if an API check were somehow bypassed (defense-in-depth check).
- **Type sync**: confirm the Expo app's request/response TypeScript types
  (`src/types/api/*`) are generated from (or checked against) the same Zod schemas the API
  validates with, per plan.md's Type Safety approach — a drifted type should fail a build-time
  check, not a runtime surprise.
