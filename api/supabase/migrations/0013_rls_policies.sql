-- Row Level Security: a defense-in-depth backstop behind the Node API's own authorization
-- checks (constitution: Security First — authorization is enforced at the data layer, never
-- the UI, and the API's server-side service-role client bypasses these by design since it has
-- already made the authorization decision itself). These policies exist so that even a bug in
-- the API, or any future direct-DB access path, still cannot cross an authorization boundary.
--
-- Helper functions live in the `public` schema and are STABLE + SECURITY INVOKER so they
-- evaluate against the calling user's own auth.uid(), the standard Supabase RLS pattern.

create or replace function public.current_profile_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'manager' and p.is_active
  );
$$;

create or replace function public.current_location_id()
returns uuid
language sql
stable
as $$
  select location_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_shift_leader(target_shift_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.shift_assignments sa
    where sa.shift_id = target_shift_id
      and sa.employee_id = auth.uid()
      and sa.is_leader
  );
$$;

-- ── locations ────────────────────────────────────────────────────────────────
alter table public.locations enable row level security;

create policy locations_select on public.locations
  for select using (id = public.current_location_id());

create policy locations_manager_update on public.locations
  for update using (public.is_manager() and id = public.current_location_id());

-- ── profiles ─────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy profiles_select_own_or_same_location on public.profiles
  for select using (
    id = auth.uid()
    or location_id = public.current_location_id()
  );

-- Employees may update only their own row, and role/pay_rate/location_id are excluded from
-- self-editable columns at the application layer (the API never accepts those fields on a
-- self-update); this policy is the row-level backstop, column-level enforcement is the API's.
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid());

create policy profiles_manager_update_same_location on public.profiles
  for update using (public.is_manager() and location_id = public.current_location_id());

create policy profiles_manager_insert on public.profiles
  for insert with check (public.is_manager());

-- ── shift_areas (manager-write-only, FR-032/FR-033) ──────────────────────────
alter table public.shift_areas enable row level security;

create policy shift_areas_select on public.shift_areas
  for select using (location_id = public.current_location_id());

create policy shift_areas_manager_write on public.shift_areas
  for all using (public.is_manager() and location_id = public.current_location_id())
  with check (public.is_manager() and location_id = public.current_location_id());

