# REST API Contract: Node.js Backend

All endpoints are prefixed `/v1`. All requests (except `POST /v1/auth/session`) require an
`Authorization: Bearer <supabase-access-token>` header; the API verifies this token against
Supabase Auth on every request (see plan.md's auth middleware). Every endpoint below states
its **role gate** — the authorization check enforced server-side, in addition to (never
instead of) the RLS policies in [data-model.md](../data-model.md).

Request/response bodies are illustrative field lists, not full JSON Schema — exact Zod schemas
are an implementation-phase task, not a planning artifact.

## Auth & Session

| Method | Path | Role gate | Description |
|---|---|---|---|
| POST | `/v1/auth/session` | none (public) | Exchanges email+password or magic-link callback for a Supabase session; proxies to Supabase Auth. **No sign-up endpoint exists anywhere in this API.** |
| POST | `/v1/auth/password-reset` | none (public) | Triggers Supabase Auth's password-reset email flow. |
| PATCH | `/v1/auth/password` | authenticated | Body: `password`. Sets the caller's password and flips `invite_status` to `accepted`. Reachable both by a signed-in user changing their password and by a new/reset-requesting user whose invite/recovery link's `access_token` (a normal Supabase session JWT) is used as the bearer token — no separate token-verification path. |
| POST | `/v1/auth/logout` | authenticated | Invalidates the current session. |
| GET | `/v1/auth/me` | authenticated | Returns the caller's own profile + role + location. |

## Admin: User Provisioning (closed account model)

| Method | Path | Role gate | Description |
|---|---|---|---|
| POST | `/v1/admin/users` | manager | Creates an auth user (service-role) + `profiles` row in one compensating-action-protected operation (see research.md #10); sends the email/SMS invite (FR-004, FR-007). Body: `name`, `role`, `job_role`, `location_id`, `phone`/`email`, `pay_rate?`. |
| GET | `/v1/admin/users` | manager | Lists staff at the manager's own location, including inactive. |
| PATCH | `/v1/admin/users/:id` | manager (same location only) | Edits role/job_role/pay_rate/location assignment. |
| POST | `/v1/admin/users/:id/deactivate` | manager (same location only) | Deactivates; never deletes (FR-006, FR-036a). Rejects if `:id` is the sole `is_leader=true` on a future shift without also clearing/reassigning that leader designation (edge case in spec.md). |

## Profile

| Method | Path | Role gate | Description |
|---|---|---|---|
| GET | `/v1/profile` | authenticated | Own profile. |
| PATCH | `/v1/profile` | authenticated | Update own name display prefs, phone, avatar, notification_prefs — never `role`, `pay_rate`, or `location_id`. |
| POST | `/v1/profile/avatar` | authenticated | Multipart upload; API uploads to Supabase Storage server-side and stores the resulting path. |
| GET | `/v1/team` | authenticated | Coworker directory scoped to caller's `location_id` (FR-021). |

## Locations

| Method | Path | Role gate | Description |
|---|---|---|---|
| GET | `/v1/locations/mine` | authenticated | The caller's own location (name, address, timezone; `geofence_radius_m` visible to managers only). |
| PATCH | `/v1/locations/mine` | manager | Edit `geofence_radius_m`, `name`, `address`, `timezone` for the manager's own location. |

## Shift Areas (manager-only management, FR-032/FR-033)

| Method | Path | Role gate | Description |
|---|---|---|---|
| GET | `/v1/shift-areas` | authenticated | List area labels for caller's location (read-only for employees). |
| POST | `/v1/shift-areas` | manager | Create an area label. |
| PATCH | `/v1/shift-areas/:id` | manager (same location) | Rename. |
| DELETE | `/v1/shift-areas/:id` | manager (same location) | Remove; rejected (409) if shifts still reference it, per standard destructive-action-confirmation flow surfaced client-side. |

## Shifts (create step — FR-026)

| Method | Path | Role gate | Description |
|---|---|---|---|
| GET | `/v1/shifts` | authenticated | List shifts at caller's location; employees see only shifts they're staffed on plus the open-shift board subset — filtering enforced server-side, not just client-side query params. Query params: `from`, `to`, `status`. |
| GET | `/v1/shifts/:id` | authenticated (must be staffed on it, its leader, or a manager) | Shift detail including staffing. |
| POST | `/v1/shifts` | manager | Create with `name`, `start_time`, `end_time`, `shift_area_id?`, `position?`, `notes?`. Result has `status='draft'`, **no staffing** (schema has no employee column). |
| PATCH | `/v1/shifts/:id` | manager (same location) | Edit name/time/area/notes only — never touches staffing (FR-027). |
| POST | `/v1/shifts/:id/cancel` | manager (same location) | Sets `status='cancelled'`; requires explicit confirmation client-side (constitution non-negotiable: destructive actions). |

## Shift Staffing (staff step — FR-026/FR-027, separate from the above)

| Method | Path | Role gate | Description |
|---|---|---|---|
| GET | `/v1/shifts/:id/assignments` | manager, or the shift's current leader, or an assigned employee (own row only) | List staffing for a shift. |
| PUT | `/v1/shifts/:id/assignments` | manager (same location), **or the shift's current designated leader for that shift only** (FR-009) | Full-replace staffing: body is the target list of `{employee_id, is_leader}`. Runs conflict detection (double-booking, insufficient rest — FR-028) and returns 409 with the specific conflicts if any would be violated, before any row is written. A shift-leader caller may not set `is_leader` on a row for themself-only edge case beyond the normal reassignment rules; they may reassign any worker/leader on their shift, per FR-009. |
| DELETE | `/v1/shifts/:id/assignments/:employeeId` | manager (same location), or the shift's current leader | Remove one staffed employee. |

## Open Shift Board (FR-029, FR-044–FR-046)

| Method | Path | Role gate | Description |
|---|---|---|---|
| POST | `/v1/shifts/:id/post-open` | manager (same location) | Sets `status='open'`; shift must currently be unstaffed of workers (a leader-only shift may still be posted for workers). |
| GET | `/v1/open-shifts` | employee | Lists open shifts the caller is eligible for (role/location/no-conflict match — FR-044). |
| POST | `/v1/open-shifts/:id/claim` | employee (must be eligible) | Records a claim; does **not** staff the shift yet (FR-045). Idempotent per caller. |
| GET | `/v1/shifts/:id/claims` | manager (same location) | Lists all claimants, unordered by claim time (FR-046) — the manager UI must not imply a "first" claimant is favored. |
| POST | `/v1/shifts/:id/claims/:claimId/confirm` | manager (same location) | Confirms one claimant → creates the `shift_assignments` row, sets `status='scheduled'`, notifies the confirmed claimant and (separately) the other claimants that the shift is no longer available. |

## Shift Swap Requests (FR-017, FR-041–FR-043)

| Method | Path | Role gate | Description |
|---|---|---|---|
| GET | `/v1/shifts/:id/eligible-coworkers` | assigned employee on that shift | Coworkers with no scheduling conflict for that shift's time window (FR-041). |
| POST | `/v1/swap-requests` | employee (must be assigned to the referenced shift) | Body: `shift_id`, `target_employee_id`. Creates `status='pending'`. |
| POST | `/v1/swap-requests/:id/respond` | the `target_employee_id` on that request | Body: `{accept: boolean}`. Sets `coworker_accepted` or `coworker_declined`. |
| POST | `/v1/swap-requests/:id/decide` | manager (same location), **or** the profile that is `is_leader=true` on that request's `shift_id` (FR-011/FR-012) | Body: `{approve: boolean, comment?}`. Only valid from `coworker_accepted`. On approve, atomically updates `shift_assignments` (swaps the employee) and notifies both parties (FR-043). |
| GET | `/v1/swap-requests?mine=true` | employee | Own sent/received requests with status. |

## Time Off Requests (FR-018, FR-030, FR-036)

| Method | Path | Role gate | Description |
|---|---|---|---|
| POST | `/v1/time-off-requests` | employee | Body: `start_date`, `end_date`, `reason` (required — 400 if blank). |
| GET | `/v1/time-off-requests?mine=true` | employee | Own requests + status. |
| GET | `/v1/time-off-requests` | manager (same location) | Pending + historical, for review against coverage. |
| POST | `/v1/time-off-requests/:id/decide` | manager (same location) | Body: `{approve: boolean, comment?}`. Approval blocks future staffing for that range (FR-036); if the employee is already staffed on a conflicting shift, response includes that conflict for the manager to resolve (edge case in spec.md), rather than silently approving over it. |

## Time Entries — Clock In/Out (FR-019, FR-037–FR-040)

| Method | Path | Role gate | Description |
|---|---|---|---|
| POST | `/v1/time-entries/clock-in` | employee (must be assigned to `shift_id`) | Body: `shift_id`, `lat`, `lng`, `idempotency_key`. Server computes distance to `locations.geofence_radius_m`; outside → still creates the row but `flagged_for_review=true` (FR-038, never blocks). |
| POST | `/v1/time-entries/:id/clock-out` | employee (own entry) | Body: `lat`, `lng`, `idempotency_key`. Same geofence check; completes the entry. |
| GET | `/v1/time-entries?mine=true&from=&to=` | employee | Own entries. |
| GET | `/v1/time-entries?flagged=true` | manager (same location) | Entries needing review. |
| GET | `/v1/timesheets/mine?period=` | employee | Aggregated regular/overtime hours per day and pay period (FR-020), computed server-side from `time_entries`. |
| GET | `/v1/timesheets/export?period=&location_id=` | manager (same location) | CSV export for downstream payroll (explicitly in scope per spec's Out of Scope note). |

## Availability (FR-016)

| Method | Path | Role gate | Description |
|---|---|---|---|
| GET | `/v1/availability?mine=true` | employee | Own recurring windows + blocked dates. |
| PUT | `/v1/availability` | employee | Full-replace own availability set. |
| GET | `/v1/availability/:employeeId` | manager (same location) | For staffing-conflict checks. |

## Announcements (FR-035)

| Method | Path | Role gate | Description |
|---|---|---|---|
| POST | `/v1/announcements` | manager | Body: `target_scope`, `target_location_id?`/`target_shift_id?`, `message`. Server resolves the exact recipient set and pushes notifications only to them. |
| GET | `/v1/announcements?mine=true` | authenticated | Announcements the caller was a recipient of. |

## Reports (FR-034)

| Method | Path | Role gate | Description |
|---|---|---|---|
| GET | `/v1/reports/labor-cost?from=&to=` | manager (same location) | Actual labor cost vs. an entered budget figure. |
| GET | `/v1/reports/hours-by-employee?from=&to=` | manager (same location) | |
| GET | `/v1/reports/attendance?from=&to=` | manager (same location) | No-show/attendance trend. |
| GET | `/v1/reports/overtime?from=&to=` | manager (same location) | |

## Dashboard (FR-025)

| Method | Path | Role gate | Description |
|---|---|---|---|
| GET | `/v1/dashboard` | manager | Today's coverage, count of open unfilled shifts, count of pending swap/time-off approvals — a single aggregate call so the dashboard doesn't require the client to cross-reference multiple endpoints (SC-008). |

## Devices (push notification registration)

| Method | Path | Role gate | Description |
|---|---|---|---|
| POST | `/v1/devices` | authenticated | Body: `expo_push_token`. Upserts by token. |
| DELETE | `/v1/devices/:token` | authenticated (own token) | On sign-out/uninstall. |

## Realtime

See [realtime-events.md](realtime-events.md) for the SSE contract (research.md decision #1).

## Standard Error Shape

Every non-2xx response: `{ "error": { "code": string, "message": string, "details"?: object } }`.
Conflict-detection responses (`409` on staffing/scheduling conflicts) include a `"details"`
object naming the specific conflicting shift(s)/rule so the client can render a specific,
actionable message rather than a generic failure.
