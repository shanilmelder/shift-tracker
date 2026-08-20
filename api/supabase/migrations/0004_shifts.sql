-- shifts: a block of scheduled work. Intentionally has NO employee/assignee column — staffing
-- is entirely in shift_assignments, so a shift can exist unstaffed (FR-026) at the schema
-- level, not just by application convention.
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id),
  shift_area_id uuid references public.shift_areas (id),
  name text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  position text,
  notes text,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'open', 'completed', 'cancelled')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint shifts_end_after_start check (end_time > start_time)
);

create index if not exists shifts_location_id_idx on public.shifts (location_id);
create index if not exists shifts_shift_area_id_idx on public.shifts (shift_area_id);
create index if not exists shifts_time_range_idx on public.shifts (location_id, start_time, end_time);
