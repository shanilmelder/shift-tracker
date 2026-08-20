# Data Model: Mobile Shift Scheduling App

Postgres schema hosted on Supabase. Every table below is written and read exclusively by the
Node.js API's server-side (service-role) Supabase client — see [plan.md](plan.md) for the
architectural rule that the Expo app never talks to Supabase directly. Row Level Security (RLS)
policies are defined on every table as a **defense-in-depth backstop** behind the API's own
authorization checks (constitution: Security First — authorization is enforced at the data
layer, not the UI, and client-side checks are never the boundary; here, even the API's own
business logic is backstopped by RLS at the database itself).

All timestamp columns are `timestamptz` (stored UTC-normalized, timezone-independent per the
constitution's non-negotiables); the client converts to local time only at display time, using
the relevant `locations.timezone` for shift-related times.

## Entity-Relationship Overview

```
locations ──┬─< profiles (location_id)
            ├─< shift_areas (location_id)
            └─< shifts (location_id)

shift_areas ──< shifts (shift_area_id, nullable)

shifts ──< shift_assignments >── profiles (employee_id)
shifts ──< shift_swap_requests
shifts ──< time_entries
shifts ──< announcements (when target_scope = 'shift')

profiles ──< shift_assignments (employee_id)
profiles ──< time_off_requests (employee_id)
profiles ──< availability (employee_id)
profiles ──< announcements (sender_id)
profiles ──< device_push_tokens (profile_id)
```

## Tables

### `locations`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `name` | `text` | NOT NULL | e.g., "Downtown Store" |
| `address` | `text` | NOT NULL | Human-readable; not itself used for the geofence calculation |
| `latitude` / `longitude` | `double precision` | NULL | The point a clock-in/out is measured against; nullable until a manager sets them (added in migration `0015` — missed in the original schema pass) |
| `geofence_radius_m` | `integer` | NOT NULL, default `150`, `CHECK (geofence_radius_m > 0)` | Resolves spec FR-037; per-location, manager-configurable |
| `timezone` | `text` | NOT NULL | IANA timezone name (e.g., `America/Chicago`); used to render shift times locally |
| `min_rest_hours` | `integer` | NOT NULL, default `8`, `CHECK (min_rest_hours >= 0)` | Manager-configurable minimum rest window used by insufficient-rest conflict detection (FR-028); added in migration `0014` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

### `profiles`

One row per person able to sign in; `id` is the same UUID as the Supabase Auth user.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE | |
| `name` | `text` | NOT NULL | |
| `role` | `text` | NOT NULL, `CHECK (role IN ('employee','manager'))` | "manager" covers manager/admin per spec FR-001 |
| `phone` | `text` | NULL | For SMS invite/notifications |
| `avatar_url` | `text` | NULL | Supabase Storage object path, resolved via API |
| `location_id` | `uuid` | NOT NULL, FK → `locations(id)` | Single home location — resolves the manager-scoping follow-up; every account (employee or manager) belongs to exactly one location in v1 |
| `job_role` | `text` | NULL | Job/position title (e.g., "Cashier"), distinct from `role` (account class) |
| `pay_rate` | `numeric(10,2)` | NULL | Manager-assigned; visible to the employee themself and to managers, not to other employees |
| `is_active` | `boolean` | NOT NULL, default `true` | Deactivation flips this; historical FKs remain intact (FR-006, FR-036a) |
| `invite_status` | `text` | NOT NULL, default `'pending'`, `CHECK (invite_status IN ('pending','accepted'))` | Tracks FR-007's invite-based first access |
| `notification_prefs` | `jsonb` | NOT NULL, default `'{}'` | Per-notification-type opt in/out |
| `created_by` | `uuid` | NULL, FK → `profiles(id)` | The manager who created this account; NULL only for the seeded first manager |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

### `shift_areas`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `location_id` | `uuid` | NOT NULL, FK → `locations(id)` | |
| `name` | `text` | NOT NULL | e.g., "Floor", "Till", "Stockroom" |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| | | `UNIQUE (location_id, name)` | No duplicate area names within a location |

Manager-write-only (FR-032); created/renamed/removed only via the Node API's manager-only
endpoints, never by employees, and never directly from the client against Supabase.

### `shifts`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `location_id` | `uuid` | NOT NULL, FK → `locations(id)` | |
| `shift_area_id` | `uuid` | NULL, FK → `shift_areas(id)` | Nullable — a shift can exist before an area is assigned |
| `name` | `text` | NOT NULL | Free-text shift label (FR-026) |
| `start_time` | `timestamptz` | NOT NULL | |
| `end_time` | `timestamptz` | NOT NULL, `CHECK (end_time > start_time)` | |
| `position` | `text` | NULL | Role/position this shift is for (e.g., "Cashier") |
| `notes` | `text` | NULL | |
| `status` | `text` | NOT NULL, default `'draft'`, `CHECK (status IN ('draft','scheduled','open','completed','cancelled'))` | `draft`→no staff yet, `scheduled`→staffed, `open`→posted to open shift board, `completed`/`cancelled` terminal |
| `created_by` | `uuid` | NOT NULL, FK → `profiles(id)` | Must be a manager (enforced by API + RLS) |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

Intentionally has **no** employee/assignee column — staffing is entirely in
`shift_assignments`, enforcing the two-step create/staff split (FR-026, FR-027) at the schema
level, not just in application code.

### `shift_assignments`

One row per employee staffed on a shift.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `shift_id` | `uuid` | NOT NULL, FK → `shifts(id)` ON DELETE CASCADE | |
| `employee_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `is_leader` | `boolean` | NOT NULL, default `false` | |
| `assigned_at` | `timestamptz` | NOT NULL, default `now()` | |
| | | `UNIQUE (shift_id, employee_id)` | One row per employee per shift |
| | | Partial unique index: `UNIQUE (shift_id) WHERE is_leader` | **At most one leader per shift**, enforced at the database level, not just in application logic |

### `shift_swap_requests`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `shift_id` | `uuid` | NOT NULL, FK → `shifts(id)` | |
| `requesting_employee_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `target_employee_id` | `uuid` | NOT NULL, FK → `profiles(id)` | The coworker being asked to take the shift |
| `status` | `text` | NOT NULL, default `'pending'`, `CHECK (status IN ('pending','coworker_accepted','coworker_declined','manager_approved','denied'))` | `coworker_accepted` is the mid-state awaiting manager/leader approval (FR-042) |
| `decided_by` | `uuid` | NULL, FK → `profiles(id)` | Who made the final approve/deny decision (manager or the shift's leader) |
| `manager_comment` | `text` | NULL | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

### `time_off_requests`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `employee_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `start_date` | `date` | NOT NULL | |
| `end_date` | `date` | NOT NULL, `CHECK (end_date >= start_date)` | |
| `reason` | `text` | NOT NULL, `CHECK (length(trim(reason)) > 0)` | Required per spec clarification (FR-018) |
| `status` | `text` | NOT NULL, default `'pending'`, `CHECK (status IN ('pending','approved','denied'))` | |
| `manager_comment` | `text` | NULL | |
| `decided_by` | `uuid` | NULL, FK → `profiles(id)` | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

### `time_entries`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `shift_id` | `uuid` | NOT NULL, FK → `shifts(id)` | |
| `employee_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `clock_in_at` | `timestamptz` | NULL | |
| `clock_out_at` | `timestamptz` | NULL, `CHECK (clock_out_at IS NULL OR clock_out_at > clock_in_at)` | |
| `clock_in_lat` | `double precision` | NULL | |
| `clock_in_lng` | `double precision` | NULL | |
| `clock_out_lat` | `double precision` | NULL | |
| `clock_out_lng` | `double precision` | NULL | |
| `flagged_for_review` | `boolean` | NOT NULL, default `false` | Set when either clock event fell outside the location's geofence (FR-038) |
| `idempotency_key` | `text` | NOT NULL, UNIQUE | Client-generated key so a replayed offline-queued clock action is never double-applied |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

Regular/overtime split (FR-020) is **derived**, not stored: computed by the API's services
layer from `time_entries` rows grouped by employee + local calendar day (using the shift's
location timezone), applying the fixed 8-hour/day overtime threshold. This keeps the rule a
pure, unit-testable function (constitution: Testable Business Logic) rather than duplicated
stored state that could drift from the underlying entries.

### `open_shift_claims`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `shift_id` | `uuid` | NOT NULL, FK → `shifts(id)` ON DELETE CASCADE | |
| `employee_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `claimed_at` | `timestamptz` | NOT NULL, default `now()` | |
| | | `UNIQUE (shift_id, employee_id)` | One claim per employee per shift |

Backs the "Open Shift Posting" entity's claimant tracking (FR-029/FR-044–046); added in
migration `0016` — the original schema pass described this entity in prose but never created
its table. Deliberately separate from `shift_assignments`: a claim is provisional and does not
staff the shift until a manager confirms one claimant, and claim order carries no priority.

### `availability`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `employee_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `day_of_week` | `smallint` | NULL, `CHECK (day_of_week BETWEEN 0 AND 6)` | NULL when `recurring = false` (a one-off blocked date instead) |
| `start_time` | `time` | NULL | NULL for a full-day block-out |
| `end_time` | `time` | NULL | |
| `recurring` | `boolean` | NOT NULL | `true` = weekly recurring availability window; `false` = a specific blocked-out date |
| `blocked_date` | `date` | NULL | Set only when `recurring = false` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| | | `CHECK ((recurring AND day_of_week IS NOT NULL AND blocked_date IS NULL) OR (NOT recurring AND blocked_date IS NOT NULL))` | Enforces the two mutually exclusive shapes at the schema level |

### `announcements`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `sender_id` | `uuid` | NOT NULL, FK → `profiles(id)` | Must be a manager |
| `target_scope` | `text` | NOT NULL, `CHECK (target_scope IN ('team','location','shift'))` | |
| `target_location_id` | `uuid` | NULL, FK → `locations(id)` | Set when `target_scope IN ('team','location')` |
| `target_shift_id` | `uuid` | NULL, FK → `shifts(id)` | Set when `target_scope = 'shift'` |
| `message` | `text` | NOT NULL | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

### `device_push_tokens`

Supports FR-022 (push notifications); not explicitly named in the user's schema list but
required to implement it.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `profile_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | |
| `expo_push_token` | `text` | NOT NULL, UNIQUE | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

### `shift_reminders_sent`

Supports the scheduled reminder job's exactly-once behavior (see research.md #8); not
user-specified but required to avoid duplicate reminder pushes.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `shift_assignment_id` | `uuid` | PK, FK → `shift_assignments(id)` ON DELETE CASCADE | |
| `sent_at` | `timestamptz` | NOT NULL, default `now()` | |

## Row Level Security (defense-in-depth summary)

RLS is enabled on every table above. The Node API's service-role client bypasses RLS by design
(it performs the authorization decision itself, before ever issuing the query) — RLS exists so
that even a mis-issued query, a bug in the API's own checks, or any future direct-DB access
path still cannot cross an authorization boundary. Representative policies:

- **`profiles`**: an employee can `SELECT` their own row and rows of coworkers sharing their
  `location_id` (for the coworker directory, FR-021); an employee can `UPDATE` only their own
  row, and only non-privileged columns (name display prefs, notification prefs — enforced via
  a column-level policy/trigger, since `role`, `pay_rate`, and `location_id` must never be
  self-editable). A manager can `SELECT`/`UPDATE` any profile whose `location_id` matches
  their own.
- **`shift_areas`**: `SELECT` allowed for any profile at the same `location_id`; `INSERT`/
  `UPDATE`/`DELETE` allowed only for a manager at that `location_id` (FR-032/FR-033).
- **`shifts`**: `SELECT` scoped to the same `location_id`. `INSERT`/`UPDATE` of shift
  name/time/status allowed only for a manager at that location — a shift-leader's write
  access never extends to this table (FR-010).
- **`shift_assignments`**: a manager at the shift's location has full read/write. An employee
  can `SELECT` rows for shifts at their location. An employee can `INSERT`/`UPDATE`/`DELETE`
  rows **only** for a `shift_id` where a row exists with `employee_id = auth.uid() AND
  is_leader = true` — i.e., only on shifts they currently lead (FR-009), and never an `INSERT`
  that would itself set `is_leader = true` for someone else beyond what the staffing action
  permits (enforced in combination with the API's own validation).
- **`shift_swap_requests`**: the requesting employee, the target employee, and the shift's
  current leader (if any) can `SELECT`. `UPDATE` (approve/deny) is allowed for a manager at
  the shift's location, or for the profile matching a `shift_assignments` row with
  `is_leader = true` for that `shift_id` (FR-011/FR-012).
- **`time_off_requests`**: an employee can `SELECT`/`INSERT` their own rows only. `UPDATE`
  (approve/deny) is manager-only, scoped to the employee's `location_id`.
- **`time_entries`**: an employee can `SELECT`/`INSERT` their own rows for shifts they are
  assigned to; `UPDATE` limited to setting their own `clock_out_*` fields. Managers at the
  location have full read; review-flag handling is manager-read, no manager edit of the
  recorded clock values themselves (to preserve an unaltered audit trail).
- **`announcements`**: `SELECT` scoped by `target_scope` (team/location membership, or shift
  staffing membership for `target_scope = 'shift'`); `INSERT` manager-only.

## Validation Rules Sourced from the Spec

- Double-booking / insufficient-rest conflict detection (FR-028) is computed logic (not a
  schema constraint, since it depends on comparing across rows) — see plan.md's services
  layer.
- Time-off reason is required at the schema level (`CHECK (length(trim(reason)) > 0)`) as well
  as the API's request validation, so the rule holds even if a future caller bypasses the API
  layer's Zod/schema validation (defense-in-depth, mirroring the RLS rationale above).
- Overtime threshold (8 hours/day, fixed, not configurable — FR-020) is a constant in the
  services layer, not a database column, since it is explicitly not configurable in v1.
- Geofence radius (FR-037) lives on `locations.geofence_radius_m`, manager-editable via the
  locations endpoint, defaulting to 150.
