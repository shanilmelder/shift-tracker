-- time_entry_breaks: paid break tracking, multiple per shift. A separate child table (not
-- two columns on time_entries) because more than one break per shift is allowed — the mockup
-- only shows a single toggle, but the underlying data has to support pressing it more than
-- once. Paid: this table is display/tracking only and deliberately never feeds into
-- computeRegularAndOvertimeHours (time-entries.service.ts) — break time still counts as
-- worked hours.
create table if not exists public.time_entry_breaks (
  id uuid primary key default gen_random_uuid(),
  time_entry_id uuid not null references public.time_entries (id) on delete cascade,
  break_start_at timestamptz not null default now(),
  break_end_at timestamptz,
  constraint time_entry_breaks_end_after_start check (break_end_at is null or break_end_at > break_start_at)
);

create index if not exists time_entry_breaks_time_entry_id_idx on public.time_entry_breaks (time_entry_id);

-- At most one open break per time entry, enforced at the database level — same partial-unique-
-- index pattern as shift_assignments_one_leader_per_shift (migration 0005).
create unique index if not exists time_entry_breaks_one_open_per_entry
  on public.time_entry_breaks (time_entry_id)
  where break_end_at is null;

alter table public.time_entry_breaks enable row level security;

create policy time_entry_breaks_select_own on public.time_entry_breaks
  for select using (
    exists (
      select 1 from public.time_entries te
      where te.id = time_entry_breaks.time_entry_id and te.employee_id = auth.uid()
    )
  );

create policy time_entry_breaks_manager_select on public.time_entry_breaks
  for select using (
    public.is_manager()
    and exists (
      select 1 from public.time_entries te
      join public.shifts s on s.id = te.shift_id
      where te.id = time_entry_breaks.time_entry_id and s.location_id = public.current_location_id()
    )
  );

create policy time_entry_breaks_insert_own on public.time_entry_breaks
  for insert with check (
    exists (
      select 1 from public.time_entries te
      where te.id = time_entry_breaks.time_entry_id and te.employee_id = auth.uid()
    )
  );

create policy time_entry_breaks_update_own on public.time_entry_breaks
  for update using (
    exists (
      select 1 from public.time_entries te
      where te.id = time_entry_breaks.time_entry_id and te.employee_id = auth.uid()
    )
  );
