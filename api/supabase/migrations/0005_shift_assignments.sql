-- shift_assignments: one row per employee staffed on a shift. is_leader is a per-shift,
-- per-assignment designation (FR-008) — it never changes the underlying profile's `role`.
create table if not exists public.shift_assignments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id) on delete cascade,
  employee_id uuid not null references public.profiles (id),
  is_leader boolean not null default false,
  assigned_at timestamptz not null default now(),
  unique (shift_id, employee_id)
);

-- At most one leader per shift, enforced at the database level (FR-008), not just in
-- application code — a partial unique index is the standard way to express this in Postgres.
create unique index if not exists shift_assignments_one_leader_per_shift
  on public.shift_assignments (shift_id)
  where is_leader;

create index if not exists shift_assignments_employee_id_idx on public.shift_assignments (employee_id);
create index if not exists shift_assignments_shift_id_idx on public.shift_assignments (shift_id);