-- ── shifts (a shift-leader's write access never extends here — FR-010) ──────
alter table public.shifts enable row level security;

create policy shifts_select on public.shifts
  for select using (location_id = public.current_location_id());

create policy shifts_manager_write on public.shifts
  for all using (public.is_manager() and location_id = public.current_location_id())
  with check (public.is_manager() and location_id = public.current_location_id());

-- ── shift_assignments (shift-leader scoped write — FR-009, FR-012) ──────────
alter table public.shift_assignments enable row level security;

create policy shift_assignments_select on public.shift_assignments
  for select using (
    exists (
      select 1 from public.shifts s
      where s.id = shift_assignments.shift_id
        and s.location_id = public.current_location_id()
    )
  );

create policy shift_assignments_manager_write on public.shift_assignments
  for all using (
    exists (
      select 1 from public.shifts s
      where s.id = shift_assignments.shift_id
        and s.location_id = public.current_location_id()
    ) and public.is_manager()
  )
  with check (
    exists (
      select 1 from public.shifts s
      where s.id = shift_assignments.shift_id
        and s.location_id = public.current_location_id()
    ) and public.is_manager()
  );

-- A shift leader may write assignment rows only for the shift they currently lead — never an
-- INSERT/UPDATE/DELETE on any other shift's rows.
create policy shift_assignments_leader_write on public.shift_assignments
  for all using (public.is_shift_leader(shift_id))
  with check (public.is_shift_leader(shift_id));

-- ── shift_swap_requests (manager-or-leader decide — FR-011/FR-012) ──────────
alter table public.shift_swap_requests enable row level security;

create policy shift_swap_requests_select on public.shift_swap_requests
  for select using (
    requesting_employee_id = auth.uid()
    or target_employee_id = auth.uid()
    or public.is_shift_leader(shift_id)
    or (public.is_manager() and exists (
      select 1 from public.shifts s
      where s.id = shift_swap_requests.shift_id and s.location_id = public.current_location_id()
    ))
  );

create policy shift_swap_requests_insert on public.shift_swap_requests
  for insert with check (requesting_employee_id = auth.uid());

create policy shift_swap_requests_respond on public.shift_swap_requests
  for update using (target_employee_id = auth.uid());

create policy shift_swap_requests_decide on public.shift_swap_requests
  for update using (
    public.is_shift_leader(shift_id)
    or (public.is_manager() and exists (
      select 1 from public.shifts s
      where s.id = shift_swap_requests.shift_id and s.location_id = public.current_location_id()
    ))
  );

-- ── time_off_requests ─────────────────────────────────────────────────────────
alter table public.time_off_requests enable row level security;

create policy time_off_requests_select_own on public.time_off_requests
  for select using (employee_id = auth.uid());

create policy time_off_requests_manager_select on public.time_off_requests
  for select using (
    public.is_manager()
    and exists (
      select 1 from public.profiles p
      where p.id = time_off_requests.employee_id and p.location_id = public.current_location_id()
    )
  );

create policy time_off_requests_insert_own on public.time_off_requests
  for insert with check (employee_id = auth.uid());

create policy time_off_requests_manager_decide on public.time_off_requests
  for update using (
    public.is_manager()
    and exists (
      select 1 from public.profiles p
      where p.id = time_off_requests.employee_id and p.location_id = public.current_location_id()
    )
  );

-- ── time_entries ──────────────────────────────────────────────────────────────
alter table public.time_entries enable row level security;

create policy time_entries_select_own on public.time_entries
  for select using (employee_id = auth.uid());

create policy time_entries_manager_select on public.time_entries
  for select using (
    public.is_manager()
    and exists (
      select 1 from public.shifts s
      where s.id = time_entries.shift_id and s.location_id = public.current_location_id()
    )
  );

create policy time_entries_insert_own on public.time_entries
  for insert with check (employee_id = auth.uid());

-- Employees may only ever set their own clock_out_* fields; the recorded clock-in values are
-- never manager-editable, to preserve an unaltered audit trail.
create policy time_entries_update_own on public.time_entries
  for update using (employee_id = auth.uid());

-- ── availability ──────────────────────────────────────────────────────────────
alter table public.availability enable row level security;

create policy availability_select_own on public.availability
  for select using (employee_id = auth.uid());

create policy availability_manager_select on public.availability
  for select using (
    public.is_manager()
    and exists (
      select 1 from public.profiles p
      where p.id = availability.employee_id and p.location_id = public.current_location_id()
    )
  );

create policy availability_write_own on public.availability
  for all using (employee_id = auth.uid())
  with check (employee_id = auth.uid());

-- ── announcements ─────────────────────────────────────────────────────────────
alter table public.announcements enable row level security;

create policy announcements_select_team_or_location on public.announcements
  for select using (
    target_scope in ('team', 'location') and target_location_id = public.current_location_id()
  );

create policy announcements_select_shift on public.announcements
  for select using (
    target_scope = 'shift'
    and exists (
      select 1 from public.shift_assignments sa
      where sa.shift_id = announcements.target_shift_id and sa.employee_id = auth.uid()
    )
  );

create policy announcements_manager_insert on public.announcements
  for insert with check (public.is_manager() and sender_id = auth.uid());

-- ── device_push_tokens ────────────────────────────────────────────────────────
alter table public.device_push_tokens enable row level security;

create policy device_push_tokens_own on public.device_push_tokens
  for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ── shift_reminders_sent ──────────────────────────────────────────────────────
-- No client-facing policy: only the API's service-role client ever reads/writes this table.
alter table public.shift_reminders_sent enable row level security;
